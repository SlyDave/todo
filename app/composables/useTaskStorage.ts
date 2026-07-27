import type { ActivityEvent, Task, TaskState } from '../types/task'
import {
  type CreateTaskInput,
  type TaskDetailsPatch,
  TaskValidationError,
  changeTaskState,
  createActivityEvent,
  createTask,
  isRecoverable,
  purgeExpiredSoftDeletes,
  restoreTask,
  softDeleteTask,
  updateTaskDetails
} from '../utils/task-domain'
import {
  applyManualOrderRanks,
  clearManualOrderRanks,
  mergeTasksById,
  withManualOrderOnColumnEnter
} from '../utils/task-manual-order'
import { ACTIVITY_STORAGE_KEY, appendActivity, loadActivity } from '../utils/activity-storage'
import { TASKS_STORAGE_KEY, loadTasks, saveTasks } from '../utils/task-storage'

export interface TaskMutationOptions {
  now?: string
  storage?: Storage
}

export interface CreateTaskOptions extends TaskMutationOptions {
  id?: string
}

function replaceTask(tasks: Task[], index: number, updated: Task): Task[] {
  const next = [...tasks]
  next[index] = updated
  return next
}

function activeTasksInColumn(tasks: readonly Task[], state: TaskState): Task[] {
  return tasks.filter((task) => task.deletedAt === null && task.state === state)
}

function record(
  kind: Parameters<typeof createActivityEvent>[0],
  taskId: string,
  options: TaskMutationOptions,
  toState?: TaskState
): void {
  appendActivity(createActivityEvent(kind, taskId, options.now, toState), options.storage)
}

/**
 * Thin client API for task board persistence in local storage.
 * Exposes create, details edit, column change, soft-delete, restore, purge,
 * and per-column manual-order apply/clear so timestamps, calendar activity,
 * and ranks stay consistent.
 */
export function useTaskStorage() {
  return {
    key: TASKS_STORAGE_KEY,
    activityKey: ACTIVITY_STORAGE_KEY,
    load: (storage?: Storage): Task[] => loadTasks(storage),
    save: (tasks: Task[], storage?: Storage): void => {
      saveTasks(tasks, storage)
    },
    listActivity: (storage?: Storage): ActivityEvent[] => loadActivity(storage),
    create: (input: CreateTaskInput, options: CreateTaskOptions = {}): Task => {
      const tasks = loadTasks(options.storage)
      const task = createTask(input, { now: options.now, id: options.id })
      saveTasks([...tasks, task], options.storage)
      record('create', task.id, options)
      return task
    },
    changeState: (id: string, state: TaskState, options: TaskMutationOptions = {}): Task | null => {
      const tasks = loadTasks(options.storage)
      const index = tasks.findIndex((task) => task.id === id)
      if (index < 0) {
        return null
      }
      const current = tasks[index]
      if (current === undefined) {
        return null
      }
      const moved = changeTaskState(current, state, options.now)
      if (moved === current) {
        return current
      }
      const destinationOthers = activeTasksInColumn(tasks, state).filter((task) => task.id !== id)
      const updated = withManualOrderOnColumnEnter(moved, destinationOthers)
      saveTasks(replaceTask(tasks, index, updated), options.storage)
      record('changeState', updated.id, options, state)
      return updated
    },
    /**
     * Establish or update a column's manual-order override.
     * `orderedIds` must list every active task in that column exactly once.
     * Persists contiguous ranks `0..n-1`; other columns are untouched.
     */
    applyManualOrder: (
      state: TaskState,
      orderedIds: readonly string[],
      options: TaskMutationOptions = {}
    ): Task[] => {
      const tasks = loadTasks(options.storage)
      const column = activeTasksInColumn(tasks, state)
      if (orderedIds.length !== column.length) {
        throw new TaskValidationError(
          'Manual order must include every active task in the column exactly once.'
        )
      }
      const byId = new Map(column.map((task) => [task.id, task]))
      const ordered: Task[] = []
      for (const id of orderedIds) {
        const task = byId.get(id)
        if (task === undefined) {
          throw new TaskValidationError(
            'Manual order must include every active task in the column exactly once.'
          )
        }
        ordered.push(task)
        byId.delete(id)
      }
      if (byId.size > 0) {
        throw new TaskValidationError(
          'Manual order must include every active task in the column exactly once.'
        )
      }
      const ranked = applyManualOrderRanks(ordered)
      const next = mergeTasksById(tasks, ranked)
      saveTasks(next, options.storage)
      return next
    },
    /**
     * Clear a column's manual-order override (all ranks null) and persist.
     * Other columns are untouched. Subsequent display follows SortMode.
     */
    clearManualOrder: (state: TaskState, options: TaskMutationOptions = {}): Task[] => {
      const tasks = loadTasks(options.storage)
      const cleared = clearManualOrderRanks(activeTasksInColumn(tasks, state))
      const next = mergeTasksById(tasks, cleared)
      saveTasks(next, options.storage)
      return next
    },
    updateDetails: (
      id: string,
      patch: TaskDetailsPatch,
      options: TaskMutationOptions = {}
    ): Task | null => {
      const tasks = loadTasks(options.storage)
      const index = tasks.findIndex((task) => task.id === id)
      if (index < 0) {
        return null
      }
      const current = tasks[index]
      if (current === undefined) {
        return null
      }
      const updated = updateTaskDetails(current, patch, options.now)
      saveTasks(replaceTask(tasks, index, updated), options.storage)
      record('editDetails', updated.id, options)
      return updated
    },
    softDelete: (id: string, options: TaskMutationOptions = {}): Task | null => {
      const tasks = loadTasks(options.storage)
      const index = tasks.findIndex((task) => task.id === id)
      if (index < 0) {
        return null
      }
      const current = tasks[index]
      if (current === undefined) {
        return null
      }
      const updated = softDeleteTask(current, options.now)
      saveTasks(replaceTask(tasks, index, updated), options.storage)
      record('softDelete', updated.id, options)
      return updated
    },
    /**
     * Restores a recoverable soft-deleted task.
     * Expired soft-deletes are removed and are no longer recoverable.
     */
    restore: (id: string, options: TaskMutationOptions = {}): Task | null => {
      const tasks = loadTasks(options.storage)
      const index = tasks.findIndex((task) => task.id === id)
      if (index < 0) {
        return null
      }
      const current = tasks[index]
      if (current === undefined) {
        return null
      }

      if (current.deletedAt !== null && !isRecoverable(current, options.now)) {
        saveTasks(
          tasks.filter((task) => task.id !== id),
          options.storage
        )
        return null
      }

      const updated = restoreTask(current, options.now)
      saveTasks(replaceTask(tasks, index, updated), options.storage)
      record('restore', updated.id, options)
      return updated
    },
    purgeExpired: (options: TaskMutationOptions = {}): Task[] => {
      const tasks = loadTasks(options.storage)
      const kept = purgeExpiredSoftDeletes(tasks, options.now)
      if (kept.length !== tasks.length) {
        saveTasks(kept, options.storage)
      }
      return kept
    }
  }
}
