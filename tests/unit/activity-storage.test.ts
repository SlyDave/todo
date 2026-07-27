import { beforeEach, describe, expect, it } from 'vitest'
import type { ActivityEvent } from '../../app/types/task'
import {
  ACTIVITY_STORAGE_KEY,
  appendActivity,
  isActivityEvent,
  loadActivity,
  parsePersistedActivity,
  saveActivity,
  serializeActivity
} from '../../app/utils/activity-storage'

function makeEvent(overrides: Partial<ActivityEvent> = {}): ActivityEvent {
  return {
    at: '2026-07-27T10:00:00.000Z',
    kind: 'create',
    taskId: 'task-1',
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

describe('activity-storage', () => {
  let storage: Storage

  beforeEach(() => {
    storage = createMemoryStorage()
  })

  it('returns no events and does not throw when local storage is empty', () => {
    expect(() => loadActivity(storage)).not.toThrow()
    expect(loadActivity(storage)).toEqual([])
  })

  it('round-trips activity events', () => {
    const events: ActivityEvent[] = [
      makeEvent({ kind: 'create', taskId: 'a' }),
      makeEvent({ kind: 'softDelete', taskId: 'a', at: '2026-07-27T11:00:00.000Z' }),
      makeEvent({ kind: 'restore', taskId: 'a', at: '2026-07-27T12:00:00.000Z' })
    ]

    saveActivity(events, storage)
    expect(storage.getItem(ACTIVITY_STORAGE_KEY)).toBe(serializeActivity(events))
    expect(loadActivity(storage)).toEqual(events)
  })

  it('appends events without dropping earlier ones', () => {
    const first = makeEvent({ kind: 'create' })
    appendActivity(first, storage)
    const second = makeEvent({ kind: 'editDetails', at: '2026-07-27T11:00:00.000Z' })
    appendActivity(second, storage)

    expect(loadActivity(storage)).toEqual([first, second])
  })

  it('loads only well-formed events and ignores corrupt entries', () => {
    const good = makeEvent({ kind: 'changeState', taskId: 'good' })
    const payload = {
      version: 1,
      events: [
        good,
        null,
        { at: 'x', kind: 'explode', taskId: 'bad' },
        { ...good, taskId: '' },
        'not-an-event',
        { ...good, taskId: 'also-good', kind: 'restore' }
      ]
    }

    storage.setItem(ACTIVITY_STORAGE_KEY, JSON.stringify(payload))

    expect(loadActivity(storage)).toEqual([good, { ...good, taskId: 'also-good', kind: 'restore' }])
  })

  it('returns [] for invalid JSON without raising', () => {
    storage.setItem(ACTIVITY_STORAGE_KEY, '{not-json')
    expect(parsePersistedActivity('{not-json')).toEqual([])
    expect(loadActivity(storage)).toEqual([])
  })

  it('isActivityEvent rejects incomplete objects', () => {
    expect(isActivityEvent(makeEvent())).toBe(true)
    expect(isActivityEvent({ at: 'x' })).toBe(false)
    expect(isActivityEvent(null)).toBe(false)
  })
})
