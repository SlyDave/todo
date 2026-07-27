import type { HistogramIntensity, MonthDayCell } from '../types/task'

/** UTC calendar year and month (month is 1–12). */
export interface YearMonth {
  year: number
  month: number
}

/** One cell in the contributions-style month grid (leading/trailing pads are empty). */
export type MonthGridCell =
  | { kind: 'pad' }
  | {
      kind: 'day'
      date: string
      day: number
      count: number
      intensity: HistogramIntensity
    }

/** Short weekday headers aligned with `MonthDayCell.weekday` (0 = Sunday). */
export const WEEKDAY_HEADERS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const

/** Tailwind classes for the five histogram intensity stages (light and dark). */
export const INTENSITY_SURFACE_CLASS: Record<HistogramIntensity, string> = {
  0: 'bg-muted',
  1: 'bg-emerald-200 dark:bg-emerald-900',
  2: 'bg-emerald-300 dark:bg-emerald-700',
  3: 'bg-emerald-400 dark:bg-emerald-600',
  4: 'bg-emerald-500 dark:bg-emerald-500'
}

/** UTC year/month for `date` (defaults to now). */
export function utcYearMonth(date: Date = new Date()): YearMonth {
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1
  }
}

/**
 * Shifts a UTC calendar month by `delta` months (negative = earlier).
 * Year boundaries are handled via UTC date arithmetic.
 */
export function shiftMonth(year: number, month: number, delta: number): YearMonth {
  const shifted = new Date(Date.UTC(year, month - 1 + delta, 1))
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1
  }
}

/** British English month heading, e.g. `July 2026`, for a UTC year/month. */
export function formatMonthLabel(year: number, month: number): string {
  return new Intl.DateTimeFormat('en-GB', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC'
  }).format(new Date(Date.UTC(year, month - 1, 1)))
}

/**
 * Builds a Sunday-start grid from histogram day cells, with pad cells so day 1
 * lands on its weekday and the final week is completed.
 */
export function buildMonthGrid(days: readonly MonthDayCell[]): MonthGridCell[] {
  const first = days[0]
  if (first === undefined) {
    return []
  }

  const cells: MonthGridCell[] = []
  for (let i = 0; i < first.weekday; i += 1) {
    cells.push({ kind: 'pad' })
  }

  for (const day of days) {
    cells.push({
      kind: 'day',
      date: day.date,
      day: day.day,
      count: day.count,
      intensity: day.intensity
    })
  }

  const trailing = (7 - (cells.length % 7)) % 7
  for (let i = 0; i < trailing; i += 1) {
    cells.push({ kind: 'pad' })
  }

  return cells
}

/** Accessible label for a day cell (British English). */
export function dayCellAriaLabel(date: string, count: number): string {
  const ms = Date.parse(`${date}T00:00:00.000Z`)
  const dateLabel = Number.isNaN(ms)
    ? date
    : new Intl.DateTimeFormat('en-GB', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        timeZone: 'UTC'
      }).format(new Date(ms))

  if (count === 0) {
    return `${dateLabel}: no activity`
  }
  if (count === 1) {
    return `${dateLabel}: 1 event`
  }
  return `${dateLabel}: ${String(count)} events`
}
