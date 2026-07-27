import type { Task, TaskState } from '../types/task'
import { isRecoverable } from '../utils/task-domain'
import { COLUMN_HEADINGS } from './boardColumns'

/** British English dialog title for the recovery list. */
export const TASK_RECOVERY_TITLE = 'Recoverable tasks'

/** Toolbar control that opens recovery. */
export const TASK_RECOVERY_OPEN_LABEL = 'Recover tasks'

/** Per-row restore control label. */
export const TASK_RECOVERY_RESTORE_LABEL = 'Restore'

/** Close control label. */
export const TASK_RECOVERY_CLOSE_LABEL = 'Close'

/** Empty-state copy when nothing is recoverable. */
export const TASK_RECOVERY_EMPTY_MESSAGE =
  'No recoverable tasks. Soft-deleted tasks remain here for 30 days.'

/**
 * Soft-deleted tasks still inside the domain recovery window, newest deletion first.
 */
export function listRecoverableTasks(tasks: readonly Task[], now?: string): Task[] {
  return tasks
    .filter((task) => isRecoverable(task, now))
    .slice()
    .sort((a, b) => {
      const aMs = Date.parse(a.deletedAt ?? '')
      const bMs = Date.parse(b.deletedAt ?? '')
      if (Number.isNaN(aMs) && Number.isNaN(bMs)) {
        return 0
      }
      if (Number.isNaN(aMs)) {
        return 1
      }
      if (Number.isNaN(bMs)) {
        return -1
      }
      return bMs - aMs
    })
}

/** Stakeholder column heading for the task's prior (preserved) state. */
export function recoverablePriorColumnLabel(state: TaskState): string {
  return COLUMN_HEADINGS[state]
}

/**
 * Display title for a recoverable row. Falls back when title is blank.
 */
export function recoverableTaskHeading(task: Task): string {
  const trimmed = task.title.trim()
  return trimmed.length > 0 ? trimmed : 'Untitled task'
}

/**
 * Human-readable soft-delete instant in British English locale.
 * Returns null when deletedAt is missing or unparseable.
 */
export function formatRecoverableDeletedAt(deletedAt: string | null): string | null {
  if (deletedAt === null || deletedAt.trim() === '') {
    return null
  }
  const ms = Date.parse(deletedAt)
  if (Number.isNaN(ms)) {
    return null
  }
  return new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(new Date(ms))
}

/**
 * Resolves whether the board should call restore for a listed recoverable id.
 * Returns the id, or null when missing / blank.
 */
export function resolveRestoreTaskId(taskId: string | null | undefined): string | null {
  if (taskId === null || taskId === undefined || taskId.trim() === '') {
    return null
  }
  return taskId
}
