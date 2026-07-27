import { describe, expect, it } from 'vitest'
import { COLUMN_HEADINGS } from './boardColumns'
import {
  BOARD_ADD_TASK_LABEL,
  BOARD_COLUMN_EMPTY,
  BOARD_REGION_LABEL,
  BOARD_SAVE_ERROR,
  DOCUMENT_DESCRIPTION,
  DOCUMENT_TITLE,
  PAGE_HEADING,
  PAGE_INTRO,
  boardColumnCountLabel
} from './boardCopy'
import { NEEDS_ACTIONED_WARNING } from './taskNeedsActioned'
import {
  SOFT_DELETE_CANCEL_LABEL,
  SOFT_DELETE_CONFIRM_LABEL,
  SOFT_DELETE_CONFIRM_TITLE
} from './softDeleteConfirm'
import {
  TASK_RECOVERY_CLOSE_LABEL,
  TASK_RECOVERY_EMPTY_MESSAGE,
  TASK_RECOVERY_OPEN_LABEL,
  TASK_RECOVERY_RESTORE_LABEL,
  TASK_RECOVERY_TITLE
} from './taskRecovery'
import { themeToggleLabel } from './themeMode'

describe('boardCopy', () => {
  it('exposes British English board chrome', () => {
    expect(BOARD_ADD_TASK_LABEL).toBe('Add task')
    expect(BOARD_REGION_LABEL).toBe('Task board')
    expect(BOARD_COLUMN_EMPTY).toBe('No tasks')
    expect(BOARD_SAVE_ERROR).toContain('Please try again')
    expect(PAGE_HEADING).toBe('To-Do')
    expect(PAGE_INTRO).toContain('ToDo')
    expect(PAGE_INTRO).toContain('InProgress')
    expect(PAGE_INTRO).toContain('Complete')
    expect(DOCUMENT_TITLE).toBe('To-Do')
    expect(DOCUMENT_DESCRIPTION).toContain('to-do')
  })

  it('formats column metric counts in British English', () => {
    expect(boardColumnCountLabel(0)).toBe('0 tasks')
    expect(boardColumnCountLabel(1)).toBe('1 task')
    expect(boardColumnCountLabel(3)).toBe('3 tasks')
  })

  it('keeps CONTEXT.md column headings', () => {
    expect(COLUMN_HEADINGS.todo).toBe('ToDo')
    expect(COLUMN_HEADINGS.inProgress).toBe('InProgress')
    expect(COLUMN_HEADINGS.complete).toBe('Complete')
  })

  it('locks primary-surface domain phrases already shipped', () => {
    expect(NEEDS_ACTIONED_WARNING).toBe('This task needs actioned')
    expect(SOFT_DELETE_CONFIRM_TITLE).toContain('Soft-delete')
    expect(SOFT_DELETE_CONFIRM_LABEL).toBe('Soft-delete')
    expect(SOFT_DELETE_CANCEL_LABEL).toBe('Cancel')
    expect(TASK_RECOVERY_TITLE).toBe('Recoverable tasks')
    expect(TASK_RECOVERY_OPEN_LABEL).toBe('Recover tasks')
    expect(TASK_RECOVERY_RESTORE_LABEL).toBe('Restore')
    expect(TASK_RECOVERY_CLOSE_LABEL).toBe('Close')
    expect(TASK_RECOVERY_EMPTY_MESSAGE.toLowerCase()).toContain('recoverable')
    expect(themeToggleLabel('light')).toBe('Switch to dark mode')
    expect(themeToggleLabel('dark')).toBe('Switch to light mode')
  })

  it('never uses American color spelling in board or page copy', () => {
    const strings = [
      BOARD_ADD_TASK_LABEL,
      BOARD_REGION_LABEL,
      BOARD_COLUMN_EMPTY,
      BOARD_SAVE_ERROR,
      PAGE_HEADING,
      PAGE_INTRO,
      DOCUMENT_TITLE,
      DOCUMENT_DESCRIPTION,
      boardColumnCountLabel(2),
      NEEDS_ACTIONED_WARNING,
      SOFT_DELETE_CONFIRM_TITLE,
      TASK_RECOVERY_EMPTY_MESSAGE
    ]
    for (const text of strings) {
      expect(text.toLowerCase()).not.toMatch(/\bcolor\b/)
    }
  })
})
