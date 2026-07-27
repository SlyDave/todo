import { describe, expect, it } from 'vitest'
import type { Task } from '../../app/types/task'
import {
  DESCRIPTION_MAX_LENGTH,
  IN_PROGRESS_NEEDS_ACTIONED_MS,
  SOFT_DELETE_RETENTION_MS,
  TITLE_MAX_LENGTH,
  TODO_NEEDS_ACTIONED_MS,
  TaskValidationError,
  changeTaskState,
  createActivityEvent,
  createTask,
  isNeedsActioned,
  isRecoverable,
  purgeExpiredSoftDeletes,
  restoreTask,
  softDeleteTask,
  updateTaskDetails
} from '../../app/utils/task-domain'

const CREATED = '2026-07-26T10:00:00.000Z'
const DETAILS_EDITED = '2026-07-26T11:00:00.000Z'
const STATE_MOVED = '2026-07-27T09:00:00.000Z'
const MS_PER_DAY = 24 * 60 * 60 * 1000

function seedTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 'task-1',
    title: 'Buy milk',
    description: 'Two pints',
    priority: 'medium',
    dueDate: '2026-08-01',
    backgroundColour: '#aabbcc',
    state: 'todo',
    manualOrder: 1,
    createdAt: CREATED,
    detailsModifiedAt: DETAILS_EDITED,
    stateChangedAt: CREATED,
    deletedAt: null,
    ...overrides
  }
}

describe('createTask', () => {
  it('creates in ToDo with all three timestamps set to the creation instant', () => {
    const now = '2026-07-27T12:00:00.000Z'
    const task = createTask(
      { title: 'Plan sprint', description: 'Write acceptance criteria' },
      { now, id: 'new-1' }
    )

    expect(task).toMatchObject({
      id: 'new-1',
      title: 'Plan sprint',
      description: 'Write acceptance criteria',
      priority: 'medium',
      state: 'todo',
      createdAt: now,
      detailsModifiedAt: now,
      stateChangedAt: now,
      deletedAt: null,
      manualOrder: null,
      dueDate: null,
      backgroundColour: null
    })
  })

  it('defaults omitted optional fields and sets created', () => {
    const now = '2026-07-27T12:30:00.000Z'
    const task = createTask({ description: 'Only description provided' }, { now, id: 'new-2' })

    expect(task.title).toBe('')
    expect(task.priority).toBe('medium')
    expect(task.dueDate).toBeNull()
    expect(task.backgroundColour).toBeNull()
    expect(task.state).toBe('todo')
    expect(task.createdAt).toBe(now)
  })

  it('accepts optional title, priority, due date, and background colour', () => {
    const task = createTask(
      {
        title: 'Optional title',
        description: 'Required body',
        priority: 'high',
        dueDate: '2026-08-15',
        backgroundColour: '#112233'
      },
      { now: '2026-07-27T13:00:00.000Z', id: 'new-3' }
    )

    expect(task).toMatchObject({
      title: 'Optional title',
      description: 'Required body',
      priority: 'high',
      dueDate: '2026-08-15',
      backgroundColour: '#112233',
      state: 'todo'
    })
  })

  it('stores Markdown description as raw text without converting to HTML', () => {
    const markdown = '## Heading\n\n- item with **bold** and `code`'
    const task = createTask(
      { description: markdown },
      { now: '2026-07-27T13:30:00.000Z', id: 'md-1' }
    )

    expect(task.description).toBe(markdown)
    expect(task.description).not.toContain('<')
    expect(task.description).not.toContain('</')
  })

  it('rejects a blank description with British English copy', () => {
    expect(() => createTask({ description: '   ' })).toThrow(TaskValidationError)
    expect(() => createTask({ description: '' })).toThrow('Description is required.')
    expect(() => createTask({ description: undefined as unknown as string })).toThrow(
      'Description is required.'
    )
  })

  it('exports title and description max length constants', () => {
    expect(TITLE_MAX_LENGTH).toBe(50)
    expect(DESCRIPTION_MAX_LENGTH).toBe(5000)
  })

  it('rejects a title longer than 50 characters', () => {
    const title = 't'.repeat(TITLE_MAX_LENGTH + 1)
    expect(() => createTask({ title, description: 'Body' })).toThrow(TaskValidationError)
    expect(() => createTask({ title, description: 'Body' })).toThrow(
      `Title must be at most ${TITLE_MAX_LENGTH} characters.`
    )
  })

  it('rejects a description longer than 5000 characters', () => {
    const description = 'd'.repeat(DESCRIPTION_MAX_LENGTH + 1)
    expect(() => createTask({ description })).toThrow(TaskValidationError)
    expect(() => createTask({ description })).toThrow(
      `Description must be at most ${DESCRIPTION_MAX_LENGTH} characters.`
    )
  })

  it('accepts a title of 50 characters and a description of 5000 characters', () => {
    const title = 't'.repeat(TITLE_MAX_LENGTH)
    const description = 'd'.repeat(DESCRIPTION_MAX_LENGTH)
    const task = createTask({ title, description }, { id: 'limits-ok' })
    expect(task.title).toHaveLength(TITLE_MAX_LENGTH)
    expect(task.description).toHaveLength(DESCRIPTION_MAX_LENGTH)
  })
})

