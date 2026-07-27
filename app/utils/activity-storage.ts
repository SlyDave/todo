import type { ActivityEvent, ActivityKind, TaskState } from '../types/task'

/** Versioned localStorage key for calendar activity events. */
export const ACTIVITY_STORAGE_KEY = 'todo.activity.v1'

export interface PersistedActivityV1 {
  version: 1
  events: ActivityEvent[]
}

const ACTIVITY_KINDS: readonly ActivityKind[] = [
  'create',
  'editDetails',
  'changeState',
  'restore',
  'softDelete'
]

const TASK_STATES: readonly TaskState[] = ['todo', 'inProgress', 'complete']

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isActivityKind(value: unknown): value is ActivityKind {
  return typeof value === 'string' && (ACTIVITY_KINDS as readonly string[]).includes(value)
}

function isTaskState(value: unknown): value is TaskState {
  return typeof value === 'string' && (TASK_STATES as readonly string[]).includes(value)
}

/** Returns true when value matches a well-formed ActivityEvent. */
export function isActivityEvent(value: unknown): value is ActivityEvent {
  if (!isRecord(value)) {
    return false
  }

  if (
    typeof value.at !== 'string' ||
    value.at.length === 0 ||
    !isActivityKind(value.kind) ||
    typeof value.taskId !== 'string' ||
    value.taskId.length === 0
  ) {
    return false
  }

  if (value.toState !== undefined && !isTaskState(value.toState)) {
    return false
  }

  return true
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
    return null
  }
}

/**
 * Parses a persisted activity payload into well-formed events only.
 * Missing, unreadable, or wholly invalid data yields an empty list.
 */
export function parsePersistedActivity(raw: string | null): ActivityEvent[] {
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
  } else if (isRecord(parsed) && parsed.version === 1 && Array.isArray(parsed.events)) {
    candidates = parsed.events
  } else {
    return []
  }

  return candidates.filter(isActivityEvent)
}

/** Serialises activity events into the versioned persistence envelope. */
export function serializeActivity(events: ActivityEvent[]): string {
  const payload: PersistedActivityV1 = {
    version: 1,
    events
  }
  return JSON.stringify(payload)
}

/**
 * Loads activity events from local storage.
 * Empty or corrupt storage returns [] and does not raise.
 */
export function loadActivity(storage?: Storage): ActivityEvent[] {
  const store = readStorage(storage)
  if (!store) {
    return []
  }

  try {
    return parsePersistedActivity(store.getItem(ACTIVITY_STORAGE_KEY))
  } catch {
    return []
  }
}

/**
 * Saves activity events to local storage under the versioned key.
 * No-ops when storage is unavailable (e.g. during SSR).
 */
export function saveActivity(events: ActivityEvent[], storage?: Storage): void {
  const store = readStorage(storage)
  if (!store) {
    return
  }
  store.setItem(ACTIVITY_STORAGE_KEY, serializeActivity(events))
}

/** Appends one activity event and persists the full list. */
export function appendActivity(event: ActivityEvent, storage?: Storage): ActivityEvent[] {
  const next = [...loadActivity(storage), event]
  saveActivity(next, storage)
  return next
}
