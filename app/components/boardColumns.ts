import type { Task, TaskState } from '../types/task'

/** Board columns in left-to-right display order. */
export const COLUMN_ORDER = [
  'todo',
  'inProgress',
  'complete'
] as const satisfies readonly TaskState[]

/** Stakeholder column headings (CONTEXT.md). */
export const COLUMN_HEADINGS: Record<TaskState, string> = {
  todo: 'ToDo',
  inProgress: 'InProgress',
  complete: 'Complete'
}

export type TasksByColumn = Record<TaskState, Task[]>

/** Soft-deleted tasks are not active on the board. */
export function isActiveTask(task: Task): boolean {
  return task.deletedAt === null
}

/**
 * Partitions active tasks into the three columns.
 * Always returns all three keys, even when a column has no tasks.
 */
export function groupActiveTasksByColumn(tasks: readonly Task[]): TasksByColumn {
  const groups: TasksByColumn = {
    todo: [],
    inProgress: [],
    complete: []
  }

  for (const task of tasks) {
    if (!isActiveTask(task)) {
      continue
    }
    groups[task.state].push(task)
  }

  return groups
}
