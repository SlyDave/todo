import { describe, expect, it } from 'vitest'
import type { ActivityEvent } from '../../app/types/task'
import {
  activityDateKey,
  buildMonthHistogram,
  countActivityByDay,
  daysInMonth,
  intensityStage
} from '../../app/utils/calendar-histogram'
import { useCalendarHistogram } from '../../app/composables/useCalendarHistogram'
import { ACTIVITY_STORAGE_KEY, serializeActivity } from '../../app/utils/activity-storage'

function event(at: string, taskId = 't1'): ActivityEvent {
  return { at, kind: 'create', taskId }
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

describe('calendar-histogram', () => {
  it('reports days in month including leap February', () => {
    expect(daysInMonth(2026, 7)).toBe(31)
    expect(daysInMonth(2024, 2)).toBe(29)
    expect(daysInMonth(2025, 2)).toBe(28)
  })

  it('maps counts to five intensity stages scaled to the peak', () => {
    expect(intensityStage(0, 10)).toBe(0)
    expect(intensityStage(1, 4)).toBe(1)
    expect(intensityStage(2, 4)).toBe(2)
    expect(intensityStage(3, 4)).toBe(3)
    expect(intensityStage(4, 4)).toBe(4)
    expect(intensityStage(10, 10)).toBe(4)
    expect(intensityStage(5, 0)).toBe(0)
  })

  it('counts activity per day for the viewed month and ignores other months', () => {
    const events = [
      event('2026-07-01T08:00:00.000Z'),
      event('2026-07-01T12:00:00.000Z'),
      event('2026-07-15T09:00:00.000Z'),
      event('2026-06-30T23:00:00.000Z'),
      event('2026-08-01T00:00:00.000Z'),
      event('not-a-date')
    ]
    const counts = countActivityByDay(events, 2026, 7)
    expect(counts).toHaveLength(31)
    expect(counts[0]).toBe(2)
    expect(counts[14]).toBe(1)
    expect(counts.reduce((sum, n) => sum + n, 0)).toBe(3)
  })

  it('builds a full navigable month with intensities scaled to the peak day', () => {
    const events = [
      event('2026-07-01T10:00:00.000Z'),
      event('2026-07-01T11:00:00.000Z'),
      event('2026-07-01T12:00:00.000Z'),
      event('2026-07-01T13:00:00.000Z'),
      event('2026-07-02T10:00:00.000Z'),
      event('2026-07-10T10:00:00.000Z'),
      event('2026-07-10T11:00:00.000Z')
    ]
    const histogram = buildMonthHistogram(events, 2026, 7)
    expect(histogram.year).toBe(2026)
    expect(histogram.month).toBe(7)
    expect(histogram.peak).toBe(4)
    expect(histogram.days).toHaveLength(31)
    expect(histogram.days[0]).toMatchObject({
      date: '2026-07-01',
      day: 1,
      count: 4,
      intensity: 4
    })
    expect(histogram.days[1]?.intensity).toBe(1)
    expect(histogram.days[9]?.intensity).toBe(2)
    expect(histogram.days.every((cell) => cell.weekday >= 0 && cell.weekday <= 6)).toBe(true)
    expect(histogram.days.every((cell) => [0, 1, 2, 3, 4].includes(cell.intensity))).toBe(true)
  })

  it('returns lowest intensity for every day when the month has no events', () => {
    const histogram = buildMonthHistogram([], 2026, 2)
    expect(histogram.peak).toBe(0)
    expect(histogram.days).toHaveLength(28)
    expect(histogram.days.every((cell) => cell.count === 0 && cell.intensity === 0)).toBe(true)
  })

  it('exposes UTC date keys for activity timestamps', () => {
    expect(activityDateKey('2026-07-26T23:30:00.000Z')).toBe('2026-07-26')
    expect(activityDateKey('bogus')).toBeNull()
  })
})

describe('useCalendarHistogram', () => {
  it('builds a month histogram from persisted activity storage', () => {
    const events = [event('2026-07-05T10:00:00.000Z'), event('2026-07-05T11:00:00.000Z')]
    const storage = createMemoryStorage({
      [ACTIVITY_STORAGE_KEY]: serializeActivity(events)
    })
    const { forMonth } = useCalendarHistogram()
    const histogram = forMonth(2026, 7, { storage })
    expect(histogram.peak).toBe(2)
    expect(histogram.days[4]?.intensity).toBe(4)
  })
})
