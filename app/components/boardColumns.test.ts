import { describe, expect, it } from 'vitest'
import type { Task } from '../types/task'
import {
  COLUMN_HEADINGS,
  COLUMN_ORDER,
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
})
