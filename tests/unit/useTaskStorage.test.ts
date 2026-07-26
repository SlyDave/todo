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
    expect(task.createdAt).toBe(now)
    expect(task.detailsModifiedAt).toBe(now)
    expect(task.stateChangedAt).toBe(now)
    expect(api.load(storage)).toEqual([task])
    expect(storage.getItem(TASKS_STORAGE_KEY)).not.toBeNull()
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
      { title: 'Edited' },
      { now: '2026-07-27T11:00:00.000Z', storage }
    )

    expect(updated?.title).toBe('Edited')
    expect(updated?.detailsModifiedAt).toBe('2026-07-27T11:00:00.000Z')
    expect(updated?.stateChangedAt).toBe('2026-07-26T12:00:00.000Z')
    expect(updated?.state).toBe('inProgress')
  })
})
