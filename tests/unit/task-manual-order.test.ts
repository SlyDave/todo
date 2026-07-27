import { describe, expect, it } from 'vitest'
import type { SortMode, Task } from '../../app/types/task'
import {
  applyManualOrderRanks,
  clearManualOrderRanks,
  columnHasManualOrderOverride,
  compareManualOrder,
  mergeTasksById,
  orderTasksForColumn,
  withManualOrderOnColumnEnter
} from '../../app/utils/task-manual-order'
import { sortTasks } from '../../app/utils/task-sort'

const CREATED = '2026-07-26T10:00:00.000Z'

function seedTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 'task-1',
    title: 'Buy milk',
    description: 'Two pints',
    priority: 'medium',
    dueDate: '2026-08-01',
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

function ids(tasks: Task[]): string[] {
  return tasks.map((t) => t.id)
}

describe('columnHasManualOrderOverride', () => {
  it('is false when every manualOrder is null', () => {
    expect(
      columnHasManualOrderOverride([
        seedTask({ id: 'a', manualOrder: null }),
        seedTask({ id: 'b', manualOrder: null })
      ])
    ).toBe(false)
  })

  it('is true when at least one manualOrder is non-null', () => {
    expect(
      columnHasManualOrderOverride([
        seedTask({ id: 'a', manualOrder: null }),
        seedTask({ id: 'b', manualOrder: 0 })
      ])
    ).toBe(true)
  })
})

describe('orderTasksForColumn', () => {
  const mixed: Task[] = [
    seedTask({
      id: 'c',
      title: 'Charlie',
      priority: 'low',
      dueDate: '2026-08-10',
      manualOrder: null
    }),
    seedTask({
      id: 'a',
      title: 'Alpha',
      priority: 'high',
      dueDate: '2026-08-05',
      manualOrder: null
    }),
    seedTask({
      id: 'b',
      title: 'Bravo',
      priority: 'medium',
      dueDate: '2026-08-05',
      manualOrder: null
    }),
    seedTask({ id: 'd', title: 'Delta', priority: 'high', dueDate: null, manualOrder: null }),
    seedTask({ id: 'e', title: '', priority: 'medium', dueDate: '2026-08-05', manualOrder: null })
  ]

  it('with no override matches sortTasks for every SortMode', () => {
    for (const mode of ['default', 'alphabetically', 'dueDate', 'priority'] as SortMode[]) {
      expect(ids(orderTasksForColumn(mixed, mode))).toEqual(ids(sortTasks(mixed, mode)))
    }
  })

  it('with active override sorts by manualOrder ascending, ignoring SortMode', () => {
    const ranked = [
      seedTask({
        id: 'late',
        title: 'Alpha',
        priority: 'high',
        dueDate: '2026-08-01',
        manualOrder: 2
      }),
      seedTask({
        id: 'first',
        title: 'Zebra',
        priority: 'low',
        dueDate: '2026-08-20',
        manualOrder: 0
      }),
      seedTask({
        id: 'mid',
        title: 'Mike',
        priority: 'medium',
        dueDate: '2026-08-05',
        manualOrder: 1
      })
    ]

    expect(ids(orderTasksForColumn(ranked, 'alphabetically'))).toEqual(['first', 'mid', 'late'])
    expect(ids(orderTasksForColumn(ranked, 'priority'))).toEqual(['first', 'mid', 'late'])
  })

  it('breaks equal manualOrder ties with id ascending', () => {
    const tied = [
      seedTask({ id: 'z', manualOrder: 1 }),
      seedTask({ id: 'a', manualOrder: 1 }),
      seedTask({ id: 'm', manualOrder: 0 })
    ]
    expect(ids(orderTasksForColumn(tied, 'default'))).toEqual(['m', 'a', 'z'])
    expect(compareManualOrder(tied[0]!, tied[1]!)).toBeGreaterThan(0)
  })

  it('sorts null manualOrder after numeric ranks when mixed (defensive)', () => {
    const mixedRanks = [
      seedTask({ id: 'nullish', manualOrder: null }),
      seedTask({ id: 'zero', manualOrder: 0 })
    ]
    expect(ids(orderTasksForColumn(mixedRanks, 'default'))).toEqual(['zero', 'nullish'])
  })

  it('does not mutate the input array', () => {
    const ranked = [seedTask({ id: 'b', manualOrder: 1 }), seedTask({ id: 'a', manualOrder: 0 })]
    const snapshot = ranked.map((t) => t.id)
    orderTasksForColumn(ranked, 'default')
    expect(ids(ranked)).toEqual(snapshot)
  })
})

