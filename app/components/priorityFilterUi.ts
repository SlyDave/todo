import type { TaskPriority } from '../types/task'
import { ALL_TASK_PRIORITIES } from '../utils/priority-filter'
import { PRIORITY_OPTIONS } from './taskPriority'

/** British English legend for the board priority filter. */
export const PRIORITY_FILTER_LEGEND = 'Priority filter'

/** Default selection: every priority visible. */
export function defaultPriorityFilterSelection(): TaskPriority[] {
  return [...ALL_TASK_PRIORITIES]
}

/** Stable options for the multi-select control (low / medium / high). */
export const PRIORITY_FILTER_OPTIONS = PRIORITY_OPTIONS

/**
 * Returns whether `priority` is currently selected.
 */
export function isPrioritySelected(
  selected: readonly TaskPriority[],
  priority: TaskPriority
): boolean {
  return selected.includes(priority)
}

/**
 * Toggles a priority in the selection without mutating the input.
 * Order follows ALL_TASK_PRIORITIES so the control stays stable.
 */
export function togglePrioritySelection(
  selected: readonly TaskPriority[],
  priority: TaskPriority
): TaskPriority[] {
  const next = new Set(selected)
  if (next.has(priority)) {
    next.delete(priority)
  } else {
    next.add(priority)
  }
  return ALL_TASK_PRIORITIES.filter((value) => next.has(value))
}
