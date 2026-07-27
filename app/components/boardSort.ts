import type { SortMode } from '../types/task'
import { sortTasks } from '../utils/task-sort'
import type { TasksByColumn } from './boardColumns'

/** Accessible label for the board sort control. */
export const SORT_CONTROL_LABEL = 'Sort'

/** British English labels for each sort mode (story #15). */
export const SORT_MODE_LABEL: Record<SortMode, string> = {
  default: 'Default',
  alphabetically: 'Alphabetically',
  dueDate: 'Due Date',
  priority: 'Priority'
}

/** Default board sort when the user has not chosen another mode. */
export const DEFAULT_SORT_MODE: SortMode = 'default'

/** Options for the sort dropdown (`USelect` items). */
export const SORT_OPTIONS: { value: SortMode; label: string }[] = [
  { value: 'default', label: SORT_MODE_LABEL.default },
  { value: 'alphabetically', label: SORT_MODE_LABEL.alphabetically },
  { value: 'dueDate', label: SORT_MODE_LABEL.dueDate },
  { value: 'priority', label: SORT_MODE_LABEL.priority }
]

/**
 * Sorts each column with the shared domain helpers from #46.
 * Manual-order override is out of scope here (story #17).
 */
export function sortColumnsByMode(columns: TasksByColumn, mode: SortMode): TasksByColumn {
  return {
    todo: sortTasks(columns.todo, mode),
    inProgress: sortTasks(columns.inProgress, mode),
    complete: sortTasks(columns.complete, mode)
  }
}
