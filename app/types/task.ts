/** Task board column / state. */
export type TaskState = 'todo' | 'inProgress' | 'complete'

/** Task priority. Medium is the default when unset at creation. */
export type TaskPriority = 'low' | 'medium' | 'high'

export type SortMode = 'default' | 'alphabetically' | 'dueDate' | 'priority'

export interface Task {
  id: string
  title: string
  description: string
  priority: TaskPriority
  dueDate: string | null
  backgroundColour: string | null
  state: TaskState
  /** Per-column manual rank; null means use the active sort mode. */
  manualOrder: number | null
  createdAt: string
  detailsModifiedAt: string
  stateChangedAt: string
  deletedAt: string | null
}

export type CalendarViewMode = 'activity' | 'created' | 'completed'

export type ActivityKind = 'create' | 'editDetails' | 'changeState' | 'restore' | 'softDelete'

export interface ActivityEvent {
  at: string
  kind: ActivityKind
  taskId: string
  /** Target column when `kind` is `changeState`; omitted for other kinds. */
  toState?: TaskState
}

/**
 * Five colour intensity stages for the monthly calendar histogram.
 * `0` is the lowest (empty / no activity); `4` is the brightest (peak day).
 */
export type HistogramIntensity = 0 | 1 | 2 | 3 | 4

/** One calendar day in a monthly histogram, ready for a contributions-style grid. */
export interface MonthDayCell {
  /** UTC calendar date as `YYYY-MM-DD`. */
  date: string
  /** Day of month, 1–31. */
  day: number
  /** Weekday for grid layout: `0` = Sunday … `6` = Saturday (UTC). */
  weekday: number
  /** Event count for this day in the active histogram mode. */
  count: number
  intensity: HistogramIntensity
}

/** Full month of histogram cells scaled to that month's peak day. */
export interface MonthHistogram {
  year: number
  /** Calendar month, 1–12. */
  month: number
  /** View mode used to derive counts and peak. */
  mode: CalendarViewMode
  /** Highest daily count in the month for `mode`; `0` when empty. */
  peak: number
  /** Contiguous days 1…N for the month (always navigable, even when empty). */
  days: MonthDayCell[]
}
