import type { ActivityEvent, CalendarViewMode, MonthHistogram } from '../types/task'
import { loadActivity } from '../utils/activity-storage'
import { buildMonthHistogram } from '../utils/calendar-histogram'

export interface MonthHistogramOptions {
  storage?: Storage
  events?: readonly ActivityEvent[]
  /** Defaults to `activity` (all activity kinds). */
  mode?: CalendarViewMode
}

/**
 * Calendar histogram helpers for the monthly contributions-style grid.
 * Domain-only: mode-filtered counts and five intensity stages scaled to the
 * selected mode's peak day in the month.
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
    }
  }
}
