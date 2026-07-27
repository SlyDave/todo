import { describe, expect, it } from 'vitest'
import type { SortMode, Task } from '../types/task'
import { sortTasks } from '../utils/task-sort'
import type { TasksByColumn } from './boardColumns'
import {
  DEFAULT_SORT_MODE,
  SORT_CONTROL_LABEL,
  SORT_MODE_LABEL,
  SORT_OPTIONS,
  sortColumnsByMode
} from './boardSort'

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

function ids(tasks: Task[]): string[] {
  return tasks.map((task) => task.id)
}

/** Mixed titles / due dates / priorities matching the #46 unit fixture shape. */
const mixedTodo: Task[] = [
  makeTask({ id: 'c', state: 'todo', title: 'Charlie', priority: 'low', dueDate: '2026-08-10' }),
  makeTask({ id: 'a', state: 'todo', title: 'Alpha', priority: 'high', dueDate: '2026-08-05' }),
  makeTask({ id: 'b', state: 'todo', title: 'Bravo', priority: 'medium', dueDate: '2026-08-05' }),
  makeTask({ id: 'd', state: 'todo', title: 'Delta', priority: 'high', dueDate: null }),
  makeTask({ id: 'e', state: 'todo', title: '', priority: 'medium', dueDate: '2026-08-05' })
]

describe('boardSort copy', () => {
  it('uses British English dropdown labels from the story', () => {
    expect(SORT_CONTROL_LABEL).toBe('Sort')
    expect(SORT_MODE_LABEL.default).toBe('Default')
    expect(SORT_MODE_LABEL.alphabetically).toBe('Alphabetically')
    expect(SORT_MODE_LABEL.dueDate).toBe('Due Date')
    expect(SORT_MODE_LABEL.priority).toBe('Priority')
    expect(DEFAULT_SORT_MODE).toBe('default')
    expect(SORT_OPTIONS.map((option) => option.value)).toEqual([
      'default',
      'alphabetically',
      'dueDate',
      'priority'
    ])
    expect(SORT_OPTIONS.map((option) => option.label)).toEqual([
      'Default',
      'Alphabetically',
      'Due Date',
      'Priority'
    ])
  })
})

describe('sortColumnsByMode', () => {
  const columns: TasksByColumn = {
    todo: mixedTodo,
    inProgress: [
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
      })
    ],
    complete: [
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
      })
    ]
  }

  it.each([
    ['default', ['a', 'e', 'b', 'c', 'd']],
    ['alphabetically', ['e', 'a', 'b', 'c', 'd']],
    ['dueDate', ['a', 'e', 'b', 'c', 'd']],
    ['priority', ['a', 'd', 'e', 'b', 'c']]
  ] as const satisfies readonly (readonly [SortMode, readonly string[]])[])(
    '%s: each column uses shared sortTasks helpers',
    (mode, expectedTodoIds) => {
      const sorted = sortColumnsByMode(columns, mode)

      expect(ids(sorted.todo)).toEqual(expectedTodoIds)
      expect(ids(sorted.todo)).toEqual(ids(sortTasks(columns.todo, mode)))
      expect(ids(sorted.inProgress)).toEqual(ids(sortTasks(columns.inProgress, mode)))
      expect(ids(sorted.complete)).toEqual(ids(sortTasks(columns.complete, mode)))
    }
  )

  it('does not mutate the input column arrays', () => {
    const snapshot = columns.todo.map((task) => task.id)
    sortColumnsByMode(columns, 'alphabetically')
    expect(ids(columns.todo)).toEqual(snapshot)
  })

  it('keeps empty columns empty', () => {
    const empty: TasksByColumn = { todo: [], inProgress: [], complete: [] }
    expect(sortColumnsByMode(empty, 'priority')).toEqual({
      todo: [],
      inProgress: [],
      complete: []
    })
  })
})
