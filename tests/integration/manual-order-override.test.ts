/**
 * Integration coverage for story #17: per-column manual order override.
 * Verifies board UI wires #64 helpers and acceptance criteria hold end-to-end
 * through storage + display ordering (without mounting Vue).
 */
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { groupActiveTasksByColumn } from '../../app/components/boardColumns'
import {
  mergeVisibleReorderIntoColumnOrder,
  resolveColumnDrop,
  resolveWithinColumnReorder
} from '../../app/components/boardDrag'
import { sortColumnsByMode } from '../../app/components/boardSort'
import type { Task } from '../../app/types/task'
import {
  applyManualOrderRanks,
  clearManualOrderRanks,
  columnHasManualOrderOverride,
  orderTasksForColumn,
  withManualOrderOnColumnEnter
} from '../../app/utils/task-manual-order'
import { TASKS_STORAGE_KEY, saveTasks } from '../../app/utils/task-storage'
import { useTaskStorage } from '../../app/composables/useTaskStorage'

const CREATED = '2026-07-27T12:00:00.000Z'
const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

function createMemoryStorage(initial: Record<string, string> = {}): Storage {
  const map = new Map<string, string>(Object.entries(initial))
  return {
    get length() {
      return map.size
    },
    clear: () => {
      map.clear()
    },
    getItem: (key: string) => map.get(key) ?? null,
    key: (index: number) => [...map.keys()][index] ?? null,
    removeItem: (key: string) => {
      map.delete(key)
    },
    setItem: (key: string, value: string) => {
      map.set(key, value)
    }
  }
}

function makeTask(overrides: Partial<Task> & Pick<Task, 'id' | 'state' | 'title'>): Task {
  return {
    description: '',
    priority: 'medium',
    dueDate: null,
    backgroundColour: null,
    manualOrder: null,
    createdAt: CREATED,
    detailsModifiedAt: CREATED,
    stateChangedAt: CREATED,
    deletedAt: null,
    ...overrides
  }
}

function ids(tasks: Task[]): string[] {
  return tasks.map((task) => task.id)
}

function seedBoard(storage: Storage): ReturnType<typeof useTaskStorage> {
  const api = useTaskStorage()
  const tasks: Task[] = [
    makeTask({ id: 'todo-z', state: 'todo', title: 'Zebra', priority: 'low' }),
    makeTask({ id: 'todo-a', state: 'todo', title: 'Alpha', priority: 'high' }),
    makeTask({ id: 'todo-m', state: 'todo', title: 'Mike', priority: 'medium' }),
    makeTask({
      id: 'ip-z',
      state: 'inProgress',
      title: 'Zebra IP',
      priority: 'low',
      dueDate: '2026-09-01'
    }),
    makeTask({
      id: 'ip-a',
      state: 'inProgress',
      title: 'Apple IP',
      priority: 'high',
      dueDate: '2026-08-01'
    }),
    makeTask({ id: 'done-b', state: 'complete', title: 'Beta Done', priority: 'medium' }),
    makeTask({ id: 'done-a', state: 'complete', title: 'Alpha Done', priority: 'low' })
  ]
  saveTasks(tasks, storage)
  expect(storage.getItem(TASKS_STORAGE_KEY)).not.toBeNull()
  return api
}

