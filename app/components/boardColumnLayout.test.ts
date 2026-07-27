import { describe, expect, it } from 'vitest'
import {
  BOARD_COLUMN_FORBIDDEN_LIST_CLASSES,
  BOARD_COLUMN_LIST_CLASS,
  BOARD_COLUMN_LIST_WRAPPER_CLASS,
  BOARD_COLUMN_SECTION_CLASS,
  columnListUsesContentHeight
} from './boardColumnLayout'

describe('boardColumnLayout', () => {
  it('keeps an empty-column minimum height without forcing a tall empty column', () => {
    expect(BOARD_COLUMN_SECTION_CLASS.split(/\s+/)).toContain('min-h-40')
    expect(BOARD_COLUMN_LIST_WRAPPER_CLASS.split(/\s+/)).toContain('min-h-24')
    expect(BOARD_COLUMN_SECTION_CLASS).not.toMatch(/min-h-screen|h-screen|h-full/)
  })

  it('lets the task list grow with content instead of an absolute inner viewport', () => {
    expect(columnListUsesContentHeight(BOARD_COLUMN_LIST_CLASS)).toBe(true)
    expect(BOARD_COLUMN_LIST_CLASS.split(/\s+/)).not.toContain('absolute')
    expect(BOARD_COLUMN_LIST_CLASS.split(/\s+/)).not.toContain('inset-0')
  })

  it('rejects layout classes that clip cards to a fixed column viewport', () => {
    expect(columnListUsesContentHeight('absolute inset-0 flex flex-col')).toBe(false)
    expect(columnListUsesContentHeight('max-h-96 overflow-y-auto')).toBe(false)
    expect(BOARD_COLUMN_FORBIDDEN_LIST_CLASSES.length).toBeGreaterThan(0)
  })
})
