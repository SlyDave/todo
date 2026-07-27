import type {
  ActivityEvent,
  CalendarViewMode,
  HistogramIntensity,
  MonthDayCell,
  MonthHistogram,
  YearDayCell,
  YearHistogram
} from '../types/task'

/** Number of Monday-start week columns in the rolling yearly grid. */
export const YEAR_HISTOGRAM_WEEK_COUNT = 52

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

/** True when the event contributes to the given calendar view mode. */
export function eventMatchesMode(event: ActivityEvent, mode: CalendarViewMode): boolean {
  switch (mode) {
    case 'activity':
      return true
    case 'created':
      return event.kind === 'create'
    case 'completed':
      return event.kind === 'changeState' && event.toState === 'complete'
  }
}

/**
 * Counts matching activity events per day for the given UTC year/month and mode.
 * Events outside the month, for other modes, or with unparseable timestamps are ignored.
 */
export function countActivityByDay(
  events: readonly ActivityEvent[],
  year: number,
  month: number,
  mode: CalendarViewMode = 'activity'
): number[] {
  assertYearMonth(year, month)
  const length = daysInMonth(year, month)
  const counts = Array.from({ length }, () => 0)
  const prefix = `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-`

  for (const event of events) {
    if (!eventMatchesMode(event, mode)) {
      continue
    }
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
 * Builds a navigable month histogram from activity events for a view mode.
 * Intensity is scaled to the peak day in that month for the selected mode;
 * an empty month yields stage `0` for every day but still returns a full day list.
 */
export function buildMonthHistogram(
  events: readonly ActivityEvent[],
  year: number,
  month: number,
  mode: CalendarViewMode = 'activity'
): MonthHistogram {
  assertYearMonth(year, month)
  const counts = countActivityByDay(events, year, month, mode)
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

  return { year, month, mode, peak, days }
}

/**
 * UTC Monday on or before the given UTC calendar date (`YYYY-MM-DD`).
 * Week rows are Monday-first (ISO-style).
 */
export function mondayOnOrBefore(dateKey: string): string {
  const ms = parseUtcDateKey(dateKey)
  const day = new Date(ms)
  const sundayBased = day.getUTCDay()
  const daysFromMonday = sundayBased === 0 ? 6 : sundayBased - 1
  day.setUTCDate(day.getUTCDate() - daysFromMonday)
  return day.toISOString().slice(0, 10)
}

/**
 * Counts matching activity events per UTC day key for a mode.
 * Events for other modes or with unparseable timestamps are ignored.
 */
export function countActivityByDateKey(
  events: readonly ActivityEvent[],
  mode: CalendarViewMode = 'activity'
): Map<string, number> {
  const counts = new Map<string, number>()
  for (const event of events) {
    if (!eventMatchesMode(event, mode)) {
      continue
    }
    const key = activityDateKey(event.at)
    if (key === null) {
      continue
    }
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  return counts
}

/**
 * Builds a rolling ~52-week contribution grid ending on `endDate` (UTC).
 * Last column is the week containing `endDate`; last in-range cell is `endDate`.
 * Days after `endDate` in that week are included as out-of-range padding.
 * Intensity is scaled to the peak in-range day in the window for `mode`.
 */
export function buildYearHistogram(
  events: readonly ActivityEvent[],
  endDate: string,
  mode: CalendarViewMode = 'activity'
): YearHistogram {
  const endKey = assertUtcDateKey(endDate)
  const endMonday = mondayOnOrBefore(endKey)
  const startMonday = addUtcDays(endMonday, -(YEAR_HISTOGRAM_WEEK_COUNT - 1) * 7)
  const countsByDay = countActivityByDateKey(events, mode)

  let peak = 0
  for (let weekIndex = 0; weekIndex < YEAR_HISTOGRAM_WEEK_COUNT; weekIndex++) {
    for (let weekRow = 0; weekRow < 7; weekRow++) {
      const date = addUtcDays(startMonday, weekIndex * 7 + weekRow)
      if (date > endKey) {
        continue
      }
      const count = countsByDay.get(date) ?? 0
      if (count > peak) {
        peak = count
      }
    }
  }

  const days: YearDayCell[] = []
  for (let weekIndex = 0; weekIndex < YEAR_HISTOGRAM_WEEK_COUNT; weekIndex++) {
    for (let weekRow = 0; weekRow < 7; weekRow++) {
      const date = addUtcDays(startMonday, weekIndex * 7 + weekRow)
      const inRange = date <= endKey
      const count = inRange ? (countsByDay.get(date) ?? 0) : 0
      days.push({
        date,
        weekRow,
        weekIndex,
        count,
        intensity: inRange ? intensityStage(count, peak) : 0,
        inRange
      })
    }
  }

  return {
    endDate: endKey,
    startDate: startMonday,
    weekCount: YEAR_HISTOGRAM_WEEK_COUNT,
    mode,
    peak,
    days
  }
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

function assertUtcDateKey(dateKey: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) {
    throw new CalendarHistogramError('Date must be a UTC calendar key YYYY-MM-DD.')
  }
  const ms = Date.parse(`${dateKey}T00:00:00.000Z`)
  if (Number.isNaN(ms) || new Date(ms).toISOString().slice(0, 10) !== dateKey) {
    throw new CalendarHistogramError('Date must be a real UTC calendar day.')
  }
  return dateKey
}

function parseUtcDateKey(dateKey: string): number {
  return Date.parse(`${assertUtcDateKey(dateKey)}T00:00:00.000Z`)
}

function addUtcDays(dateKey: string, days: number): string {
  const day = new Date(parseUtcDateKey(dateKey))
  day.setUTCDate(day.getUTCDate() + days)
  return day.toISOString().slice(0, 10)
}
