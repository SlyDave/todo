import { describe, expect, it } from 'vitest'
import type { ActivityEvent, MonthDayCell } from '../types/task'
import { useCalendarHistogram } from '../composables/useCalendarHistogram'
import { ACTIVITY_STORAGE_KEY, serializeActivity } from '../utils/activity-storage'
import {
  INTENSITY_SURFACE_CLASS,
  activityEventsForPaint,
  buildMonthGrid,
  dayCellAriaLabel,
  formatMonthLabel,
  shiftMonth,
  utcYearMonth
} from './calendarMonth'

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

describe('calendarMonth', () => {
  it('reads the UTC year and month from a date', () => {
    expect(utcYearMonth(new Date('2026-07-15T12:00:00.000Z'))).toEqual({
      year: 2026,
      month: 7
    })
    expect(utcYearMonth(new Date('2025-12-31T23:30:00.000Z'))).toEqual({
      year: 2025,
      month: 12
    })
  })

  it('shifts months across year boundaries', () => {
    expect(shiftMonth(2026, 1, -1)).toEqual({ year: 2025, month: 12 })
    expect(shiftMonth(2025, 12, 1)).toEqual({ year: 2026, month: 1 })
    expect(shiftMonth(2026, 7, -1)).toEqual({ year: 2026, month: 6 })
    expect(shiftMonth(2026, 7, 1)).toEqual({ year: 2026, month: 8 })
  })

  it('returns to the same month after navigating away and back', () => {
    const start = { year: 2026, month: 7 }
    const away = shiftMonth(start.year, start.month, 1)
    const back = shiftMonth(away.year, away.month, -1)
    expect(back).toEqual(start)
  })

  it('formats month labels in British English', () => {
    expect(formatMonthLabel(2026, 7)).toBe('July 2026')
    expect(formatMonthLabel(2024, 2)).toBe('February 2024')
  })

  it('pads the month grid to a Sunday-start week layout', () => {
    // 1 July 2026 is a Wednesday (weekday 3)
    const days: MonthDayCell[] = [
      { date: '2026-07-01', day: 1, weekday: 3, count: 2, intensity: 4 },
      { date: '2026-07-02', day: 2, weekday: 4, count: 0, intensity: 0 }
    ]
    const grid = buildMonthGrid(days)
    expect(grid.slice(0, 3)).toEqual([{ kind: 'pad' }, { kind: 'pad' }, { kind: 'pad' }])
    expect(grid[3]).toEqual({
      kind: 'day',
      date: '2026-07-01',
      day: 1,
      count: 2,
      intensity: 4
    })
    expect(grid.length % 7).toBe(0)
  })

  it('maps every intensity stage to a distinct surface class', () => {
    expect(INTENSITY_SURFACE_CLASS[0]).toContain('bg-muted')
    expect(INTENSITY_SURFACE_CLASS[4]).toContain('bg-emerald-500')
    const classes = [0, 1, 2, 3, 4].map(
      (stage) => INTENSITY_SURFACE_CLASS[stage as 0 | 1 | 2 | 3 | 4]
    )
    expect(new Set(classes).size).toBe(5)
  })

  it('builds British English aria-labels for day cells', () => {
    expect(dayCellAriaLabel('2026-07-01', 0)).toBe('Wednesday, 1 July 2026: no activity')
    expect(dayCellAriaLabel('2026-07-01', 1)).toBe('Wednesday, 1 July 2026: 1 event')
    expect(dayCellAriaLabel('2026-07-01', 3)).toBe('Wednesday, 1 July 2026: 3 events')
  })

  it('keeps day intensities consistent when returning to a month with stored events', () => {
    const events: ActivityEvent[] = [
      { at: '2026-07-01T08:00:00.000Z', kind: 'create', taskId: 't1' },
      { at: '2026-07-01T12:00:00.000Z', kind: 'editDetails', taskId: 't1' },
      { at: '2026-07-15T09:00:00.000Z', kind: 'create', taskId: 't2' },
      { at: '2026-08-02T10:00:00.000Z', kind: 'create', taskId: 't3' }
    ]
    const storage = createMemoryStorage({
      [ACTIVITY_STORAGE_KEY]: serializeActivity(events)
    })
    const { forMonth } = useCalendarHistogram()

    const julyFirst = forMonth(2026, 7, { storage })
    const august = forMonth(2026, 8, { storage })
    const julyAgain = forMonth(2026, 7, { storage })

    expect(august.month).toBe(8)
    expect(august.days.some((day) => day.count > 0)).toBe(true)
    expect(julyAgain.peak).toBe(julyFirst.peak)
    expect(julyAgain.days.map((day) => day.intensity)).toEqual(
      julyFirst.days.map((day) => day.intensity)
    )
    expect(julyAgain.days.map((day) => day.count)).toEqual(julyFirst.days.map((day) => day.count))
  })

  it('withholds stored activity from intensity paint until the client is ready', () => {
    const events: ActivityEvent[] = [
      { at: '2026-07-01T08:00:00.000Z', kind: 'create', taskId: 't1' }
    ]
    expect(activityEventsForPaint(false, events)).toEqual([])
    expect(activityEventsForPaint(true, events)).toEqual(events)
  })

  it('paints stored intensities only after client-ready gating (SSR first paint)', () => {
    const events: ActivityEvent[] = [
      { at: '2026-07-01T08:00:00.000Z', kind: 'create', taskId: 't1' },
      { at: '2026-07-01T12:00:00.000Z', kind: 'editDetails', taskId: 't1' }
    ]
    const { forMonth } = useCalendarHistogram()

    const beforeMount = forMonth(2026, 7, {
      events: activityEventsForPaint(false, events)
    })
    const afterMount = forMonth(2026, 7, {
      events: activityEventsForPaint(true, events)
    })

    expect(beforeMount.days.every((day) => day.intensity === 0)).toBe(true)
    expect(beforeMount.days.every((day) => day.count === 0)).toBe(true)
    expect(afterMount.days.some((day) => day.intensity > 0)).toBe(true)
    expect(afterMount.days.find((day) => day.date === '2026-07-01')?.count).toBe(2)
  })
})
