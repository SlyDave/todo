import type { Task, TaskState } from '../types/task'

/** Subset of the vuedraggable `@change` payload we act on. */
export type BoardDragChangeEvent = {
  added?: { element: Task; newIndex: number }
  removed?: { element: Task; oldIndex: number }
  moved?: { element: Task; newIndex: number; oldIndex: number }
}

/**
 * Maps a column `@change` event to a persistence action.
 * Only cross-column adds become state changes; within-column moves and
 * cancelled / invalid drops produce no action (Sortable leaves lists alone).
 */
export function resolveColumnDrop(
  targetState: TaskState,
  event: BoardDragChangeEvent
): { taskId: string; state: TaskState } | null {
  const added = event.added
  if (added === undefined) {
    return null
  }

  const task = added.element
  if (task.state === targetState) {
    return null
  }

  return { taskId: task.id, state: targetState }
}

/** Shared Sortable group so cards can move between the three columns. */
export const BOARD_DRAG_GROUP = 'board-tasks'
