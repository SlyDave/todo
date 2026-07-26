import type { Task, TaskState } from '../types/task'
import {
  type CreateTaskInput,
  type TaskDetailsPatch,
  changeTaskState,
  createTask,
  updateTaskDetails
} from '../utils/task-domain'
import { TASKS_STORAGE_KEY, loadTasks, saveTasks } from '../utils/task-storage'

export interface TaskMutationOptions {
  now?: string
  storage?: Storage
}

export interface CreateTaskOptions extends TaskMutationOptions {
  id?: string
}

/**
 * Thin client API for task board persistence in local storage.
 * Exposes create, details edit, and column change so timestamps stay distinct.
 */
export function useTaskStorage() {
  return {
    key: TASKS_STORAGE_KEY,
    load: (storage?: Storage): Task[] => loadTasks(storage),
    save: (tasks: Task[], storage?: Storage): void => {
      saveTasks(tasks, storage)
    },
    create: (input: CreateTaskInput, options: CreateTaskOptions = {}): Task => {
      const tasks = loadTasks(options.storage)
      const task = createTask(input, { now: options.now, id: options.id })
      saveTasks([...tasks, task], options.storage)
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
      const next = [...tasks]
      next[index] = updated
      saveTasks(next, options.storage)
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
      const next = [...tasks]
      next[index] = updated
      saveTasks(next, options.storage)
      return updated
    }
  }
}
