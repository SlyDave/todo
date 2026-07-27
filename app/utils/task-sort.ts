import type { SortMode, Task, TaskPriority } from '../types/task'

/** Priority rank for sort: high first, then medium, then low. */
const PRIORITY_RANK: Record<TaskPriority, number> = {
  high: 0,
  medium: 1,
  low: 2
}

/**
 * Case-insensitive British English title compare.
 * Empty titles sort before non-empty ones (natural string order).
 */
function compareTitle(a: string, b: string): number {
  return a.localeCompare(b, 'en-GB', { sensitivity: 'base' })
}

/**
 * Ascending due date; tasks with no due date sort after dated tasks.
 * ISO `YYYY-MM-DD` (or fuller ISO) strings compare lexicographically in calendar order.
 */
function compareDueDate(a: string | null, b: string | null): number {
  if (a === null && b === null) {
    return 0
  }
  if (a === null) {
    return 1
  }
  if (b === null) {
    return -1
  }
  return a < b ? -1 : a > b ? 1 : 0
}

function comparePriority(a: TaskPriority, b: TaskPriority): number {
  return PRIORITY_RANK[a] - PRIORITY_RANK[b]
}

function compareId(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0
}

/**
 * Compares two tasks under the given sort mode.
 * Returns negative if `a` should come before `b`, positive if after, zero if equal
 * on all mode keys (then `id` breaks the tie).
 */
export function compareTasks(a: Task, b: Task, mode: SortMode): number {
  let result: number

  switch (mode) {
    case 'default':
    case 'dueDate':
      result = compareDueDate(a.dueDate, b.dueDate)
      if (result !== 0) {
        return result
      }
      result = comparePriority(a.priority, b.priority)
      if (result !== 0) {
        return result
      }
      result = compareTitle(a.title, b.title)
      break
    case 'alphabetically':
      result = compareTitle(a.title, b.title)
      if (result !== 0) {
        return result
      }
      result = compareDueDate(a.dueDate, b.dueDate)
      if (result !== 0) {
        return result
      }
      result = comparePriority(a.priority, b.priority)
      break
    case 'priority':
      result = comparePriority(a.priority, b.priority)
      if (result !== 0) {
        return result
      }
      result = compareDueDate(a.dueDate, b.dueDate)
      if (result !== 0) {
        return result
      }
      result = compareTitle(a.title, b.title)
      break
  }

  if (result !== 0) {
    return result
  }
  return compareId(a.id, b.id)
}

/**
 * Returns a new array of tasks sorted by `mode`.
 * Does not mutate the input. Manual order is ignored (see story #17).
 */
export function sortTasks(tasks: readonly Task[], mode: SortMode): Task[] {
  return [...tasks].sort((a, b) => compareTasks(a, b, mode))
}
