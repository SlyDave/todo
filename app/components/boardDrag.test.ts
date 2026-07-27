import { describe, expect, it } from 'vitest'
import type { Task } from '../types/task'
import { BOARD_DRAG_GROUP, resolveColumnDrop } from './boardDrag'

function makeTask(overrides: Partial<Task> & Pick<Task, 'id' | 'state'>): Task {
  return {
    title: 'Sample',
    description: '',
    priority: 'medium',
    dueDate: null,
    backgroundColour: null,
    manualOrder: null,
    createdAt: '2026-07-27T00:00:00.000Z',
    detailsModifiedAt: '2026-07-27T00:00:00.000Z',
    stateChangedAt: '2026-07-27T00:00:00.000Z',
    deletedAt: null,
    ...overrides
  }
}

describe('boardDrag', () => {
  it('exposes a shared group name for the three columns', () => {
    expect(BOARD_DRAG_GROUP).toBe('board-tasks')
  })

  it('requests a state change when a task is added to a different column', () => {
    const task = makeTask({ id: 't1', state: 'todo' })
    expect(resolveColumnDrop('inProgress', { added: { element: task, newIndex: 0 } })).toEqual({
      taskId: 't1',
      state: 'inProgress'
    })
  })

  it('ignores adds when the task is already in the target column', () => {
    const task = makeTask({ id: 't1', state: 'complete' })
    expect(resolveColumnDrop('complete', { added: { element: task, newIndex: 1 } })).toBeNull()
  })

  it('ignores within-column moves so order can stay deferred', () => {
    const task = makeTask({ id: 't1', state: 'todo' })
    expect(
      resolveColumnDrop('todo', { moved: { element: task, oldIndex: 0, newIndex: 2 } })
    ).toBeNull()
  })

  it('ignores removals alone (cancel or source side of a move)', () => {
    const task = makeTask({ id: 't1', state: 'todo' })
    expect(resolveColumnDrop('todo', { removed: { element: task, oldIndex: 0 } })).toBeNull()
  })

  it('ignores an empty change payload (cancelled or invalid drop)', () => {
    expect(resolveColumnDrop('inProgress', {})).toBeNull()
  })
})
