import type { ActivityEvent, Task, TaskState } from '../types/task'
import {
  type CreateTaskInput,
  type TaskDetailsPatch,
  changeTaskState,
  createActivityEvent,
  createTask,
  isRecoverable,
  purgeExpiredSoftDeletes,
  restoreTask,
  softDeleteTask,
  updateTaskDetails
} from '../utils/task-domain'
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

function record(
  kind: Parameters<typeof createActivityEvent>[0],
  taskId: string,
  options: TaskMutationOptions
): void {
  appendActivity(createActivityEvent(kind, taskId, options.now), options.storage)
}

/**
 * Thin client API for task board persistence in local storage.
 * Exposes create, details edit, column change, soft-delete, restore, and purge
 * so timestamps and calendar activity stay consistent.
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
      const updated = changeTaskState(current, state, options.now)
      if (updated === current) {
        return current
      }
      saveTasks(replaceTask(tasks, index, updated), options.storage)
      record('changeState', updated.id, options)
      return updated
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
