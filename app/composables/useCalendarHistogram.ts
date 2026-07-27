import type { ActivityEvent, CalendarViewMode, MonthHistogram, YearHistogram } from '../types/task'
import { loadActivity } from '../utils/activity-storage'
import {
  activityDateKey,
  buildMonthHistogram,
  buildYearHistogram
} from '../utils/calendar-histogram'

export interface MonthHistogramOptions {
  storage?: Storage
  events?: readonly ActivityEvent[]
  /** Defaults to `activity` (all activity kinds). */
  mode?: CalendarViewMode
}

export interface YearHistogramOptions {
  storage?: Storage
  events?: readonly ActivityEvent[]
  /** Defaults to `activity` (all activity kinds). */
  mode?: CalendarViewMode
  /**
   * Inclusive UTC end date (`YYYY-MM-DD`). Defaults to today's UTC date
   * (or `now` when provided for tests).
   */
  endDate?: string
  /** Instant used only when `endDate` is omitted. */
  now?: Date
}

/**
 * Calendar histogram helpers for monthly and yearly contributions-style grids.
 * Domain-only: mode-filtered counts and five intensity stages scaled to the
 * selected mode's peak day in the viewed range.
 */
export function useCalendarHistogram() {
  return {
    /**
     * Builds the histogram for a UTC year/month from persisted activity
     * (or an explicit event list for tests), for the given view mode.
     */
    forMonth: (
      year: number,
      month: number,
      options: MonthHistogramOptions = {}
    ): MonthHistogram => {
      const events = options.events ?? loadActivity(options.storage)
      return buildMonthHistogram(events, year, month, options.mode ?? 'activity')
    },
    /**
     * Builds the rolling ~52-week yearly grid ending on `endDate` (default today UTC)
     * from persisted activity (or an explicit event list for tests).
     */
    forYear: (options: YearHistogramOptions = {}): YearHistogram => {
      const events = options.events ?? loadActivity(options.storage)
      const endDate =
        options.endDate ??
        activityDateKey((options.now ?? new Date()).toISOString()) ??
        new Date().toISOString().slice(0, 10)
      return buildYearHistogram(events, endDate, options.mode ?? 'activity')
    }
  }
}
