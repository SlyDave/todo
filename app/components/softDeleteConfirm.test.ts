import { describe, expect, it } from 'vitest'
import { SOFT_DELETE_RETENTION_DAYS } from '../utils/task-domain'
import {
  SOFT_DELETE_CANCEL_LABEL,
  SOFT_DELETE_CONFIRM_LABEL,
  SOFT_DELETE_CONFIRM_TITLE,
  resolveSoftDeleteAfterConfirm,
  shouldProceedWithSoftDelete,
  softDeleteConfirmMessage
} from './softDeleteConfirm'

describe('softDeleteConfirm', () => {
  it('uses British English soft-delete copy for the dialog chrome', () => {
    expect(SOFT_DELETE_CONFIRM_TITLE).toBe('Soft-delete this task?')
    expect(SOFT_DELETE_CONFIRM_LABEL).toBe('Soft-delete')
    expect(SOFT_DELETE_CANCEL_LABEL).toBe('Cancel')
  })

  it('states the domain recovery window of 30 days', () => {
    expect(SOFT_DELETE_RETENTION_DAYS).toBe(30)
    expect(softDeleteConfirmMessage('')).toContain('30 days')
    expect(softDeleteConfirmMessage('')).toContain('active board')
    expect(softDeleteConfirmMessage('')).toContain('recoverable')
  })

  it('includes the task title when present', () => {
    expect(softDeleteConfirmMessage('Write ADR')).toContain('"Write ADR"')
  })

  it('only proceeds with soft-delete when the dialog is confirmed', () => {
    expect(shouldProceedWithSoftDelete(false)).toBe(false)
    expect(shouldProceedWithSoftDelete(true)).toBe(true)
  })

  it('does not soft-delete when the user cancels confirmation', () => {
    expect(resolveSoftDeleteAfterConfirm(false, 'task-1')).toBeNull()
  })

  it('soft-deletes the pending task id when confirmation completes', () => {
    expect(resolveSoftDeleteAfterConfirm(true, 'task-1')).toBe('task-1')
    expect(resolveSoftDeleteAfterConfirm(true, null)).toBeNull()
  })
})