describe('per-column manual order override (#17)', () => {
  it('wires TaskBoard / BoardColumn / boardSort through #64 domain helpers', () => {
    const board = readFileSync(join(root, 'app/components/TaskBoard.vue'), 'utf8')
    const column = readFileSync(join(root, 'app/components/BoardColumn.vue'), 'utf8')
    const sortHelper = readFileSync(join(root, 'app/components/boardSort.ts'), 'utf8')
    const dragHelper = readFileSync(join(root, 'app/components/boardDrag.ts'), 'utf8')

    expect(board).toContain('applyManualOrder')
    expect(board).toContain('clearManualOrder')
    expect(board).toContain('resolveWithinColumnReorder')
    expect(board).toContain('@clear-manual-order')
    expect(board).not.toMatch(/applyManualOrderRanks|clearManualOrderRanks/)

    expect(column).toContain('columnHasManualOrderOverride')
    expect(column).toContain('column-clear-manual-order')
    expect(column).toContain('clear-manual-order')

    expect(sortHelper).toContain("from '../utils/task-manual-order'")
    expect(sortHelper).toContain('orderTasksForColumn(')
    expect(sortHelper).not.toContain('sortTasks(')

    expect(dragHelper).toContain('mergeVisibleReorderIntoColumnOrder')
    expect(dragHelper).toContain('resolveWithinColumnReorder')
  })

  it('AC1: within-column reorder establishes override; column follows ranks not sort', () => {
    const storage = createMemoryStorage()
    const api = seedBoard(storage)

    const before = groupActiveTasksByColumn(api.load(storage))
    expect(ids(sortColumnsByMode(before, 'alphabetically').todo)).toEqual([
      'todo-a',
      'todo-m',
      'todo-z'
    ])

    // Simulate BoardColumn moved event → TaskBoard applyManualOrder path.
    const fullOrder = ids(sortColumnsByMode(before, 'alphabetically').todo)
    const visibleAfterDrag = ['todo-z', 'todo-a', 'todo-m']
    const task = before.todo.find((t) => t.id === 'todo-z')!
    const orderedIds = resolveWithinColumnReorder(
      { moved: { element: task, oldIndex: 2, newIndex: 0 } },
      fullOrder,
      visibleAfterDrag
    )
    expect(orderedIds).toEqual(['todo-z', 'todo-a', 'todo-m'])

    api.applyManualOrder('todo', orderedIds!, { storage })
    const after = groupActiveTasksByColumn(api.load(storage))
    expect(columnHasManualOrderOverride(after.todo)).toBe(true)
    expect(ids(sortColumnsByMode(after, 'alphabetically').todo)).toEqual([
      'todo-z',
      'todo-a',
      'todo-m'
    ])
    expect(ids(orderTasksForColumn(after.todo, 'priority'))).toEqual([
      'todo-z',
      'todo-a',
      'todo-m'
    ])
  })

  it('AC2: sort change updates non-override columns; override column keeps ranks', () => {
    const storage = createMemoryStorage()
    const api = seedBoard(storage)
    api.applyManualOrder('todo', ['todo-z', 'todo-m', 'todo-a'], { storage })

    const grouped = groupActiveTasksByColumn(api.load(storage))
    const alpha = sortColumnsByMode(grouped, 'alphabetically')
    expect(ids(alpha.todo)).toEqual(['todo-z', 'todo-m', 'todo-a'])
    expect(ids(alpha.inProgress)).toEqual(['ip-a', 'ip-z'])
    expect(ids(alpha.complete)).toEqual(['done-a', 'done-b'])

    const byPriority = sortColumnsByMode(grouped, 'priority')
    expect(ids(byPriority.todo)).toEqual(['todo-z', 'todo-m', 'todo-a'])
    expect(ids(byPriority.inProgress)).toEqual(['ip-a', 'ip-z'])
    expect(ids(byPriority.complete)).toEqual(['done-b', 'done-a'])
  })

  it('AC3: clearing override returns the column to the selected sort', () => {
    const storage = createMemoryStorage()
    const api = seedBoard(storage)
    api.applyManualOrder('todo', ['todo-z', 'todo-m', 'todo-a'], { storage })
    expect(columnHasManualOrderOverride(groupActiveTasksByColumn(api.load(storage)).todo)).toBe(
      true
    )

    api.clearManualOrder('todo', { storage })
    const grouped = groupActiveTasksByColumn(api.load(storage))
    expect(columnHasManualOrderOverride(grouped.todo)).toBe(false)
    expect(ids(sortColumnsByMode(grouped, 'alphabetically').todo)).toEqual([
      'todo-a',
      'todo-m',
      'todo-z'
    ])
    expect(ids(sortColumnsByMode(grouped, 'priority').todo)).toEqual([
      'todo-a',
      'todo-m',
      'todo-z'
    ])
  })

  it('AC4: cross-column enter follows destination override; other columns unaffected', () => {
    const storage = createMemoryStorage()
    const api = seedBoard(storage)
    api.applyManualOrder('inProgress', ['ip-z', 'ip-a'], { storage })
    const before = groupActiveTasksByColumn(api.load(storage))
    const todoRanksBefore = before.todo.map((t) => t.manualOrder)
    const completeBefore = ids(before.complete)

    const moving = before.todo.find((t) => t.id === 'todo-a')!
    const drop = resolveColumnDrop('inProgress', {
      added: { element: moving, newIndex: 2 }
    })
    expect(drop).toEqual({ taskId: 'todo-a', state: 'inProgress' })

    api.changeState('todo-a', 'inProgress', { storage })
    const after = groupActiveTasksByColumn(api.load(storage))

    expect(ids(sortColumnsByMode(after, 'alphabetically').inProgress)).toEqual([
      'ip-z',
      'ip-a',
      'todo-a'
    ])
    const entered = after.inProgress.find((t) => t.id === 'todo-a')!
    expect(entered.manualOrder).toBe(2)
    expect(columnHasManualOrderOverride(after.inProgress)).toBe(true)

    expect(after.todo.map((t) => t.manualOrder)).toEqual(
      todoRanksBefore.filter((_, i) => before.todo[i]!.id !== 'todo-a')
    )
    expect(ids(after.complete)).toEqual(completeBefore)
    expect(columnHasManualOrderOverride(after.todo)).toBe(false)
  })

  it('AC4b: entering a column without override clears carried ranks', () => {
    const storage = createMemoryStorage()
    const api = seedBoard(storage)
    api.applyManualOrder('todo', ['todo-z', 'todo-a', 'todo-m'], { storage })

    api.changeState('todo-z', 'complete', { storage })
    const after = groupActiveTasksByColumn(api.load(storage))
    const entered = after.complete.find((t) => t.id === 'todo-z')!
    expect(entered.manualOrder).toBeNull()
    expect(columnHasManualOrderOverride(after.complete)).toBe(false)
    expect(columnHasManualOrderOverride(after.todo)).toBe(true)
    expect(ids(sortColumnsByMode(after, 'alphabetically').todo)).toEqual(['todo-a', 'todo-m'])
  })

  it('priority-filtered within-column reorder merges hidden slots for applyManualOrder', () => {
    const full = ['a', 'b', 'c', 'd', 'e']
    const visibleReordered = ['e', 'a', 'c']
    const merged = mergeVisibleReorderIntoColumnOrder(full, visibleReordered)
    expect(merged).toEqual(['e', 'b', 'a', 'd', 'c'])

    const ranked = applyManualOrderRanks(
      merged.map((id) => makeTask({ id, state: 'todo', title: id }))
    )
    expect(ranked.map((t) => t.manualOrder)).toEqual([0, 1, 2, 3, 4])
    expect(ids(orderTasksForColumn(ranked, 'alphabetically'))).toEqual(merged)

    const cleared = clearManualOrderRanks(ranked)
    expect(columnHasManualOrderOverride(cleared)).toBe(false)
  })

  it('domain enter helper matches changeState destination rules', () => {
    const destination = [
      makeTask({ id: 'ip-1', state: 'inProgress', title: 'One', manualOrder: 0 }),
      makeTask({ id: 'ip-2', state: 'inProgress', title: 'Two', manualOrder: 1 })
    ]
    const newcomer = makeTask({ id: 'x', state: 'todo', title: 'X', manualOrder: 0 })
    expect(withManualOrderOnColumnEnter(newcomer, destination).manualOrder).toBe(2)
    expect(withManualOrderOnColumnEnter(newcomer, []).manualOrder).toBeNull()
  })
})
