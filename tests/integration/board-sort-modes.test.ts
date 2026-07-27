/**
 * Integration coverage for story #15: board columns apply shared #46 helpers
 * for each sort mode (manual order override out of scope — #17).
 */
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { groupActiveTasksByColumn } from '../../app/components/boardColumns'
import {
  DEFAULT_SORT_MODE,
  SORT_MODE_LABEL,
  SORT_OPTIONS,
  sortColumnsByMode
} from '../../app/components/boardSort'
import type { SortMode, Task } from '../../app/types/task'
import { sortTasks } from '../../app/utils/task-sort'

const CREATED = '2026-07-27T00:00:00.000Z'
const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

function makeTask(overrides: Partial<Task> & Pick<Task, 'id' | 'state'>): Task {
  return {
    title: '',
    description: 'Sample',
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

/** Mixed todo column matching ratified #15 / #46 fixture. */
const mixedTodo: Task[] = [
  makeTask({ id: 'c', state: 'todo', title: 'Charlie', priority: 'low', dueDate: '2026-08-10' }),
  makeTask({ id: 'a', state: 'todo', title: 'Alpha', priority: 'high', dueDate: '2026-08-05' }),
  makeTask({ id: 'b', state: 'todo', title: 'Bravo', priority: 'medium', dueDate: '2026-08-05' }),
  makeTask({ id: 'd', state: 'todo', title: 'Delta', priority: 'high', dueDate: null }),
  makeTask({ id: 'e', state: 'todo', title: '', priority: 'medium', dueDate: '2026-08-05' })
]

const boardSeed: Task[] = [
  ...mixedTodo,
  makeTask({
    id: 'ip-late',
    state: 'inProgress',
    title: 'Zebra',
    priority: 'low',
    dueDate: '2026-09-01'
  }),
  makeTask({
    id: 'ip-early',
    state: 'inProgress',
    title: 'Apple',
    priority: 'high',
    dueDate: '2026-08-01'
  }),
  makeTask({
    id: 'done-b',
    state: 'complete',
    title: 'Beta',
    priority: 'medium',
    dueDate: null
  }),
  makeTask({
    id: 'done-a',
    state: 'complete',
    title: 'Alpha',
    priority: 'medium',
    dueDate: null
  }),
  makeTask({
    id: 'gone',
    state: 'todo',
    title: 'Soft-deleted',
    priority: 'high',
    dueDate: '2026-08-01',
    deletedAt: '2026-07-27T12:00:00.000Z'
  })
]

describe('board sort modes (#15)', () => {
  it('exposes Default / Alphabetically / Due Date / Priority with Default selected', () => {
    expect(DEFAULT_SORT_MODE).toBe('default')
    expect(SORT_OPTIONS.map((option) => option.label)).toEqual([
      'Default',
      'Alphabetically',
      'Due Date',
      'Priority'
    ])
    expect(SORT_MODE_LABEL.dueDate).toBe('Due Date')
  })

  it.each([
    ['default', ['a', 'e', 'b', 'c', 'd']],
    ['alphabetically', ['e', 'a', 'b', 'c', 'd']],
    ['dueDate', ['a', 'e', 'b', 'c', 'd']],
    ['priority', ['a', 'd', 'e', 'b', 'c']]
  ] as const satisfies readonly (readonly [SortMode, readonly string[]])[])(
    '%s: grouped columns match shared sortTasks order',
    (mode, expectedTodoIds) => {
      const grouped = groupActiveTasksByColumn(boardSeed)
      const sorted = sortColumnsByMode(grouped, mode)

      expect(ids(sorted.todo)).toEqual(expectedTodoIds)
      expect(ids(sorted.todo)).toEqual(ids(sortTasks(grouped.todo, mode)))
      expect(ids(sorted.inProgress)).toEqual(ids(sortTasks(grouped.inProgress, mode)))
      expect(ids(sorted.complete)).toEqual(ids(sortTasks(grouped.complete, mode)))
      // Soft-deleted tasks never appear on the board.
      expect(ids(sorted.todo)).not.toContain('gone')
    }
  )

  it('wires TaskBoard through sortColumnsByMode / sortTasks (no local compare)', () => {
    const boardSource = readFileSync(join(root, 'app/components/TaskBoard.vue'), 'utf8')
    const sortHelper = readFileSync(join(root, 'app/components/boardSort.ts'), 'utf8')

    expect(boardSource).toContain("from './boardSort'")
    expect(boardSource).toContain('sortColumnsByMode')
    expect(boardSource).toContain('data-testid="board-sort-mode"')
    expect(boardSource).not.toMatch(/function compare|localeCompare|PRIORITY_RANK/)

    expect(sortHelper).toContain("from '../utils/task-sort'")
    expect(sortHelper).toContain('sortTasks(')
    expect(sortHelper).not.toMatch(/function compare|PRIORITY_RANK|localeCompare/)
  })

  it('ignores contradictory manualOrder ranks under every mode (#17 out of scope)', () => {
    const withRanks = mixedTodo.map((task, index) => ({
      ...task,
      manualOrder: mixedTodo.length - index
    }))
    const withoutRanks = mixedTodo.map((task) => ({ ...task, manualOrder: null }))

    for (const mode of ['default', 'alphabetically', 'dueDate', 'priority'] as SortMode[]) {
      expect(ids(sortColumnsByMode({ todo: withRanks, inProgress: [], complete: [] }, mode).todo)).toEqual(
        ids(sortColumnsByMode({ todo: withoutRanks, inProgress: [], complete: [] }, mode).todo)
      )
    }
  })
})
