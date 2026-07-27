import { describe, expect, it } from 'vitest'
import type { Task } from '../types/task'
import {
  BOARD_DRAG_GROUP,
  mergeVisibleReorderIntoColumnOrder,
  resolveColumnDrop,
  resolveWithinColumnReorder
} from './boardDrag'

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

  it('does not treat within-column moves as column drops', () => {
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

describe('mergeVisibleReorderIntoColumnOrder', () => {
  it('returns the visible order when every task is visible', () => {
    expect(mergeVisibleReorderIntoColumnOrder(['a', 'b', 'c'], ['c', 'a', 'b'])).toEqual([
      'c',
      'a',
      'b'
    ])
  })

  it('keeps hidden tasks at their absolute indices while rewriting visible slots', () => {
    // Full: A B C D E; visible A C E reordered to E A C → E B A D C
    expect(mergeVisibleReorderIntoColumnOrder(['a', 'b', 'c', 'd', 'e'], ['e', 'a', 'c'])).toEqual([
      'e',
      'b',
      'a',
      'd',
      'c'
    ])
  })
})

describe('resolveWithinColumnReorder', () => {
  it('returns null when the event is not a within-column move', () => {
    expect(resolveWithinColumnReorder({}, ['a', 'b'], ['a', 'b'])).toBeNull()
    expect(
      resolveWithinColumnReorder(
        { added: { element: makeTask({ id: 'x', state: 'todo' }), newIndex: 0 } },
        ['a'],
        ['x', 'a']
      )
    ).toBeNull()
  })

  it('merges the post-move visible order into the full column order', () => {
    const task = makeTask({ id: 'c', state: 'todo' })
    expect(
      resolveWithinColumnReorder(
        { moved: { element: task, oldIndex: 2, newIndex: 0 } },
        ['a', 'b', 'c', 'd'],
        ['c', 'a', 'd']
      )
    ).toEqual(['c', 'b', 'a', 'd'])
  })
})
