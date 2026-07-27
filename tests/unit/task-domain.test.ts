import { describe, expect, it } from 'vitest'
import type { Task } from '../../app/types/task'
import {
  TaskValidationError,
  changeTaskState,
  createTask,
  updateTaskDetails
} from '../../app/utils/task-domain'

const CREATED = '2026-07-26T10:00:00.000Z'
const DETAILS_EDITED = '2026-07-26T11:00:00.000Z'
const STATE_MOVED = '2026-07-27T09:00:00.000Z'

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
})
