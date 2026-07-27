import type { TaskPriority } from '../types/task'

/** Font Awesome Pro icon name for each priority (library already registered). */
export const PRIORITY_ICON: Record<TaskPriority, [prefix: 'fas', name: string]> = {
  low: ['fas', 'chevron-down'],
  medium: ['fas', 'minus'],
  high: ['fas', 'chevron-up']
}

/** Accessible British English labels for priority icons. */
export const PRIORITY_LABEL: Record<TaskPriority, string> = {
  low: 'Low priority',
  medium: 'Medium priority',
  high: 'High priority'
}

export const PRIORITY_OPTIONS: { value: TaskPriority; label: string }[] = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' }
]
