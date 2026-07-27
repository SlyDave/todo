/** British English tooltip / accessible names for card icon actions. */
export const TASK_CARD_EDIT_LABEL = 'Edit'
export const TASK_CARD_DELETE_LABEL = 'Delete'

export const TASK_CARD_EDIT_ICON: [prefix: 'fas', name: string] = ['fas', 'pen']
export const TASK_CARD_DELETE_ICON: [prefix: 'fas', name: string] = ['fas', 'trash']

export function taskCardEditAriaLabel(heading: string | null): string {
  return heading !== null ? `${TASK_CARD_EDIT_LABEL} ${heading}` : `${TASK_CARD_EDIT_LABEL} task`
}

export function taskCardDeleteAriaLabel(heading: string | null): string {
  return heading !== null
    ? `${TASK_CARD_DELETE_LABEL} ${heading}`
    : `${TASK_CARD_DELETE_LABEL} task`
}
