/** Primary control to open the create-task form. */
export const BOARD_ADD_TASK_LABEL = 'Add task'

/** Accessible name for the three-column board region. */
export const BOARD_REGION_LABEL = 'Task board'

/** Empty-column placeholder. */
export const BOARD_COLUMN_EMPTY = 'No tasks'

/** Fallback when create/edit fails for a non-validation reason. */
export const BOARD_SAVE_ERROR = 'Could not save the task. Please try again.'

/** Page heading (PROJECT.md / CONTEXT.md: To-Do SPA). */
export const PAGE_HEADING = 'To-Do'

/** Supporting line under the page heading. */
export const PAGE_INTRO = 'Tasks grouped by ToDo, InProgress, and Complete.'

/** Document title / SEO title. */
export const DOCUMENT_TITLE = 'To-Do'

/** SEO description (British English; domain column names). */
export const DOCUMENT_DESCRIPTION = 'Personal to-do board — ToDo, InProgress, and Complete.'

/** Singular/plural active-count phrase for column metrics aria-labels. */
export function boardColumnCountLabel(count: number): string {
  return count === 1 ? '1 task' : `${String(count)} tasks`
}

/** Visible label when a column is following manual ranks instead of sort. */
export const COLUMN_MANUAL_ORDER_BADGE = 'Manual order'

/** Control that clears a column's manual-order override (British English). */
export const COLUMN_CLEAR_MANUAL_ORDER_LABEL = 'Clear manual order'

/** Accessible name for the clear-manual-order control. */
export function columnClearManualOrderAriaLabel(columnHeading: string): string {
  return `Clear manual order for ${columnHeading}`
}
