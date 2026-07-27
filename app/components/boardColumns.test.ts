import { describe, expect, it } from 'vitest'
import type { Task } from '../types/task'
import {
  COLUMN_HEADINGS,
  COLUMN_ORDER,
  countActiveTasksByColumn,
  groupActiveTasksByColumn,
  isActiveTask
} from './boardColumns'

function makeTask(overrides: Partial<Task> & Pick<Task, 'id' | 'state'>): Task {
  return {
    title: '',
    description: 'Sample',
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

describe('boardColumns', () => {
  it('exposes the three stakeholder column headings', () => {
    expect(COLUMN_ORDER).toEqual(['todo', 'inProgress', 'complete'])
    expect(COLUMN_HEADINGS.todo).toBe('ToDo')
    expect(COLUMN_HEADINGS.inProgress).toBe('InProgress')
    expect(COLUMN_HEADINGS.complete).toBe('Complete')
  })

  it('treats only non-deleted tasks as active', () => {
    expect(isActiveTask(makeTask({ id: 'a', state: 'todo', deletedAt: null }))).toBe(true)
    expect(
      isActiveTask(makeTask({ id: 'b', state: 'todo', deletedAt: '2026-07-20T00:00:00.000Z' }))
    ).toBe(false)
  })

  it('returns three empty columns when there are no tasks', () => {
    const groups = groupActiveTasksByColumn([])
    expect(Object.keys(groups)).toEqual(['todo', 'inProgress', 'complete'])
    expect(groups.todo).toEqual([])
    expect(groups.inProgress).toEqual([])
    expect(groups.complete).toEqual([])
  })

  it('places each active task only in its current column', () => {
    const todo = makeTask({ id: 't1', state: 'todo', title: 'Plan' })
    const doing = makeTask({ id: 't2', state: 'inProgress', title: 'Build' })
    const done = makeTask({ id: 't3', state: 'complete', title: 'Ship' })

    const groups = groupActiveTasksByColumn([todo, doing, done])

    expect(groups.todo.map((task) => task.id)).toEqual(['t1'])
    expect(groups.inProgress.map((task) => task.id)).toEqual(['t2'])
    expect(groups.complete.map((task) => task.id)).toEqual(['t3'])
  })

  it('keeps empty columns when tasks exist only in some columns', () => {
    const todo = makeTask({ id: 'only-todo', state: 'todo' })
    const groups = groupActiveTasksByColumn([todo])

    expect(groups.todo).toHaveLength(1)
    expect(groups.inProgress).toEqual([])
    expect(groups.complete).toEqual([])
  })

  it('excludes soft-deleted tasks from every column', () => {
    const active = makeTask({ id: 'live', state: 'inProgress' })
    const deleted = makeTask({
      id: 'gone',
      state: 'todo',
      deletedAt: '2026-07-26T12:00:00.000Z'
    })

    const groups = groupActiveTasksByColumn([active, deleted])

    expect(groups.todo).toEqual([])
    expect(groups.inProgress.map((task) => task.id)).toEqual(['live'])
    expect(groups.complete).toEqual([])
  })

  it('counts active tasks per column to match the board distribution', () => {
    const tasks = [
      makeTask({ id: 'a', state: 'todo' }),
      makeTask({ id: 'b', state: 'todo' }),
      makeTask({ id: 'c', state: 'inProgress' }),
      makeTask({ id: 'd', state: 'complete' }),
      makeTask({ id: 'e', state: 'complete' }),
      makeTask({ id: 'f', state: 'complete' })
    ]

    expect(countActiveTasksByColumn(tasks)).toEqual({
      todo: 2,
      inProgress: 1,
      complete: 3
    })
  })

  it('refreshes counts when tasks move, are created, or are soft-deleted', () => {
    expect(
      countActiveTasksByColumn([
        makeTask({ id: 'a', state: 'todo' }),
        makeTask({ id: 'b', state: 'inProgress' })
      ])
    ).toEqual({ todo: 1, inProgress: 1, complete: 0 })

    // After create + move InProgress → Complete
    expect(
      countActiveTasksByColumn([
        makeTask({ id: 'a', state: 'todo' }),
        makeTask({ id: 'b', state: 'complete' }),
        makeTask({ id: 'c', state: 'todo' })
      ])
    ).toEqual({ todo: 2, inProgress: 0, complete: 1 })

    // After soft-delete of the newly created task
    expect(
      countActiveTasksByColumn([
        makeTask({ id: 'a', state: 'todo' }),
        makeTask({ id: 'b', state: 'complete' }),
        makeTask({
          id: 'c',
          state: 'todo',
          deletedAt: '2026-07-27T12:00:00.000Z'
        })
      ])
    ).toEqual({ todo: 1, inProgress: 0, complete: 1 })
  })

  it('counts all active tasks even when a priority-filtered visible subset is smaller', () => {
    const allActiveInTodo = [
      makeTask({ id: 'low', state: 'todo', priority: 'low' }),
      makeTask({ id: 'med', state: 'todo', priority: 'medium' }),
      makeTask({ id: 'high', state: 'todo', priority: 'high' }),
      makeTask({ id: 'doing', state: 'inProgress', priority: 'low' })
    ]
    // Priority filter would hide low/medium from the card list only.
    const visibleCards = allActiveInTodo.filter((task) => task.priority === 'high')

    expect(visibleCards).toHaveLength(1)
    expect(countActiveTasksByColumn(allActiveInTodo)).toEqual({
      todo: 3,
      inProgress: 1,
      complete: 0
    })
  })
})
