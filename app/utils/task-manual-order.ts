import type { SortMode, Task } from '../types/task'
import { sortTasks } from './task-sort'

/**
 * True when the column has an active manual-order override:
 * at least one task in the slice has a non-null `manualOrder`.
 * Callers pass the column's active (non-deleted) tasks.
 */
export function columnHasManualOrderOverride(tasks: readonly Task[]): boolean {
  return tasks.some((task) => task.manualOrder !== null)
}

function compareId(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0
}

/**
 * Manual-order comparator for an active override.
 * Primary: `manualOrder` ascending. Null ranks sort after any numeric rank
 * (defensive; apply/reorder assign ranks to every task in the column).
 * Final tie-break: `id` ascending for a total order.
 */
export function compareManualOrder(a: Task, b: Task): number {
  const aRank = a.manualOrder
  const bRank = b.manualOrder

  if (aRank === null && bRank === null) {
    return compareId(a.id, b.id)
  }
  if (aRank === null) {
    return 1
  }
  if (bRank === null) {
    return -1
  }
  if (aRank !== bRank) {
    return aRank < bRank ? -1 : 1
  }
  return compareId(a.id, b.id)
}

/**
 * Display order for one column: manual ranks when override is active,
 * otherwise the given `SortMode` via `sortTasks` (which ignores manualOrder).
 * Returns a new array; does not mutate the input.
 */
export function orderTasksForColumn(tasks: readonly Task[], mode: SortMode): Task[] {
  if (columnHasManualOrderOverride(tasks)) {
    return [...tasks].sort(compareManualOrder)
  }
  return sortTasks(tasks, mode)
}

/**
 * Establish or update an override: assign contiguous ranks `0..n-1`
 * to every task in the given display order. Returns new task objects;
 * does not mutate the input.
 */
export function applyManualOrderRanks(orderedTasks: readonly Task[]): Task[] {
  return orderedTasks.map((task, index) =>
    task.manualOrder === index ? task : { ...task, manualOrder: index }
  )
}

/**
 * Clear an override: set `manualOrder: null` on every task in the slice.
 * Returns new task objects; does not mutate the input.
 */
export function clearManualOrderRanks(tasks: readonly Task[]): Task[] {
  return tasks.map((task) => (task.manualOrder === null ? task : { ...task, manualOrder: null }))
}

/**
 * Rank for a task entering a column.
 * - Active override → append after the current maximum rank (other tasks untouched).
 * - No override → `manualOrder: null` so a carried rank cannot falsely activate override.
 * Does not mutate inputs; returns a (possibly new) newcomer task.
 */
export function withManualOrderOnColumnEnter(
  newcomer: Task,
  destinationTasksExcludingNewcomer: readonly Task[]
): Task {
  if (!columnHasManualOrderOverride(destinationTasksExcludingNewcomer)) {
    return newcomer.manualOrder === null ? newcomer : { ...newcomer, manualOrder: null }
  }

  let maxRank = -1
  for (const task of destinationTasksExcludingNewcomer) {
    if (task.manualOrder !== null && task.manualOrder > maxRank) {
      maxRank = task.manualOrder
    }
  }
  const nextRank = maxRank + 1
  return newcomer.manualOrder === nextRank ? newcomer : { ...newcomer, manualOrder: nextRank }
}

/**
 * Replace tasks in `allTasks` whose ids appear in `updates`, preserving order
 * of `allTasks`. Tasks not listed in `updates` are left unchanged.
 */
export function mergeTasksById(allTasks: readonly Task[], updates: readonly Task[]): Task[] {
  if (updates.length === 0) {
    return [...allTasks]
  }
  const byId = new Map(updates.map((task) => [task.id, task]))
  return allTasks.map((task) => byId.get(task.id) ?? task)
}