describe('changeTaskState', () => {
  it('updates state and state last changed without treating the move as a details edit', () => {
    const task = seedTask({
      state: 'todo',
      detailsModifiedAt: DETAILS_EDITED,
      stateChangedAt: CREATED
    })
    const moved = changeTaskState(task, 'inProgress', STATE_MOVED)

    expect(moved.state).toBe('inProgress')
    expect(moved.stateChangedAt).toBe(STATE_MOVED)
    expect(moved.detailsModifiedAt).toBe(DETAILS_EDITED)
    expect(moved.createdAt).toBe(CREATED)
    expect(moved.title).toBe(task.title)
  })

  it('can move to Complete and still leaves details last modified untouched', () => {
    const task = seedTask({ state: 'inProgress' })
    const moved = changeTaskState(task, 'complete', STATE_MOVED)

    expect(moved.state).toBe('complete')
    expect(moved.stateChangedAt).toBe(STATE_MOVED)
    expect(moved.detailsModifiedAt).toBe(DETAILS_EDITED)
  })

  it('does not bump state last changed when the column is unchanged', () => {
    const task = seedTask({ state: 'todo', stateChangedAt: CREATED })
    const same = changeTaskState(task, 'todo', STATE_MOVED)

    expect(same).toBe(task)
    expect(same.stateChangedAt).toBe(CREATED)
  })
})

describe('updateTaskDetails', () => {
  it('updates details last modified but not state last changed', () => {
    const task = seedTask({
      state: 'inProgress',
      detailsModifiedAt: DETAILS_EDITED,
      stateChangedAt: STATE_MOVED
    })
    const editedAt = '2026-07-27T15:00:00.000Z'
    const updated = updateTaskDetails(
      task,
      {
        title: 'Buy oat milk',
        description: 'One litre',
        priority: 'high',
        dueDate: '2026-09-01',
        backgroundColour: '#ffee00'
      },
      editedAt
    )

    expect(updated.title).toBe('Buy oat milk')
    expect(updated.description).toBe('One litre')
    expect(updated.priority).toBe('high')
    expect(updated.dueDate).toBe('2026-09-01')
    expect(updated.backgroundColour).toBe('#ffee00')
    expect(updated.detailsModifiedAt).toBe(editedAt)
    expect(updated.stateChangedAt).toBe(STATE_MOVED)
    expect(updated.state).toBe('inProgress')
    expect(updated.createdAt).toBe(CREATED)
  })

  it('can clear optional due date and background colour without touching state timestamps', () => {
    const task = seedTask({
      stateChangedAt: STATE_MOVED,
      detailsModifiedAt: DETAILS_EDITED
    })
    const editedAt = '2026-07-27T16:00:00.000Z'
    const updated = updateTaskDetails(task, { dueDate: null, backgroundColour: null }, editedAt)

    expect(updated.dueDate).toBeNull()
    expect(updated.backgroundColour).toBeNull()
    expect(updated.detailsModifiedAt).toBe(editedAt)
    expect(updated.stateChangedAt).toBe(STATE_MOVED)
  })

  it('persists edited Markdown description as raw text', () => {
    const markdown = 'Edit with *emphasis* and a [link](https://example.com)'
    const updated = updateTaskDetails(
      seedTask({ stateChangedAt: STATE_MOVED }),
      { description: markdown },
      '2026-07-27T17:00:00.000Z'
    )

    expect(updated.description).toBe(markdown)
    expect(updated.stateChangedAt).toBe(STATE_MOVED)
  })

  it('rejects clearing the description', () => {
    expect(() => updateTaskDetails(seedTask(), { description: ' ' })).toThrow(
      'Description is required.'
    )
  })

  it('rejects over-long title or description on update', () => {
    expect(() =>
      updateTaskDetails(seedTask(), { title: 't'.repeat(TITLE_MAX_LENGTH + 1) })
    ).toThrow(`Title must be at most ${TITLE_MAX_LENGTH} characters.`)
    expect(() =>
      updateTaskDetails(seedTask(), { description: 'd'.repeat(DESCRIPTION_MAX_LENGTH + 1) })
    ).toThrow(`Description must be at most ${DESCRIPTION_MAX_LENGTH} characters.`)
  })

  it('accepts at-limit title and description on update', () => {
    const updated = updateTaskDetails(seedTask(), {
      title: 't'.repeat(TITLE_MAX_LENGTH),
      description: 'd'.repeat(DESCRIPTION_MAX_LENGTH)
    })
    expect(updated.title).toHaveLength(TITLE_MAX_LENGTH)
    expect(updated.description).toHaveLength(DESCRIPTION_MAX_LENGTH)
  })

  it('rejects details edits on a soft-deleted task', () => {
    const deleted = softDeleteTask(seedTask(), '2026-07-27T12:00:00.000Z')
    expect(() => updateTaskDetails(deleted, { title: 'Nope' })).toThrow('Task is soft-deleted.')
  })
})

