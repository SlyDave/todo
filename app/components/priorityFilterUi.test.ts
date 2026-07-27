import { describe, expect, it } from 'vitest'
import type { Task } from '../types/task'
import { ALL_TASK_PRIORITIES, filterTasksByPriority } from '../utils/priority-filter'
import {
  PRIORITY_FILTER_LEGEND,
  PRIORITY_FILTER_OPTIONS,
  defaultPriorityFilterSelection,
  isPrioritySelected,
  togglePrioritySelection
} from './priorityFilterUi'

function makeTask(overrides: Partial<Task> & Pick<Task, 'id' | 'priority'>): Task {
  return {
    title: overrides.id,
    description: 'Sample',
    state: 'todo',
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

const mixed = [
  makeTask({ id: 'low-1', priority: 'low' }),
  makeTask({ id: 'med-1', priority: 'medium' }),
  makeTask({ id: 'high-1', priority: 'high' })
]

describe('priorityFilterUi', () => {
  it('defaults to all priorities selected', () => {
    expect(defaultPriorityFilterSelection()).toEqual([...ALL_TASK_PRIORITIES])
    expect(PRIORITY_FILTER_OPTIONS.map((option) => option.value)).toEqual(['low', 'medium', 'high'])
    expect(PRIORITY_FILTER_LEGEND).toBe('Priority filter')
  })

  it('reports selection membership', () => {
    expect(isPrioritySelected(['low', 'high'], 'low')).toBe(true)
    expect(isPrioritySelected(['low', 'high'], 'medium')).toBe(false)
  })

  it('toggles priorities without mutating the input and keeps stable order', () => {
    const start = defaultPriorityFilterSelection()
    const withoutMedium = togglePrioritySelection(start, 'medium')
    expect(start).toEqual(['low', 'medium', 'high'])
    expect(withoutMedium).toEqual(['low', 'high'])

    const restored = togglePrioritySelection(withoutMedium, 'medium')
    expect(restored).toEqual(['low', 'medium', 'high'])
  })
})

describe('priority filter board wiring', () => {
  it('shows every priority when the filter is at its default', () => {
    const visible = filterTasksByPriority(mixed, defaultPriorityFilterSelection())
    expect(visible.map((task) => task.id)).toEqual(['low-1', 'med-1', 'high-1'])
  })

  it('keeps only selected priorities when one or more are deselected', () => {
    const selected = togglePrioritySelection(defaultPriorityFilterSelection(), 'medium')
    const visible = filterTasksByPriority(mixed, selected)
    expect(visible.map((task) => task.id)).toEqual(['low-1', 'high-1'])
  })

  it('restores a filtered-out task when its priority is reselected', () => {
    const deselected = togglePrioritySelection(defaultPriorityFilterSelection(), 'low')
    expect(filterTasksByPriority(mixed, deselected).map((task) => task.id)).toEqual([
      'med-1',
      'high-1'
    ])

    const restored = togglePrioritySelection(deselected, 'low')
    expect(filterTasksByPriority(mixed, restored).map((task) => task.id)).toEqual([
      'low-1',
      'med-1',
      'high-1'
    ])
  })
})
