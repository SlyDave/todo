import { describe, expect, it } from 'vitest'
import type { Task } from '../types/task'
import {
  NEEDS_ACTIONED_ICON,
  NEEDS_ACTIONED_WARNING,
  showNeedsActionedIndicator
} from './taskNeedsActioned'

const MS_PER_DAY = 24 * 60 * 60 * 1000
const NOW = '2026-07-27T12:00:00.000Z'
const NOW_MS = Date.parse(NOW)

function seedTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 'task-1',
    title: 'Buy milk',
    description: 'Two pints',
    priority: 'medium',
    dueDate: null,
    backgroundColour: null,
    state: 'todo',
    manualOrder: null,
    createdAt: NOW,
    detailsModifiedAt: NOW,
    stateChangedAt: NOW,
    deletedAt: null,
    ...overrides
  }
}

describe('taskNeedsActioned', () => {
  it('uses the triangle-exclamation icon already registered in the FA plugin', () => {
    expect(NEEDS_ACTIONED_ICON).toEqual(['fas', 'triangle-exclamation'])
  })

  it('exposes British English needs-actioned warning copy', () => {
    expect(NEEDS_ACTIONED_WARNING).toBe('This task needs actioned')
  })

  it('shows the indicator for ToDo past 15 days', () => {
    const task = seedTask({
      state: 'todo',
      stateChangedAt: new Date(NOW_MS - 16 * MS_PER_DAY).toISOString()
    })
    expect(showNeedsActionedIndicator(task, NOW)).toBe(true)
  })

  it('shows the indicator for InProgress past 3 days', () => {
    const task = seedTask({
      state: 'inProgress',
      stateChangedAt: new Date(NOW_MS - 4 * MS_PER_DAY).toISOString()
    })
    expect(showNeedsActionedIndicator(task, NOW)).toBe(true)
  })

  it('hides the indicator for Complete regardless of age', () => {
    const task = seedTask({
      state: 'complete',
      stateChangedAt: new Date(NOW_MS - 100 * MS_PER_DAY).toISOString()
    })
    expect(showNeedsActionedIndicator(task, NOW)).toBe(false)
  })

  it('hides the indicator when ToDo or InProgress are within thresholds', () => {
    const todoWithin = seedTask({
      state: 'todo',
      stateChangedAt: new Date(NOW_MS - 15 * MS_PER_DAY).toISOString()
    })
    const inProgressWithin = seedTask({
      state: 'inProgress',
      stateChangedAt: new Date(NOW_MS - 3 * MS_PER_DAY).toISOString()
    })
    expect(showNeedsActionedIndicator(todoWithin, NOW)).toBe(false)
    expect(showNeedsActionedIndicator(inProgressWithin, NOW)).toBe(false)
  })
})