describe('softDeleteTask and restoreTask', () => {
  it('soft-deletes an active task without changing column or other fields', () => {
    const task = seedTask({
      state: 'inProgress',
      detailsModifiedAt: DETAILS_EDITED,
      stateChangedAt: STATE_MOVED,
      manualOrder: 3
    })
    const deletedAt = '2026-07-27T18:00:00.000Z'
    const deleted = softDeleteTask(task, deletedAt)

    expect(deleted.deletedAt).toBe(deletedAt)
    expect(deleted.state).toBe('inProgress')
    expect(deleted.title).toBe(task.title)
    expect(deleted.description).toBe(task.description)
    expect(deleted.priority).toBe(task.priority)
    expect(deleted.dueDate).toBe(task.dueDate)
    expect(deleted.backgroundColour).toBe(task.backgroundColour)
    expect(deleted.manualOrder).toBe(3)
    expect(deleted.detailsModifiedAt).toBe(DETAILS_EDITED)
    expect(deleted.stateChangedAt).toBe(STATE_MOVED)
    expect(deleted.createdAt).toBe(CREATED)
  })

  it('rejects soft-deleting an already soft-deleted task', () => {
    const deleted = softDeleteTask(seedTask(), '2026-07-27T18:00:00.000Z')
    expect(() => softDeleteTask(deleted, '2026-07-27T19:00:00.000Z')).toThrow(
      'Task is soft-deleted.'
    )
  })

  it('restores a recoverable task to its prior column with fields intact', () => {
    const task = seedTask({
      state: 'complete',
      detailsModifiedAt: DETAILS_EDITED,
      stateChangedAt: STATE_MOVED,
      title: 'Keep me',
      description: 'Unchanged body',
      priority: 'high',
      dueDate: '2026-09-01',
      backgroundColour: '#112233',
      manualOrder: 7
    })
    const deleted = softDeleteTask(task, '2026-07-27T18:00:00.000Z')
    const restored = restoreTask(deleted, '2026-08-10T10:00:00.000Z')

    expect(restored.deletedAt).toBeNull()
    expect(restored.state).toBe('complete')
    expect(restored.title).toBe('Keep me')
    expect(restored.description).toBe('Unchanged body')
    expect(restored.priority).toBe('high')
    expect(restored.dueDate).toBe('2026-09-01')
    expect(restored.backgroundColour).toBe('#112233')
    expect(restored.manualOrder).toBe(7)
    expect(restored.detailsModifiedAt).toBe(DETAILS_EDITED)
    expect(restored.stateChangedAt).toBe(STATE_MOVED)
  })

  it('rejects restoring a task that is not soft-deleted', () => {
    expect(() => restoreTask(seedTask())).toThrow('Task is not soft-deleted.')
  })

  it('rejects restoring after the 30-day recovery window', () => {
    const deletedAt = '2026-06-01T00:00:00.000Z'
    const deleted = softDeleteTask(seedTask(), deletedAt)
    const afterWindow = new Date(Date.parse(deletedAt) + SOFT_DELETE_RETENTION_MS + 1).toISOString()

    expect(isRecoverable(deleted, afterWindow)).toBe(false)
    expect(() => restoreTask(deleted, afterWindow)).toThrow(
      'Soft-deleted task is no longer recoverable.'
    )
  })

  it('still recovers on the last millisecond of the retention window', () => {
    const deletedAt = '2026-06-01T00:00:00.000Z'
    const deleted = softDeleteTask(seedTask({ state: 'todo' }), deletedAt)
    const lastMs = new Date(Date.parse(deletedAt) + SOFT_DELETE_RETENTION_MS).toISOString()

    expect(isRecoverable(deleted, lastMs)).toBe(true)
    expect(restoreTask(deleted, lastMs).deletedAt).toBeNull()
  })
})

