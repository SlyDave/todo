import type { Task } from '../types/task'
import { isNeedsActioned } from '../utils/task-domain'

/** Font Awesome Pro icon for the needs-actioned (stale) card indicator. */
export const NEEDS_ACTIONED_ICON: [prefix: 'fas', name: string] = ['fas', 'triangle-exclamation']

/**
 * British English hover / accessible warning when a task needs actioned.
 * Stakeholder phrasing is intentional.
 */
export const NEEDS_ACTIONED_WARNING = 'This task needs actioned'

/**
 * Whether the card should show the stale indicator.
 * Delegates thresholds to the domain helper — do not reimplement here.
 */
export function showNeedsActionedIndicator(task: Task, now?: string): boolean {
  return isNeedsActioned(task, now)
}
