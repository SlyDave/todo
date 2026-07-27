/**
 * Nuxt UI Select content/item slots so option menus size to their labels
 * instead of clipping to the trigger width (`w-(--reka-select-trigger-width)`).
 */
export const SELECT_MENU_CONTENT_CLASS =
  'max-h-[min(15rem,var(--reka-select-content-available-height,15rem))] min-w-(--reka-select-trigger-width) w-max bg-default shadow-lg rounded-md ring ring-default overflow-hidden origin-(--reka-select-content-transform-origin) pointer-events-auto flex flex-col'

export const SELECT_MENU_ITEM_LABEL_CLASS = 'whitespace-nowrap'

export const SELECT_MENU_ITEM_WRAPPER_CLASS = 'flex flex-col w-max'

/** App-config `ui.select` override for full-text option menus. */
export const SELECT_MENU_UI = {
  slots: {
    content: SELECT_MENU_CONTENT_CLASS,
    itemLabel: SELECT_MENU_ITEM_LABEL_CLASS,
    itemWrapper: SELECT_MENU_ITEM_WRAPPER_CLASS
  }
} as const

export function selectMenuShowsFullOptionText(
  contentClass: string,
  itemLabelClass: string
): boolean {
  const boundOnlyToTrigger =
    contentClass.includes('w-(--reka-select-trigger-width)') &&
    !contentClass.includes('min-w-(--reka-select-trigger-width)') &&
    !contentClass.includes('w-max') &&
    !contentClass.includes('w-auto')
  const truncatesLabel = itemLabelClass.split(/\s+/).includes('truncate')
  return !boundOnlyToTrigger && !truncatesLabel
}
