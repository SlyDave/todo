import { SOFT_DELETE_RETENTION_DAYS } from '../utils/task-domain'

/** British English dialog title for soft-delete confirmation. */
export const SOFT_DELETE_CONFIRM_TITLE = 'Soft-delete this task?'

/** Confirm control label. */
export const SOFT_DELETE_CONFIRM_LABEL = 'Soft-delete'

/** Cancel control label. */
export const SOFT_DELETE_CANCEL_LABEL = 'Cancel'

/**
 * Body copy for the soft-delete confirmation dialog.
 * Mentions the domain recovery window so the user knows the task is recoverable.
 */
export function softDeleteConfirmMessage(taskTitle: string): string {
  const trimmed = taskTitle.trim()
  const subject = trimmed.length > 0 ? `"${trimmed}"` : 'This task'
  return `${subject} will leave the active board and remain recoverable for ${SOFT_DELETE_RETENTION_DAYS} days.`
}

/**
 * Only a confirmed dialog should call soft-delete.
 * Cancel (or any other outcome) must leave the task unchanged.
 */
export function shouldProceedWithSoftDelete(confirmed: boolean): boolean {
  return confirmed
}

/**
 * Resolves whether the board should call soft-delete after the dialog closes.
 * Returns the task id to soft-delete, or null when cancel / missing task.
 */
export function resolveSoftDeleteAfterConfirm(
  confirmed: boolean,
  taskId: string | null
): string | null {
  if (!shouldProceedWithSoftDelete(confirmed) || taskId === null || taskId.trim() === '') {
    return null
  }
  return taskId
}
