import { describe, expect, it } from 'vitest'
import type { ActivityEvent, YearDayCell } from '../types/task'
import { useCalendarHistogram } from '../composables/useCalendarHistogram'
import { YEAR_HISTOGRAM_WEEK_COUNT } from '../utils/calendar-histogram'
import { activityEventsForPaint } from './calendarMonth'
import {
  CALENDAR_MODE_OPTIONS,
  YEAR_WEEKDAY_HEADERS,
  buildYearMonthHeaders,
  formatShortMonthUtc,
  groupYearDaysByWeek
} from './calendarYear'

function cell(
  partial: Pick<YearDayCell, 'date' | 'weekRow' | 'weekIndex'> & Partial<YearDayCell>
): YearDayCell {
  return {
    count: 0,
    intensity: 0,
    inRange: true,
    ...partial
  }
}

describe('calendarYear', () => {
  it('lists Monday-first weekday headers', () => {
    expect(YEAR_WEEKDAY_HEADERS).toEqual(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'])
  })

  it('exposes activity, created and completed modes', () => {
    expect(CALENDAR_MODE_OPTIONS.map((option) => option.value)).toEqual([
      'activity',
      'created',
      'completed'
    ])
  })

  it('groups column-major days into week columns ordered Mon–Sun', () => {
    const days: YearDayCell[] = [
      cell({ date: '2026-07-27', weekRow: 0, weekIndex: 0 }),
      cell({ date: '2026-07-28', weekRow: 1, weekIndex: 0 }),
      cell({ date: '2026-08-03', weekRow: 0, weekIndex: 1 })
    ]
    const weeks = groupYearDaysByWeek(days, 2)
    expect(weeks).toHaveLength(2)
    expect(weeks[0]?.[0]?.date).toBe('2026-07-27')
    expect(weeks[0]?.[1]?.date).toBe('2026-07-28')
    expect(weeks[1]?.[0]?.date).toBe('2026-08-03')
  })

  it('emits a month header when the Monday month changes', () => {
    const weeks: YearDayCell[][] = [
      [cell({ date: '2026-06-29', weekRow: 0, weekIndex: 0 })],
      [cell({ date: '2026-07-06', weekRow: 0, weekIndex: 1 })],
      [cell({ date: '2026-07-13', weekRow: 0, weekIndex: 2 })]
    ]
    expect(buildYearMonthHeaders(weeks)).toEqual(['Jun', 'Jul', null])
  })

  it('formats short British English month labels in UTC', () => {
    expect(formatShortMonthUtc('2026-07-01')).toBe('Jul')
    expect(formatShortMonthUtc('2026-01-15')).toBe('Jan')
  })

  it('keeps the last week column as the current week ending on endDate', () => {
    const { forYear } = useCalendarHistogram()
    const histogram = forYear({ events: [], endDate: '2026-07-29' })
    expect(histogram.weekCount).toBe(YEAR_HISTOGRAM_WEEK_COUNT)
    const lastWeek = groupYearDaysByWeek(histogram.days, histogram.weekCount).at(-1)
    expect(lastWeek).toBeDefined()
    expect(lastWeek?.some((day) => day.date === '2026-07-29' && day.inRange)).toBe(true)
    expect(lastWeek?.[0]?.weekIndex).toBe(YEAR_HISTOGRAM_WEEK_COUNT - 1)
  })

  it('updates intensities when switching activity, created and completed modes', () => {
    const events: ActivityEvent[] = [
      { at: '2026-07-20T08:00:00.000Z', kind: 'create', taskId: 't1' },
      {
        at: '2026-07-21T09:00:00.000Z',
        kind: 'changeState',
        taskId: 't1',
        toState: 'complete'
      },
      { at: '2026-07-22T10:00:00.000Z', kind: 'editDetails', taskId: 't1' }
    ]
    const { forYear } = useCalendarHistogram()
    const activity = forYear({ events, endDate: '2026-07-29', mode: 'activity' })
    const created = forYear({ events, endDate: '2026-07-29', mode: 'created' })
    const completed = forYear({ events, endDate: '2026-07-29', mode: 'completed' })

    expect(activity.days.find((day) => day.date === '2026-07-20')?.count).toBe(1)
    expect(activity.days.find((day) => day.date === '2026-07-21')?.count).toBe(1)
    expect(activity.days.find((day) => day.date === '2026-07-22')?.count).toBe(1)

    expect(created.days.find((day) => day.date === '2026-07-20')?.count).toBe(1)
    expect(created.days.find((day) => day.date === '2026-07-21')?.count).toBe(0)
    expect(created.days.find((day) => day.date === '2026-07-22')?.count).toBe(0)

    expect(completed.days.find((day) => day.date === '2026-07-20')?.count).toBe(0)
    expect(completed.days.find((day) => day.date === '2026-07-21')?.count).toBe(1)
    expect(completed.days.find((day) => day.date === '2026-07-22')?.count).toBe(0)
  })

  it('withholds stored activity from yearly intensity paint until the client is ready', () => {
    const events: ActivityEvent[] = [
      { at: '2026-07-20T08:00:00.000Z', kind: 'create', taskId: 't1' }
    ]
    const { forYear } = useCalendarHistogram()
    const beforeMount = forYear({
      events: activityEventsForPaint(false, events),
      endDate: '2026-07-29'
    })
    const afterMount = forYear({
      events: activityEventsForPaint(true, events),
      endDate: '2026-07-29'
    })

    expect(beforeMount.days.every((day) => day.intensity === 0)).toBe(true)
    expect(afterMount.days.some((day) => day.intensity > 0)).toBe(true)
  })
})
