import type { Task, TaskState } from '../types/task'

/** Subset of the vuedraggable `@change` payload we act on. */
export type BoardDragChangeEvent = {
  added?: { element: Task; newIndex: number }
  removed?: { element: Task; oldIndex: number }
  moved?: { element: Task; newIndex: number; oldIndex: number }
}

/** Payload from BoardColumn when a drag `@change` fires. */
export type BoardColumnChangePayload = {
  event: BoardDragChangeEvent
  /** Visible (priority-filtered) id order after the drag mutation. */
  visibleOrder: string[]
}

/**
 * Maps a column `@change` event to a persistence action.
 * Only cross-column adds become state changes; within-column moves are
 * handled separately via {@link resolveWithinColumnReorder}.
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

/**
 * Rebuilds the full column id order after a within-column drag on a
 * possibly priority-filtered visible list.
 *
 * Hidden (filtered-out) ids keep their absolute indices; visible slots are
 * rewritten in `newVisibleOrder`. Used so `applyManualOrder` always receives
 * every active task id exactly once.
 */
export function mergeVisibleReorderIntoColumnOrder(
  fullColumnOrder: readonly string[],
  newVisibleOrder: readonly string[]
): string[] {
  const visibleSet = new Set(newVisibleOrder)
  const result = [...fullColumnOrder]
  let visibleIndex = 0
  for (let i = 0; i < result.length; i++) {
    const currentId = result[i]
    if (currentId !== undefined && visibleSet.has(currentId)) {
      const nextVisible = newVisibleOrder[visibleIndex]
      if (nextVisible === undefined) {
        break
      }
      result[i] = nextVisible
      visibleIndex += 1
    }
  }
  return result
}

/**
 * When the drag event is a within-column move, returns the full ordered id
 * list to persist as a manual-order override. Returns null for cross-column
 * or empty change payloads.
 *
 * `fullColumnOrder` is the column display order before the move.
 * `newVisibleOrder` is the visible (possibly filtered) list after the move.
 */
export function resolveWithinColumnReorder(
  event: BoardDragChangeEvent,
  fullColumnOrder: readonly string[],
  newVisibleOrder: readonly string[]
): string[] | null {
  if (event.moved === undefined) {
    return null
  }
  return mergeVisibleReorderIntoColumnOrder(fullColumnOrder, newVisibleOrder)
}

/** Shared Sortable group so cards can move between the three columns. */
export const BOARD_DRAG_GROUP = 'board-tasks'
