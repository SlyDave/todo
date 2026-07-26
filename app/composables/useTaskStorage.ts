import type { Task } from '../types/task'
import { TASKS_STORAGE_KEY, loadTasks, saveTasks } from '../utils/task-storage'

/**
 * Thin client API for task board persistence in local storage.
 * Frontend board state should call load on start and save after mutations.
 */
export function useTaskStorage() {
  return {
    key: TASKS_STORAGE_KEY,
    load: (): Task[] => loadTasks(),
    save: (tasks: Task[]): void => {
      saveTasks(tasks)
    }
  }
}
