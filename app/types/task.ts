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
}
