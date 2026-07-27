import type { Task, TaskPriority } from '../types/task'

/** All board priorities; the default filter selection shows every task. */
export const ALL_TASK_PRIORITIES: readonly TaskPriority[] = ['low', 'medium', 'high']

/**
 * Returns tasks whose priority is in the selected set, preserving input order.
 *
 * - Empty selection → empty list.
 * - All priorities selected → every task returned (same order).
 * - Does not interpret soft-delete or column state; callers pass the list to
 *   filter (e.g. active tasks for cards). Metrics counts are the caller's job.
 */
export function filterTasksByPriority(
  tasks: readonly Task[],
  selectedPriorities: ReadonlySet<TaskPriority> | readonly TaskPriority[]
): Task[] {
  const selected =
    selectedPriorities instanceof Set
      ? selectedPriorities
      : new Set<TaskPriority>(selectedPriorities)

  if (selected.size === 0) {
    return []
  }

  return tasks.filter((task) => selected.has(task.priority))
}
