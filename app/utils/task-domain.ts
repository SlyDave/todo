import type { ActivityEvent, ActivityKind, Task, TaskPriority, TaskState } from '../types/task'

/** Soft-deleted tasks remain recoverable for this many days. */
export const SOFT_DELETE_RETENTION_DAYS = 30

const MS_PER_DAY = 24 * 60 * 60 * 1000
export const SOFT_DELETE_RETENTION_MS = SOFT_DELETE_RETENTION_DAYS * MS_PER_DAY

/** Input for creating a new task in the ToDo column. */
export interface CreateTaskInput {
  title?: string
  description: string
  priority?: TaskPriority
  dueDate?: string | null
  backgroundColour?: string | null
}

/** Patch for details-only edits (never changes column/state). */
export interface TaskDetailsPatch {
  title?: string
  description?: string
  priority?: TaskPriority
  dueDate?: string | null
  backgroundColour?: string | null
}

export class TaskValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'TaskValidationError'
  }
}

function assertDescription(description: unknown): asserts description is string {
  if (typeof description !== 'string' || description.trim() === '') {
    throw new TaskValidationError('Description is required.')
  }
}

function resolveNow(now?: string): string {
  return now ?? new Date().toISOString()
}

function assertActive(task: Task): void {
  if (task.deletedAt !== null) {
    throw new TaskValidationError('Task is soft-deleted.')
  }
}

/**
 * True when the task is soft-deleted and still inside the recovery window.
 */
export function isRecoverable(task: Task, now?: string): boolean {
  if (task.deletedAt === null) {
    return false
  }

  const deletedMs = Date.parse(task.deletedAt)
  const nowMs = Date.parse(resolveNow(now))
  if (Number.isNaN(deletedMs) || Number.isNaN(nowMs)) {
    return false
  }

  return nowMs - deletedMs <= SOFT_DELETE_RETENTION_MS
}

/** Builds a calendar activity event for the given kind and task. */
export function createActivityEvent(
  kind: ActivityKind,
  taskId: string,
  now?: string
): ActivityEvent {
  return {
    at: resolveNow(now),
    kind,
    taskId
  }
}

/**
 * Creates a task in ToDo with created, details last modified, and state last
 * changed all set to the same instant.
 */
export function createTask(
  input: CreateTaskInput,
  options: { now?: string; id?: string } = {}
): Task {
  assertDescription(input.description)
  const now = resolveNow(options.now)

  return {
    id: options.id ?? crypto.randomUUID(),
    title: input.title ?? '',
    description: input.description,
    priority: input.priority ?? 'medium',
    dueDate: input.dueDate ?? null,
    backgroundColour: input.backgroundColour ?? null,
    state: 'todo',
    manualOrder: null,
    createdAt: now,
    detailsModifiedAt: now,
    stateChangedAt: now,
    deletedAt: null
  }
}

/**
 * Moves a task to another column. Updates state last changed only.
 * A no-op (same column) returns the original task reference unchanged.
 */
export function changeTaskState(task: Task, state: TaskState, now?: string): Task {
  assertActive(task)
  if (task.state === state) {
    return task
  }

  return {
    ...task,
    state,
    stateChangedAt: resolveNow(now)
  }
}

/**
 * Applies a details-only edit. Updates details last modified only;
 * state last changed is left untouched.
 */
export function updateTaskDetails(task: Task, patch: TaskDetailsPatch, now?: string): Task {
  assertActive(task)
  if (patch.description !== undefined) {
    assertDescription(patch.description)
  }

  return {
    ...task,
    ...(patch.title !== undefined ? { title: patch.title } : {}),
    ...(patch.description !== undefined ? { description: patch.description } : {}),
    ...(patch.priority !== undefined ? { priority: patch.priority } : {}),
    ...(patch.dueDate !== undefined ? { dueDate: patch.dueDate } : {}),
    ...(patch.backgroundColour !== undefined ? { backgroundColour: patch.backgroundColour } : {}),
    detailsModifiedAt: resolveNow(now)
  }
}

/**
 * Soft-deletes an active task. Leaves column and fields intact for restore.
 * Sets deletedAt to the given instant.
 */
export function softDeleteTask(task: Task, now?: string): Task {
  assertActive(task)

  return {
    ...task,
    deletedAt: resolveNow(now)
  }
}

/**
 * Restores a recoverable soft-deleted task to the board with fields intact.
 * Throws when the task is not soft-deleted or the recovery window has expired.
 */
export function restoreTask(task: Task, now?: string): Task {
  if (task.deletedAt === null) {
    throw new TaskValidationError('Task is not soft-deleted.')
  }

  if (!isRecoverable(task, now)) {
    throw new TaskValidationError('Soft-deleted task is no longer recoverable.')
  }

  return {
    ...task,
    deletedAt: null
  }
}

/**
 * Removes soft-deleted tasks whose recovery window has expired.
 * Recoverable and active tasks are kept unchanged.
 */
export function purgeExpiredSoftDeletes(tasks: Task[], now?: string): Task[] {
  const instant = resolveNow(now)
  return tasks.filter((task) => task.deletedAt === null || isRecoverable(task, instant))
}
