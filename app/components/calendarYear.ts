import type { CalendarViewMode, YearDayCell } from '../types/task'

/** Monday-first weekday labels aligned with `YearDayCell.weekRow` (0 = Monday). */
export const YEAR_WEEKDAY_HEADERS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const

/** British English labels for calendar view modes (CONTEXT.md). */
export const CALENDAR_MODE_OPTIONS: ReadonlyArray<{
  value: CalendarViewMode
  label: string
}> = [
  { value: 'activity', label: 'Activity' },
  { value: 'created', label: 'Created' },
  { value: 'completed', label: 'Completed' }
]

/** Accessible name for the mode control. */
export const CALENDAR_MODE_LABEL = 'Calendar view'

/** Section heading for the yearly activity calendar. */
export const CALENDAR_YEAR_HEADING = 'Activity calendar'

/**
 * Compact cell surface size so seven rows fit roughly an empty column height
 * (`BoardColumn` min-h-40 section budget).
 */
export const YEAR_CELL_CLASS = 'size-2.5 rounded-sm sm:size-3'

/** Gap between week columns and day rows in the compact grid. */
export const YEAR_GRID_GAP_CLASS = 'gap-0.5'

/**
 * Groups column-major `YearDayCell`s into week columns (length = weekCount).
 * Each column is seven cells ordered Monday → Sunday.
 */
export function groupYearDaysByWeek(
  days: readonly YearDayCell[],
  weekCount: number
): YearDayCell[][] {
  const weeks: YearDayCell[][] = Array.from({ length: weekCount }, () => [])
  for (const day of days) {
    const column = weeks[day.weekIndex]
    if (column === undefined) {
      continue
    }
    column[day.weekRow] = day
  }
  return weeks
}

/**
 * Month header per week column: short British English month when the week's
 * Monday starts a new calendar month; otherwise `null` (spacer).
 */
export function buildYearMonthHeaders(
  weeks: readonly (readonly YearDayCell[])[]
): (string | null)[] {
  const headers: (string | null)[] = []
  let previousMonth: number | null = null

  for (const week of weeks) {
    const monday = week[0]
    if (monday === undefined) {
      headers.push(null)
      continue
    }
    const month = Number(monday.date.slice(5, 7))
    if (!Number.isInteger(month) || month < 1 || month > 12) {
      headers.push(null)
      continue
    }
    if (previousMonth === month) {
      headers.push(null)
    } else {
      headers.push(formatShortMonthUtc(monday.date))
      previousMonth = month
    }
  }

  return headers
}

/** Short UTC month label, e.g. `Jul`, for a `YYYY-MM-DD` key. */
export function formatShortMonthUtc(dateKey: string): string {
  const ms = Date.parse(`${dateKey}T00:00:00.000Z`)
  if (Number.isNaN(ms)) {
    return dateKey.slice(5, 7)
  }
  return new Intl.DateTimeFormat('en-GB', {
    month: 'short',
    timeZone: 'UTC'
  }).format(new Date(ms))
}