describe('purgeExpiredSoftDeletes', () => {
  it('removes soft-deleted tasks older than 30 days and keeps the rest', () => {
    const now = '2026-07-27T12:00:00.000Z'
    const active = seedTask({ id: 'active', deletedAt: null })
    const recoverable = softDeleteTask(
      seedTask({ id: 'recoverable', state: 'inProgress' }),
      '2026-07-10T12:00:00.000Z'
    )
    const expiredDeletedAt = new Date(Date.parse(now) - SOFT_DELETE_RETENTION_MS - 1).toISOString()
    const expired = softDeleteTask(seedTask({ id: 'expired', state: 'complete' }), expiredDeletedAt)

    expect(purgeExpiredSoftDeletes([active, recoverable, expired], now)).toEqual([
      active,
      recoverable
    ])
  })
})

describe('createActivityEvent', () => {
  it('records each calendar activity kind with task id and instant', () => {
    const at = '2026-07-27T20:00:00.000Z'
    expect(createActivityEvent('create', 't1', at)).toEqual({
      at,
      kind: 'create',
      taskId: 't1'
    })
    expect(createActivityEvent('editDetails', 't1', at).kind).toBe('editDetails')
    expect(createActivityEvent('changeState', 't1', at).kind).toBe('changeState')
    expect(createActivityEvent('softDelete', 't1', at).kind).toBe('softDelete')
    expect(createActivityEvent('restore', 't1', at).kind).toBe('restore')
  })

  it('records toState when provided for changeState', () => {
    const at = '2026-07-27T20:00:00.000Z'
    expect(createActivityEvent('changeState', 't1', at, 'complete')).toEqual({
      at,
      kind: 'changeState',
      taskId: 't1',
      toState: 'complete'
    })
  })
})

describe('changeTaskState soft-delete guard', () => {
  it('rejects column changes on a soft-deleted task', () => {
    const deleted = softDeleteTask(seedTask({ state: 'todo' }), '2026-07-27T18:00:00.000Z')
    expect(() => changeTaskState(deleted, 'complete')).toThrow('Task is soft-deleted.')
  })
})

describe('isNeedsActioned', () => {
  const now = '2026-07-27T12:00:00.000Z'
  const nowMs = Date.parse(now)

  it('flags a ToDo task when stateChangedAt is older than 15 days', () => {
    const stateChangedAt = new Date(nowMs - TODO_NEEDS_ACTIONED_MS - 1).toISOString()
    expect(isNeedsActioned(seedTask({ state: 'todo', stateChangedAt }), now)).toBe(true)
  })

  it('does not flag a ToDo task at exactly 15 days', () => {
    const stateChangedAt = new Date(nowMs - TODO_NEEDS_ACTIONED_MS).toISOString()
    expect(isNeedsActioned(seedTask({ state: 'todo', stateChangedAt }), now)).toBe(false)
  })

  it('does not flag a ToDo task younger than 15 days', () => {
    const stateChangedAt = new Date(nowMs - TODO_NEEDS_ACTIONED_MS + 1).toISOString()
    expect(isNeedsActioned(seedTask({ state: 'todo', stateChangedAt }), now)).toBe(false)
  })

  it('flags an InProgress task when stateChangedAt is older than 3 days', () => {
    const stateChangedAt = new Date(nowMs - IN_PROGRESS_NEEDS_ACTIONED_MS - 1).toISOString()
    expect(isNeedsActioned(seedTask({ state: 'inProgress', stateChangedAt }), now)).toBe(true)
  })

  it('does not flag an InProgress task at exactly 3 days', () => {
    const stateChangedAt = new Date(nowMs - IN_PROGRESS_NEEDS_ACTIONED_MS).toISOString()
    expect(isNeedsActioned(seedTask({ state: 'inProgress', stateChangedAt }), now)).toBe(false)
  })

  it('does not flag an InProgress task younger than 3 days', () => {
    const stateChangedAt = new Date(nowMs - IN_PROGRESS_NEEDS_ACTIONED_MS + 1).toISOString()
    expect(isNeedsActioned(seedTask({ state: 'inProgress', stateChangedAt }), now)).toBe(false)
  })

  it('never flags Complete tasks regardless of age', () => {
    const stateChangedAt = new Date(nowMs - TODO_NEEDS_ACTIONED_MS - MS_PER_DAY).toISOString()
    expect(isNeedsActioned(seedTask({ state: 'complete', stateChangedAt }), now)).toBe(false)
  })

  it('returns false for invalid stateChangedAt', () => {
    expect(isNeedsActioned(seedTask({ state: 'todo', stateChangedAt: 'not-a-date' }), now)).toBe(
      false
    )
  })
})
