import type { Task, TaskPriority, TaskState } from '../types/task'

/** Versioned localStorage key for the task board. */
export const TASKS_STORAGE_KEY = 'todo.tasks.v1'

const TASK_STATES: readonly TaskState[] = ['todo', 'inProgress', 'complete']
const TASK_PRIORITIES: readonly TaskPriority[] = ['low', 'medium', 'high']

export interface PersistedTasksV1 {
  version: 1
  tasks: Task[]
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isTaskState(value: unknown): value is TaskState {
  return typeof value === 'string' && (TASK_STATES as readonly string[]).includes(value)
}

function isTaskPriority(value: unknown): value is TaskPriority {
  return typeof value === 'string' && (TASK_PRIORITIES as readonly string[]).includes(value)
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === 'string'
}

function isNullableNumber(value: unknown): value is number | null {
  return value === null || (typeof value === 'number' && Number.isFinite(value))
}

/** Returns true when value matches a well-formed Task record. */
export function isTask(value: unknown): value is Task {
  if (!isRecord(value)) {
    return false
  }

  return (
    typeof value.id === 'string' &&
    value.id.length > 0 &&
    typeof value.title === 'string' &&
    typeof value.description === 'string' &&
    isTaskPriority(value.priority) &&
    isNullableString(value.dueDate) &&
    isNullableString(value.backgroundColour) &&
    isTaskState(value.state) &&
    isNullableNumber(value.manualOrder) &&
    typeof value.createdAt === 'string' &&
    typeof value.detailsModifiedAt === 'string' &&
    typeof value.stateChangedAt === 'string' &&
    isNullableString(value.deletedAt)
  )
}

function readStorage(storage?: Storage): Storage | null {
  if (storage) {
    return storage
  }
  if (typeof globalThis === 'undefined') {
    return null
  }
  try {
    const candidate = (globalThis as { localStorage?: Storage }).localStorage
    return candidate ?? null
  } catch {
    // Accessing localStorage can throw in privacy modes.
    return null
  }
}

/**
 * Parses a persisted payload into well-formed tasks only.
 * Missing, unreadable, or wholly invalid data yields an empty list.
 * Individual corrupt entries are skipped; they never throw.
 */
export function parsePersistedTasks(raw: string | null): Task[] {
  if (raw === null || raw.trim() === '') {
    return []
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(raw) as unknown
  } catch {
    return []
  }

  let candidates: unknown[]

  if (Array.isArray(parsed)) {
    candidates = parsed
  } else if (isRecord(parsed) && parsed.version === 1 && Array.isArray(parsed.tasks)) {
    candidates = parsed.tasks
  } else {
    return []
  }

  return candidates.filter(isTask)
}

/** Serialises tasks into the versioned persistence envelope. */
export function serializeTasks(tasks: Task[]): string {
  const payload: PersistedTasksV1 = {
    version: 1,
    tasks
  }
  return JSON.stringify(payload)
}

/**
 * Loads tasks from local storage.
 * Empty or corrupt storage returns [] and does not raise.
 */
export function loadTasks(storage?: Storage): Task[] {
  const store = readStorage(storage)
  if (!store) {
    return []
  }

  try {
    return parsePersistedTasks(store.getItem(TASKS_STORAGE_KEY))
  } catch {
    return []
  }
}

/**
 * Saves tasks to local storage under the versioned key.
 * No-ops when storage is unavailable (e.g. during SSR).
 */
export function saveTasks(tasks: Task[], storage?: Storage): void {
  const store = readStorage(storage)
  if (!store) {
    return
  }
  store.setItem(TASKS_STORAGE_KEY, serializeTasks(tasks))
}
