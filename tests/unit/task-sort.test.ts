import { describe, expect, it } from 'vitest'
import type { SortMode, Task } from '../../app/types/task'
import { compareTasks, sortTasks } from '../../app/utils/task-sort'

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

describe('sortTasks', () => {
  const mixed: Task[] = [
    seedTask({ id: 'c', title: 'Charlie', priority: 'low', dueDate: '2026-08-10' }),
    seedTask({ id: 'a', title: 'Alpha', priority: 'high', dueDate: '2026-08-05' }),
    seedTask({ id: 'b', title: 'Bravo', priority: 'medium', dueDate: '2026-08-05' }),
    seedTask({ id: 'd', title: 'Delta', priority: 'high', dueDate: null }),
    seedTask({ id: 'e', title: '', priority: 'medium', dueDate: '2026-08-05' })
  ]

  it('default: due date, then priority, then title (null due dates last)', () => {
    // 05 high Alpha, 05 medium '', 05 medium Bravo, 10 low Charlie, null high Delta
    expect(ids(sortTasks(mixed, 'default'))).toEqual(['a', 'e', 'b', 'c', 'd'])
  })

  it('dueDate: same key chain as default', () => {
    expect(ids(sortTasks(mixed, 'dueDate'))).toEqual(ids(sortTasks(mixed, 'default')))
  })

  it('alphabetically: title, then due date, then priority', () => {
    // '' , Alpha, Bravo, Charlie, Delta
    expect(ids(sortTasks(mixed, 'alphabetically'))).toEqual(['e', 'a', 'b', 'c', 'd'])
  })

  it('priority: high → medium → low, then due date, then title', () => {
    // high: a (05) before d (null); medium: e ('') before b (Bravo); then c low
    expect(ids(sortTasks(mixed, 'priority'))).toEqual(['a', 'd', 'e', 'b', 'c'])
  })

  it('does not mutate the input array', () => {
    const original = [...mixed]
    const snapshot = mixed.map((t) => t.id)
    sortTasks(mixed, 'alphabetically')
    expect(ids(mixed)).toEqual(snapshot)
    expect(mixed).toEqual(original)
  })

  it('empty titles sort consistently before non-empty under every mode that keys on title', () => {
    const emptyFirst = [
      seedTask({ id: 'named', title: 'Zebra', priority: 'medium', dueDate: '2026-08-01' }),
      seedTask({ id: 'blank', title: '', priority: 'medium', dueDate: '2026-08-01' }),
      seedTask({ id: 'also-blank', title: '', priority: 'medium', dueDate: '2026-08-01' })
    ]

    for (const mode of ['default', 'alphabetically', 'dueDate', 'priority'] as SortMode[]) {
      const sorted = sortTasks(emptyFirst, mode)
      const blankIndexes = sorted
        .map((t, i) => (t.title === '' ? i : -1))
        .filter((i) => i >= 0)
      const namedIndex = sorted.findIndex((t) => t.title === 'Zebra')
      expect(blankIndexes.every((i) => i < namedIndex)).toBe(true)
      // two empties stay ordered by id for a total order
      expect(ids(sorted.filter((t) => t.title === ''))).toEqual(['also-blank', 'blank'])
    }
  })

  it('title compare is case-insensitive', () => {
    const tasks = [
      seedTask({ id: 'upper', title: 'bravo', priority: 'medium', dueDate: null }),
      seedTask({ id: 'lower', title: 'Alpha', priority: 'medium', dueDate: null })
    ]
    expect(ids(sortTasks(tasks, 'alphabetically'))).toEqual(['lower', 'upper'])
  })
})

describe('compareTasks', () => {
  it('returns 0 only when all keys and id match', () => {
    const a = seedTask({ id: 'same', title: 'X', priority: 'high', dueDate: '2026-09-01' })
    const b = seedTask({ id: 'same', title: 'X', priority: 'high', dueDate: '2026-09-01' })
    expect(compareTasks(a, b, 'default')).toBe(0)
  })

  it('breaks ties with id when mode keys are equal', () => {
    const a = seedTask({ id: 'z', title: 'Same', priority: 'medium', dueDate: '2026-08-01' })
    const b = seedTask({ id: 'a', title: 'Same', priority: 'medium', dueDate: '2026-08-01' })
    expect(compareTasks(a, b, 'default')).toBeGreaterThan(0)
    expect(compareTasks(b, a, 'default')).toBeLessThan(0)
  })
})
