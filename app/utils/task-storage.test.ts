import { beforeEach, describe, expect, it } from 'vitest'
import type { Task } from '../types/task'
import {
  TASKS_STORAGE_KEY,
  isTask,
  loadTasks,
  parsePersistedTasks,
  saveTasks,
  serializeTasks
} from './task-storage'

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 'task-1',
    title: 'Buy milk',
    description: 'Two pints',
    priority: 'medium',
    dueDate: '2026-08-01',
    backgroundColour: '#aabbcc',
    state: 'todo',
    manualOrder: 1,
    createdAt: '2026-07-26T10:00:00.000Z',
    detailsModifiedAt: '2026-07-26T11:00:00.000Z',
    stateChangedAt: '2026-07-26T10:00:00.000Z',
    deletedAt: null,
    ...overrides
  }
}

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

describe('task-storage', () => {
  let storage: Storage

  beforeEach(() => {
    storage = createMemoryStorage()
  })

  it('returns no tasks and does not throw when local storage is empty', () => {
    expect(() => loadTasks(storage)).not.toThrow()
    expect(loadTasks(storage)).toEqual([])
  })

  it('round-trips tasks with the same fields and column', () => {
    const tasks: Task[] = [
      makeTask({ id: 'a', state: 'todo' }),
      makeTask({ id: 'b', state: 'inProgress', title: 'Write ADR' }),
      makeTask({ id: 'c', state: 'complete', priority: 'high', manualOrder: null })
    ]

    saveTasks(tasks, storage)
    expect(storage.getItem(TASKS_STORAGE_KEY)).toBe(serializeTasks(tasks))
    expect(loadTasks(storage)).toEqual(tasks)
  })

  it('loads only well-formed records and ignores corrupt entries', () => {
    const good = makeTask({ id: 'good', state: 'inProgress' })
    const payload = {
      version: 1,
      tasks: [
        good,
        null,
        { id: 'bad-state', title: '', description: '', state: 'Done' },
        { ...good, id: '' },
        'not-a-task',
        { ...good, id: 'also-good', state: 'complete' }
      ]
    }

    storage.setItem(TASKS_STORAGE_KEY, JSON.stringify(payload))

    expect(() => loadTasks(storage)).not.toThrow()
    expect(loadTasks(storage)).toEqual([good, { ...good, id: 'also-good', state: 'complete' }])
  })

  it('returns [] for invalid JSON without raising', () => {
    storage.setItem(TASKS_STORAGE_KEY, '{not-json')
    expect(parsePersistedTasks('{not-json')).toEqual([])
    expect(loadTasks(storage)).toEqual([])
  })

  it('returns [] for an unsupported envelope shape', () => {
    storage.setItem(TASKS_STORAGE_KEY, JSON.stringify({ version: 99, tasks: [makeTask()] }))
    expect(loadTasks(storage)).toEqual([])
  })

  it('accepts a bare array payload for resilience', () => {
    const task = makeTask({ state: 'todo' })
    expect(parsePersistedTasks(JSON.stringify([task, { broken: true }]))).toEqual([task])
  })

  it('isTask rejects incomplete objects', () => {
    expect(isTask(makeTask())).toBe(true)
    expect(isTask({ id: 'x' })).toBe(false)
    expect(isTask(null)).toBe(false)
  })

  it('returns [] when storage read throws and does not raise', () => {
    const broken = {
      getItem: () => {
        throw new Error('denied')
      },
      setItem: () => undefined,
      removeItem: () => undefined,
      clear: () => undefined,
      key: () => null,
      length: 0
    } satisfies Storage

    expect(() => loadTasks(broken)).not.toThrow()
    expect(loadTasks(broken)).toEqual([])
  })
})
