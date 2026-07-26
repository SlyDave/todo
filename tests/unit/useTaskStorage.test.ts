import { beforeEach, describe, expect, it } from 'vitest'
import { useTaskStorage } from '../../app/composables/useTaskStorage'
import { createTask } from '../../app/utils/task-domain'
import { TASKS_STORAGE_KEY, saveTasks } from '../../app/utils/task-storage'

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

describe('useTaskStorage domain operations', () => {
  let storage: Storage
  const api = useTaskStorage()

  beforeEach(() => {
    storage = createMemoryStorage()
  })

  it('persists a new ToDo task with distinct timestamps aligned at creation', () => {
    const now = '2026-07-27T08:00:00.000Z'
    const task = api.create({ description: 'Ship the board' }, { now, id: 'persisted-1', storage })

    expect(task.state).toBe('todo')
    expect(task.priority).toBe('medium')
    expect(task.createdAt).toBe(now)
    expect(task.detailsModifiedAt).toBe(now)
    expect(task.stateChangedAt).toBe(now)
    expect(api.load(storage)).toEqual([task])
    expect(storage.getItem(TASKS_STORAGE_KEY)).not.toBeNull()
  })

  it('does not create a task when description is missing', () => {
    expect(() => api.create({ description: '   ' }, { storage })).toThrow(
      'Description is required.'
    )
    expect(api.load(storage)).toEqual([])
    expect(storage.getItem(TASKS_STORAGE_KEY)).toBeNull()
  })

  it('persists optional create fields alongside a required description', () => {
    const task = api.create(
      {
        title: 'With extras',
        description: 'Body **markdown**',
        priority: 'low',
        dueDate: '2026-08-20',
        backgroundColour: '#abcdef'
      },
      { now: '2026-07-27T08:15:00.000Z', id: 'persisted-2', storage }
    )

    expect(api.load(storage)).toEqual([
      expect.objectContaining({
        id: 'persisted-2',
        title: 'With extras',
        description: 'Body **markdown**',
        priority: 'low',
        dueDate: '2026-08-20',
        backgroundColour: '#abcdef',
        state: 'todo'
      })
    ])
    expect(task.description).toBe('Body **markdown**')
  })

  it('changeState updates only state last changed in storage', () => {
    const created = createTask(
      { description: 'Move me' },
      { now: '2026-07-26T10:00:00.000Z', id: 'move-1' }
    )
    saveTasks([created], storage)

    const moved = api.changeState('move-1', 'complete', {
      now: '2026-07-27T10:00:00.000Z',
      storage
    })

    expect(moved).not.toBeNull()
    expect(moved?.state).toBe('complete')
    expect(moved?.stateChangedAt).toBe('2026-07-27T10:00:00.000Z')
    expect(moved?.detailsModifiedAt).toBe(created.detailsModifiedAt)
    expect(api.load(storage)[0]?.stateChangedAt).toBe('2026-07-27T10:00:00.000Z')
    expect(api.load(storage)[0]?.detailsModifiedAt).toBe(created.detailsModifiedAt)
  })

  it('updateDetails updates only details last modified in storage', () => {
    const created = createTask(
      { description: 'Edit me' },
      { now: '2026-07-26T10:00:00.000Z', id: 'edit-1' }
    )
    const afterMove = {
      ...created,
      state: 'inProgress' as const,
      stateChangedAt: '2026-07-26T12:00:00.000Z'
    }
    saveTasks([afterMove], storage)

    const updated = api.updateDetails(
      'edit-1',
      {
        title: 'Edited',
        description: 'Updated **body**',
        priority: 'high',
        dueDate: '2026-09-10',
        backgroundColour: '#010203'
      },
      { now: '2026-07-27T11:00:00.000Z', storage }
    )

    expect(updated?.title).toBe('Edited')
    expect(updated?.description).toBe('Updated **body**')
    expect(updated?.priority).toBe('high')
    expect(updated?.dueDate).toBe('2026-09-10')
    expect(updated?.backgroundColour).toBe('#010203')
    expect(updated?.detailsModifiedAt).toBe('2026-07-27T11:00:00.000Z')
    expect(updated?.stateChangedAt).toBe('2026-07-26T12:00:00.000Z')
    expect(updated?.state).toBe('inProgress')
  })

  it('does not persist a details edit that clears the description', () => {
    const created = createTask(
      { description: 'Keep me' },
      { now: '2026-07-26T10:00:00.000Z', id: 'edit-2' }
    )
    saveTasks([created], storage)

    expect(() => api.updateDetails('edit-2', { description: '' }, { storage })).toThrow(
      'Description is required.'
    )
    expect(api.load(storage)[0]?.description).toBe('Keep me')
    expect(api.load(storage)[0]?.detailsModifiedAt).toBe(created.detailsModifiedAt)
  })
})
