import { describe, expect, it } from 'vitest'
import type { Task, TaskPriority } from '../../app/types/task'
import { ALL_TASK_PRIORITIES, filterTasksByPriority } from '../../app/utils/priority-filter'

const CREATED = '2026-07-26T10:00:00.000Z'

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
    createdAt: CREATED,
    detailsModifiedAt: CREATED,
    stateChangedAt: CREATED,
    deletedAt: null,
    ...overrides
  }
}

const mixed: Task[] = [
  seedTask({ id: 'low-1', title: 'Low A', priority: 'low' }),
  seedTask({ id: 'med-1', title: 'Med A', priority: 'medium' }),
  seedTask({ id: 'high-1', title: 'High A', priority: 'high' }),
  seedTask({ id: 'low-2', title: 'Low B', priority: 'low' }),
  seedTask({ id: 'med-2', title: 'Med B', priority: 'medium' })
]

describe('ALL_TASK_PRIORITIES', () => {
  it('lists low, medium, and high in that order', () => {
    expect(ALL_TASK_PRIORITIES).toEqual(['low', 'medium', 'high'])
  })
})

describe('filterTasksByPriority', () => {
  it('returns only tasks whose priority is in the selected set', () => {
    const result = filterTasksByPriority(mixed, ['low', 'high'])

    expect(result.map((t) => t.id)).toEqual(['low-1', 'high-1', 'low-2'])
  })

  it('accepts a Set of selected priorities', () => {
    const selected = new Set<TaskPriority>(['medium'])
    const result = filterTasksByPriority(mixed, selected)

    expect(result.map((t) => t.id)).toEqual(['med-1', 'med-2'])
  })

  it('returns every task in input order when all priorities are selected', () => {
    const fromArray = filterTasksByPriority(mixed, ALL_TASK_PRIORITIES)
    const fromSet = filterTasksByPriority(mixed, new Set(ALL_TASK_PRIORITIES))

    expect(fromArray).toEqual(mixed)
    expect(fromSet).toEqual(mixed)
    expect(fromArray.map((t) => t.id)).toEqual(mixed.map((t) => t.id))
  })

  it('returns no tasks when the selected set is empty', () => {
    expect(filterTasksByPriority(mixed, [])).toEqual([])
    expect(filterTasksByPriority(mixed, new Set())).toEqual([])
  })

  it('preserves input order for matching tasks', () => {
    const result = filterTasksByPriority(mixed, ['medium', 'low'])

    expect(result.map((t) => t.id)).toEqual(['low-1', 'med-1', 'low-2', 'med-2'])
  })

  it('does not drop soft-deleted tasks — callers decide the input list', () => {
    const withDeleted = [
      seedTask({ id: 'active', priority: 'high' }),
      seedTask({ id: 'gone', priority: 'high', deletedAt: CREATED })
    ]

    expect(filterTasksByPriority(withDeleted, ['high']).map((t) => t.id)).toEqual([
      'active',
      'gone'
    ])
  })

  it('returns an empty array when the task list is empty', () => {
    expect(filterTasksByPriority([], ALL_TASK_PRIORITIES)).toEqual([])
  })
})
