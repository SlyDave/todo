import type { ActivityEvent, HistogramIntensity, MonthDayCell, MonthHistogram } from '../types/task'

export class CalendarHistogramError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'CalendarHistogramError'
  }
}

/** Number of days in a Gregorian calendar month (`month` is 1–12). */
export function daysInMonth(year: number, month: number): number {
  assertYearMonth(year, month)
  return new Date(Date.UTC(year, month, 0)).getUTCDate()
}

/**
 * Maps a daily count to one of five intensity stages relative to the month peak.
 * Empty days and empty months are stage `0`; the peak day is always stage `4`.
 */
export function intensityStage(count: number, peak: number): HistogramIntensity {
  if (!Number.isFinite(count) || count <= 0 || !Number.isFinite(peak) || peak <= 0) {
    return 0
  }

  const stage = Math.max(1, Math.ceil((count / peak) * 4))
  return Math.min(4, stage) as HistogramIntensity
}

/**
 * UTC calendar date key (`YYYY-MM-DD`) from an ISO-8601 timestamp.
 * Returns `null` when the timestamp is not parseable.
 */
export function activityDateKey(at: string): string | null {
  const ms = Date.parse(at)
  if (Number.isNaN(ms)) {
    return null
  }
  return new Date(ms).toISOString().slice(0, 10)
}

/**
 * Counts activity events per day for the given UTC year/month.
 * Events outside the month or with unparseable timestamps are ignored.
 */
export function countActivityByDay(
  events: readonly ActivityEvent[],
  year: number,
  month: number
): number[] {
  assertYearMonth(year, month)
  const length = daysInMonth(year, month)
  const counts = Array.from({ length }, () => 0)
  const prefix = `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-`

  for (const event of events) {
    const key = activityDateKey(event.at)
    if (key === null || !key.startsWith(prefix)) {
      continue
    }
    const day = Number(key.slice(8, 10))
    if (!Number.isInteger(day) || day < 1 || day > length) {
      continue
    }
    const index = day - 1
    const current = counts[index]
    if (current === undefined) {
      continue
    }
    counts[index] = current + 1
  }

  return counts
}

/**
 * Builds a navigable month histogram from activity events.
 * Intensity is scaled to the peak day in that month; an empty month yields
 * stage `0` for every day but still returns a full day list.
 */
export function buildMonthHistogram(
  events: readonly ActivityEvent[],
  year: number,
  month: number
): MonthHistogram {
  assertYearMonth(year, month)
  const counts = countActivityByDay(events, year, month)
  const peak = counts.reduce((max, count) => Math.max(max, count), 0)
  const days: MonthDayCell[] = counts.map((count, index) => {
    const day = index + 1
    const date = formatUtcDate(year, month, day)
    return {
      date,
      day,
      weekday: new Date(`${date}T00:00:00.000Z`).getUTCDay(),
      count,
      intensity: intensityStage(count, peak)
    }
  })

  return { year, month, peak, days }
}

function assertYearMonth(year: number, month: number): void {
  if (!Number.isInteger(year) || year < 1 || year > 9999) {
    throw new CalendarHistogramError('Year must be an integer from 1 to 9999.')
  }
  if (!Number.isInteger(month) || month < 1 || month > 12) {
    throw new CalendarHistogramError('Month must be an integer from 1 to 12.')
  }
}

function formatUtcDate(year: number, month: number, day: number): string {
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}
