import type { ActivityEvent, MonthHistogram } from '../types/task'
import { loadActivity } from '../utils/activity-storage'
import { buildMonthHistogram } from '../utils/calendar-histogram'

export interface MonthHistogramOptions {
  storage?: Storage
  events?: readonly ActivityEvent[]
}

/**
 * Calendar histogram helpers for the monthly contributions-style grid.
 * Domain-only: counts and five intensity stages scaled to the month peak.
 */
export function useCalendarHistogram() {
  return {
    /**
     * Builds the histogram for a UTC year/month from persisted activity
     * (or an explicit event list for tests).
     */
    forMonth: (
      year: number,
      month: number,
      options: MonthHistogramOptions = {}
    ): MonthHistogram => {
      const events = options.events ?? loadActivity(options.storage)
      return buildMonthHistogram(events, year, month)
    }
  }
}
