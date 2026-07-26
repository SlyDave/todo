import type { Task, TaskPriority, TaskState } from '../types/task'

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
