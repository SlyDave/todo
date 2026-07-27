import { describe, expect, it } from 'vitest'
import {
  SELECT_MENU_CONTENT_CLASS,
  SELECT_MENU_ITEM_LABEL_CLASS,
  SELECT_MENU_UI,
  selectMenuShowsFullOptionText
} from './selectMenuUi'

describe('selectMenuUi', () => {
  it('sizes the menu to option text rather than only the trigger width', () => {
    expect(SELECT_MENU_CONTENT_CLASS).toContain('min-w-(--reka-select-trigger-width)')
    expect(SELECT_MENU_CONTENT_CLASS).toContain('w-max')
    expect(SELECT_MENU_CONTENT_CLASS).not.toMatch(
      /(?:^|\s)w-\(--reka-select-trigger-width\)(?:\s|$)/
    )
  })

  it('does not truncate option labels', () => {
    expect(SELECT_MENU_ITEM_LABEL_CLASS.split(/\s+/)).not.toContain('truncate')
    expect(SELECT_MENU_ITEM_LABEL_CLASS).toContain('whitespace-nowrap')
  })

  it('exposes a select ui override and guards the full-text contract', () => {
    expect(SELECT_MENU_UI.slots.content).toBe(SELECT_MENU_CONTENT_CLASS)
    expect(
      selectMenuShowsFullOptionText(SELECT_MENU_CONTENT_CLASS, SELECT_MENU_ITEM_LABEL_CLASS)
    ).toBe(true)
    expect(
      selectMenuShowsFullOptionText('w-(--reka-select-trigger-width) bg-default', 'truncate')
    ).toBe(false)
  })
})
