import { describe, expect, it } from 'vitest'
import type { ActivityEvent, ActivityKind } from '../../app/types/task'
import {
  activityDateKey,
  buildMonthHistogram,
  countActivityByDay,
  daysInMonth,
  eventMatchesMode,
  intensityStage
} from '../../app/utils/calendar-histogram'
import { useCalendarHistogram } from '../../app/composables/useCalendarHistogram'
import { ACTIVITY_STORAGE_KEY, serializeActivity } from '../../app/utils/activity-storage'

function event(
  at: string,
  kind: ActivityKind = 'create',
  taskId = 't1',
  toState?: ActivityEvent['toState']
): ActivityEvent {
  const base: ActivityEvent = { at, kind, taskId }
  if (toState !== undefined) {
    base.toState = toState
  }
  return base
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

  it('matches events to calendar view modes', () => {
    expect(eventMatchesMode(event('2026-07-01T00:00:00.000Z', 'create'), 'activity')).toBe(true)
    expect(eventMatchesMode(event('2026-07-01T00:00:00.000Z', 'softDelete'), 'activity')).toBe(true)
    expect(eventMatchesMode(event('2026-07-01T00:00:00.000Z', 'create'), 'created')).toBe(true)
    expect(eventMatchesMode(event('2026-07-01T00:00:00.000Z', 'editDetails'), 'created')).toBe(
      false
    )
    expect(
      eventMatchesMode(
        event('2026-07-01T00:00:00.000Z', 'changeState', 't1', 'complete'),
        'completed'
      )
    ).toBe(true)
    expect(
      eventMatchesMode(
        event('2026-07-01T00:00:00.000Z', 'changeState', 't1', 'inProgress'),
        'completed'
      )
    ).toBe(false)
    expect(eventMatchesMode(event('2026-07-01T00:00:00.000Z', 'changeState'), 'completed')).toBe(
      false
    )
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

  it('counts all activity kinds in activity mode including restore and soft-delete', () => {
    const events = [
      event('2026-07-03T08:00:00.000Z', 'create'),
      event('2026-07-03T09:00:00.000Z', 'editDetails'),
      event('2026-07-03T10:00:00.000Z', 'changeState', 't1', 'inProgress'),
      event('2026-07-03T11:00:00.000Z', 'softDelete'),
      event('2026-07-03T12:00:00.000Z', 'restore')
    ]
    const counts = countActivityByDay(events, 2026, 7, 'activity')
    expect(counts[2]).toBe(5)
  })

  it('counts only creates in created mode', () => {
    const events = [
      event('2026-07-04T08:00:00.000Z', 'create', 'a'),
      event('2026-07-04T09:00:00.000Z', 'create', 'b'),
      event('2026-07-04T10:00:00.000Z', 'editDetails', 'a'),
      event('2026-07-04T11:00:00.000Z', 'changeState', 'a', 'complete')
    ]
    const counts = countActivityByDay(events, 2026, 7, 'created')
    expect(counts[3]).toBe(2)
    expect(counts.reduce((sum, n) => sum + n, 0)).toBe(2)
  })

  it('counts only transitions to Complete in completed mode', () => {
    const events = [
      event('2026-07-05T08:00:00.000Z', 'changeState', 'a', 'complete'),
      event('2026-07-05T09:00:00.000Z', 'changeState', 'b', 'inProgress'),
      event('2026-07-05T10:00:00.000Z', 'changeState', 'c', 'todo'),
      event('2026-07-05T11:00:00.000Z', 'changeState', 'd', 'complete'),
      event('2026-07-05T12:00:00.000Z', 'create', 'e'),
      event('2026-07-05T13:00:00.000Z', 'changeState', 'f')
    ]
    const counts = countActivityByDay(events, 2026, 7, 'completed')
    expect(counts[4]).toBe(2)
    expect(counts.reduce((sum, n) => sum + n, 0)).toBe(2)
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
    expect(histogram.mode).toBe('activity')
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

  it('recalculates intensities against the selected mode peak when switching modes', () => {
    const events = [
      event('2026-07-01T08:00:00.000Z', 'create', 'a'),
      event('2026-07-01T09:00:00.000Z', 'create', 'b'),
      event('2026-07-01T10:00:00.000Z', 'create', 'c'),
      event('2026-07-01T11:00:00.000Z', 'create', 'd'),
      event('2026-07-02T08:00:00.000Z', 'editDetails', 'a'),
      event('2026-07-02T09:00:00.000Z', 'changeState', 'a', 'complete'),
      event('2026-07-10T08:00:00.000Z', 'changeState', 'b', 'complete'),
      event('2026-07-10T09:00:00.000Z', 'changeState', 'c', 'complete'),
      event('2026-07-10T10:00:00.000Z', 'changeState', 'd', 'complete'),
      event('2026-07-10T11:00:00.000Z', 'changeState', 'e', 'complete')
    ]

    const activity = buildMonthHistogram(events, 2026, 7, 'activity')
    expect(activity.mode).toBe('activity')
    expect(activity.peak).toBe(4)
    expect(activity.days[0]?.intensity).toBe(4)
    expect(activity.days[9]?.intensity).toBe(4)

    const created = buildMonthHistogram(events, 2026, 7, 'created')
    expect(created.mode).toBe('created')
    expect(created.peak).toBe(4)
    expect(created.days[0]?.count).toBe(4)
    expect(created.days[0]?.intensity).toBe(4)
    expect(created.days[1]?.count).toBe(0)
    expect(created.days[9]?.count).toBe(0)

    const completed = buildMonthHistogram(events, 2026, 7, 'completed')
    expect(completed.mode).toBe('completed')
    expect(completed.peak).toBe(4)
    expect(completed.days[0]?.count).toBe(0)
    expect(completed.days[1]?.count).toBe(1)
    expect(completed.days[1]?.intensity).toBe(1)
    expect(completed.days[9]?.count).toBe(4)
    expect(completed.days[9]?.intensity).toBe(4)
  })

  it('returns lowest intensity for every day when the month has no events', () => {
    const histogram = buildMonthHistogram([], 2026, 2, 'completed')
    expect(histogram.mode).toBe('completed')
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
    expect(histogram.mode).toBe('activity')
    expect(histogram.peak).toBe(2)
    expect(histogram.days[4]?.intensity).toBe(4)
  })

  it('applies the selected mode when building from options', () => {
    const events = [
      event('2026-07-08T10:00:00.000Z', 'create'),
      event('2026-07-08T11:00:00.000Z', 'changeState', 't1', 'complete')
    ]
    const { forMonth } = useCalendarHistogram()
    expect(forMonth(2026, 7, { events, mode: 'created' }).days[7]?.count).toBe(1)
    expect(forMonth(2026, 7, { events, mode: 'completed' }).days[7]?.count).toBe(1)
    expect(forMonth(2026, 7, { events, mode: 'activity' }).days[7]?.count).toBe(2)
  })
})
