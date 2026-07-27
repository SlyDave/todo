import { describe, expect, it } from 'vitest'
import { SOFT_DELETE_RETENTION_MS } from '../utils/task-domain'
import type { Task } from '../types/task'
import {
  TASK_RECOVERY_CLOSE_LABEL,
  TASK_RECOVERY_EMPTY_MESSAGE,
  TASK_RECOVERY_OPEN_LABEL,
  TASK_RECOVERY_RESTORE_LABEL,
  TASK_RECOVERY_TITLE,
  formatRecoverableDeletedAt,
  listRecoverableTasks,
  recoverablePriorColumnLabel,
  recoverableTaskHeading,
  resolveRestoreTaskId
} from './taskRecovery'

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 'task-1',
    title: 'Write ADR',
    description: 'Document the decision',
    priority: 'medium',
    dueDate: null,
    backgroundColour: null,
    state: 'todo',
    manualOrder: null,
    createdAt: '2026-07-01T00:00:00.000Z',
    detailsModifiedAt: '2026-07-01T00:00:00.000Z',
    stateChangedAt: '2026-07-01T00:00:00.000Z',
    deletedAt: null,
    ...overrides
  }
}

describe('taskRecovery', () => {
  it('uses British English recovery copy', () => {
    expect(TASK_RECOVERY_TITLE).toBe('Recoverable tasks')
    expect(TASK_RECOVERY_OPEN_LABEL).toBe('Recover tasks')
    expect(TASK_RECOVERY_RESTORE_LABEL).toBe('Restore')
    expect(TASK_RECOVERY_CLOSE_LABEL).toBe('Close')
    expect(TASK_RECOVERY_EMPTY_MESSAGE).toContain('30 days')
    expect(TASK_RECOVERY_EMPTY_MESSAGE).toContain('recoverable')
  })

  it('lists only soft-deleted tasks still within the 30-day window', () => {
    const now = '2026-07-27T12:00:00.000Z'
    const recoverable = makeTask({
      id: 'ok',
      deletedAt: '2026-07-20T12:00:00.000Z',
      state: 'inProgress'
    })
    const expiredDeletedAt = new Date(Date.parse(now) - SOFT_DELETE_RETENTION_MS - 1).toISOString()
    const expired = makeTask({
      id: 'expired',
      deletedAt: expiredDeletedAt,
      state: 'complete'
    })
    const active = makeTask({ id: 'active', deletedAt: null })

    const listed = listRecoverableTasks([active, expired, recoverable], now)

    expect(listed.map((task) => task.id)).toEqual(['ok'])
  })

  it('orders recoverable tasks with newest deletion first', () => {
    const now = '2026-07-27T12:00:00.000Z'
    const older = makeTask({ id: 'older', deletedAt: '2026-07-10T12:00:00.000Z' })
    const newer = makeTask({ id: 'newer', deletedAt: '2026-07-25T12:00:00.000Z' })

    expect(listRecoverableTasks([older, newer], now).map((task) => task.id)).toEqual([
      'newer',
      'older'
    ])
  })

  it('does not list a task soft-deleted more than 30 days ago', () => {
    const deletedAt = '2026-06-01T00:00:00.000Z'
    const afterWindow = new Date(Date.parse(deletedAt) + SOFT_DELETE_RETENTION_MS + 1).toISOString()
    const expired = makeTask({ id: 'gone', deletedAt })

    expect(listRecoverableTasks([expired], afterWindow)).toEqual([])
  })

  it('exposes the prior column heading for a recoverable task', () => {
    expect(recoverablePriorColumnLabel('todo')).toBe('ToDo')
    expect(recoverablePriorColumnLabel('inProgress')).toBe('InProgress')
    expect(recoverablePriorColumnLabel('complete')).toBe('Complete')
  })

  it('falls back to Untitled task when the title is blank', () => {
    expect(recoverableTaskHeading(makeTask({ title: '  ' }))).toBe('Untitled task')
    expect(recoverableTaskHeading(makeTask({ title: 'Ship it' }))).toBe('Ship it')
  })

  it('formats deletedAt in en-GB or returns null when missing', () => {
    expect(formatRecoverableDeletedAt(null)).toBeNull()
    expect(formatRecoverableDeletedAt('not-a-date')).toBeNull()
    expect(formatRecoverableDeletedAt('2026-07-20T14:30:00.000Z')).toMatch(/20/)
  })

  it('resolves a restore id only when present', () => {
    expect(resolveRestoreTaskId('task-1')).toBe('task-1')
    expect(resolveRestoreTaskId(null)).toBeNull()
    expect(resolveRestoreTaskId('')).toBeNull()
    expect(resolveRestoreTaskId('   ')).toBeNull()
  })
})
