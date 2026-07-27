/**
 * Column layout classes. Content drives height — the task list must stay in
 * normal document flow so cards never clip inside a fixed inner viewport.
 */
export const BOARD_COLUMN_SECTION_CLASS =
  'flex min-h-40 flex-col rounded-lg border border-default bg-elevated/50 p-4'

/** Empty-column minimum; grows with tasks (no max-height, no absolute fill). */
export const BOARD_COLUMN_LIST_WRAPPER_CLASS = 'mt-3 min-h-24'

export const BOARD_COLUMN_LIST_CLASS = 'flex list-none flex-col gap-2 p-0'

/** Classes that would clip or detach the list from content-driven height. */
export const BOARD_COLUMN_FORBIDDEN_LIST_CLASSES = [
  'absolute',
  'inset-0',
  'max-h-',
  'overflow-y-'
] as const

export function columnListUsesContentHeight(listClass: string): boolean {
  return !BOARD_COLUMN_FORBIDDEN_LIST_CLASSES.some((forbidden) => listClass.includes(forbidden))
}