describe('applyManualOrderRanks', () => {
  it('assigns contiguous 0..n-1 ranks in the given order', () => {
    const ordered = [
      seedTask({ id: 'c', manualOrder: null }),
      seedTask({ id: 'a', manualOrder: 99 }),
      seedTask({ id: 'b', manualOrder: 1 })
    ]
    const ranked = applyManualOrderRanks(ordered)
    expect(ranked.map((t) => ({ id: t.id, manualOrder: t.manualOrder }))).toEqual([
      { id: 'c', manualOrder: 0 },
      { id: 'a', manualOrder: 1 },
      { id: 'b', manualOrder: 2 }
    ])
    expect(ordered[0]?.manualOrder).toBeNull()
  })
})

describe('clearManualOrderRanks', () => {
  it('sets every manualOrder to null', () => {
    const column = [seedTask({ id: 'a', manualOrder: 0 }), seedTask({ id: 'b', manualOrder: 1 })]
    const cleared = clearManualOrderRanks(column)
    expect(cleared.every((t) => t.manualOrder === null)).toBe(true)
    expect(column[0]?.manualOrder).toBe(0)
  })

  it('after clear, orderTasksForColumn follows SortMode', () => {
    const column = [
      seedTask({ id: 'z', title: 'Zebra', priority: 'low', dueDate: '2026-08-10', manualOrder: 0 }),
      seedTask({ id: 'a', title: 'Alpha', priority: 'high', dueDate: '2026-08-01', manualOrder: 1 })
    ]
    const cleared = clearManualOrderRanks(column)
    expect(ids(orderTasksForColumn(cleared, 'alphabetically'))).toEqual(
      ids(sortTasks(cleared, 'alphabetically'))
    )
    expect(ids(orderTasksForColumn(cleared, 'alphabetically'))).toEqual(['a', 'z'])
  })
})

describe('withManualOrderOnColumnEnter', () => {
  it('appends after max rank when destination has an active override', () => {
    const destination = [
      seedTask({ id: 'a', state: 'inProgress', manualOrder: 0 }),
      seedTask({ id: 'b', state: 'inProgress', manualOrder: 2 })
    ]
    const newcomer = seedTask({ id: 'c', state: 'inProgress', manualOrder: null })
    const result = withManualOrderOnColumnEnter(newcomer, destination)
    expect(result.manualOrder).toBe(3)
    expect(destination.map((t) => t.manualOrder)).toEqual([0, 2])
  })

  it('clears carried rank when destination has no override', () => {
    const destination = [
      seedTask({ id: 'a', state: 'complete', manualOrder: null }),
      seedTask({ id: 'b', state: 'complete', manualOrder: null })
    ]
    const newcomer = seedTask({ id: 'c', state: 'complete', manualOrder: 5 })
    expect(withManualOrderOnColumnEnter(newcomer, destination).manualOrder).toBeNull()
  })

  it('does not change other columns when merging into the full board', () => {
    const todo = seedTask({ id: 't1', state: 'todo', manualOrder: 0 })
    const inProgress = [
      seedTask({ id: 'i1', state: 'inProgress', manualOrder: 0 }),
      seedTask({ id: 'i2', state: 'inProgress', manualOrder: 1 })
    ]
    const entering = seedTask({ id: 'from-todo', state: 'inProgress', manualOrder: 0 })
    const updated = withManualOrderOnColumnEnter(entering, inProgress)
    const board = mergeTasksById([todo, ...inProgress, entering], [updated])
    expect(board.find((t) => t.id === 't1')?.manualOrder).toBe(0)
    expect(board.find((t) => t.id === 'i1')?.manualOrder).toBe(0)
    expect(board.find((t) => t.id === 'i2')?.manualOrder).toBe(1)
    expect(board.find((t) => t.id === 'from-todo')?.manualOrder).toBe(2)
  })
})

describe('mergeTasksById', () => {
  it('replaces matching ids and leaves others untouched', () => {
    const all = [seedTask({ id: 'a', manualOrder: null }), seedTask({ id: 'b', manualOrder: null })]
    const updates = [seedTask({ id: 'b', manualOrder: 0 })]
    const merged = mergeTasksById(all, updates)
    expect(merged[0]?.manualOrder).toBeNull()
    expect(merged[1]?.manualOrder).toBe(0)
  })
})
