import { beforeEach, describe, expect, it } from 'vitest'
import { useTaskStorage } from '../../app/composables/useTaskStorage'
import { SOFT_DELETE_RETENTION_MS, createTask, softDeleteTask } from '../../app/utils/task-domain'
import { ACTIVITY_STORAGE_KEY } from '../../app/utils/activity-storage'
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

  it('soft-deletes a task so it is recoverable and records softDelete activity', () => {
    const created = createTask(
      { description: 'Delete me', title: 'Card' },
      { now: '2026-07-26T10:00:00.000Z', id: 'del-1' }
    )
    const moved = {
      ...created,
      state: 'inProgress' as const,
      stateChangedAt: '2026-07-26T12:00:00.000Z'
    }
    saveTasks([moved], storage)

    const deleted = api.softDelete('del-1', {
      now: '2026-07-27T09:00:00.000Z',
      storage
    })

    expect(deleted?.deletedAt).toBe('2026-07-27T09:00:00.000Z')
    expect(deleted?.state).toBe('inProgress')
    expect(api.load(storage)[0]?.deletedAt).toBe('2026-07-27T09:00:00.000Z')
    expect(api.listActivity(storage)).toEqual([
      {
        at: '2026-07-27T09:00:00.000Z',
        kind: 'softDelete',
        taskId: 'del-1'
      }
    ])
    expect(storage.getItem(ACTIVITY_STORAGE_KEY)).not.toBeNull()
  })

  it('restores a recoverable task to its prior column and records restore activity', () => {
    const created = createTask(
      {
        title: 'Restore me',
        description: 'Body',
        priority: 'high',
        dueDate: '2026-08-01',
        backgroundColour: '#abcabc'
      },
      { now: '2026-07-20T10:00:00.000Z', id: 'res-1' }
    )
    const seeded = softDeleteTask(
      {
        ...created,
        state: 'complete',
        stateChangedAt: '2026-07-21T10:00:00.000Z',
        manualOrder: 4
      },
      '2026-07-22T10:00:00.000Z'
    )
    saveTasks([seeded], storage)

    const restored = api.restore('res-1', {
      now: '2026-07-27T10:00:00.000Z',
      storage
    })

    expect(restored).toMatchObject({
      id: 'res-1',
      deletedAt: null,
      state: 'complete',
      title: 'Restore me',
      description: 'Body',
      priority: 'high',
      dueDate: '2026-08-01',
      backgroundColour: '#abcabc',
      manualOrder: 4,
      stateChangedAt: '2026-07-21T10:00:00.000Z'
    })
    expect(api.listActivity(storage)).toContainEqual({
      at: '2026-07-27T10:00:00.000Z',
      kind: 'restore',
      taskId: 'res-1'
    })
  })

  it('removes an expired soft-deleted task when restore is attempted', () => {
    const deletedAt = '2026-06-01T00:00:00.000Z'
    const expired = softDeleteTask(
      createTask({ description: 'Too old' }, { now: '2026-05-01T00:00:00.000Z', id: 'exp-1' }),
      deletedAt
    )
    saveTasks([expired], storage)

    const afterWindow = new Date(Date.parse(deletedAt) + SOFT_DELETE_RETENTION_MS + 1).toISOString()
    expect(api.restore('exp-1', { now: afterWindow, storage })).toBeNull()
    expect(api.load(storage)).toEqual([])
    expect(api.listActivity(storage)).toEqual([])
  })

  it('purgeExpired removes only soft-deletes older than 30 days', () => {
    const now = '2026-07-27T12:00:00.000Z'
    const active = createTask(
      { description: 'Active' },
      { now: '2026-07-01T00:00:00.000Z', id: 'p-active' }
    )
    const recoverable = softDeleteTask(
      createTask({ description: 'Soon' }, { now: '2026-07-01T00:00:00.000Z', id: 'p-ok' }),
      '2026-07-10T12:00:00.000Z'
    )
    const expiredDeletedAt = new Date(Date.parse(now) - SOFT_DELETE_RETENTION_MS - 1).toISOString()
    const expired = softDeleteTask(
      createTask({ description: 'Gone' }, { now: '2026-05-01T00:00:00.000Z', id: 'p-gone' }),
      expiredDeletedAt
    )
    saveTasks([active, recoverable, expired], storage)

    const kept = api.purgeExpired({ now, storage })
    expect(kept.map((task) => task.id)).toEqual(['p-active', 'p-ok'])
    expect(api.load(storage).map((task) => task.id)).toEqual(['p-active', 'p-ok'])
  })

  it('records create, editDetails, and changeState activity for the calendar', () => {
    const created = api.create(
      { description: 'Track me' },
      { now: '2026-07-27T08:00:00.000Z', id: 'act-1', storage }
    )
    api.updateDetails('act-1', { title: 'Edited' }, { now: '2026-07-27T09:00:00.000Z', storage })
    api.changeState('act-1', 'inProgress', { now: '2026-07-27T10:00:00.000Z', storage })

    expect(created.id).toBe('act-1')
    expect(api.listActivity(storage)).toEqual([
      { at: '2026-07-27T08:00:00.000Z', kind: 'create', taskId: 'act-1' },
      { at: '2026-07-27T09:00:00.000Z', kind: 'editDetails', taskId: 'act-1' },
      {
        at: '2026-07-27T10:00:00.000Z',
        kind: 'changeState',
        taskId: 'act-1',
        toState: 'inProgress'
      }
    ])
  })

  it('records the target column on changeState activity for completed mode', () => {
    api.create(
      { description: 'Finish me' },
      { now: '2026-07-27T08:00:00.000Z', id: 'done-1', storage }
    )
    api.changeState('done-1', 'complete', { now: '2026-07-27T12:00:00.000Z', storage })

    expect(api.listActivity(storage)).toEqual([
      { at: '2026-07-27T08:00:00.000Z', kind: 'create', taskId: 'done-1' },
      {
        at: '2026-07-27T12:00:00.000Z',
        kind: 'changeState',
        taskId: 'done-1',
        toState: 'complete'
      }
    ])
  })
})
