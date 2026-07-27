import { describe, expect, it } from 'vitest'
import {
  TASK_FORM_BACKGROUND_COLOUR_LEGEND,
  TASK_FORM_CANCEL_LABEL,
  TASK_FORM_COLOUR_LABEL,
  TASK_FORM_CREATE_SUBMIT,
  TASK_FORM_CREATE_TITLE,
  TASK_FORM_DESCRIPTION_HINT,
  TASK_FORM_DESCRIPTION_LABEL,
  TASK_FORM_DESCRIPTION_PLACEHOLDER,
  TASK_FORM_DESCRIPTION_REQUIRED,
  TASK_FORM_DUE_DATE_HINT,
  TASK_FORM_DUE_DATE_LABEL,
  TASK_FORM_EDIT_SUBMIT,
  TASK_FORM_EDIT_TITLE,
  TASK_FORM_PRIORITY_HINT,
  TASK_FORM_PRIORITY_LABEL,
  TASK_FORM_TITLE_HINT,
  TASK_FORM_TITLE_LABEL,
  TASK_FORM_TITLE_PLACEHOLDER,
  TASK_FORM_USE_BACKGROUND_COLOUR,
  taskFormDialogTitle,
  taskFormSubmitLabel
} from './taskFormCopy'

/** User-facing form strings must never use American "color". */
const COLOUR_COPY = [
  TASK_FORM_BACKGROUND_COLOUR_LEGEND,
  TASK_FORM_USE_BACKGROUND_COLOUR,
  TASK_FORM_COLOUR_LABEL
] as const

describe('taskFormCopy', () => {
  it('uses British English colour spelling on colour field labels', () => {
    expect(TASK_FORM_BACKGROUND_COLOUR_LEGEND).toBe('Background colour')
    expect(TASK_FORM_USE_BACKGROUND_COLOUR).toBe('Use a background colour')
    expect(TASK_FORM_COLOUR_LABEL).toBe('Colour')

    for (const text of COLOUR_COPY) {
      expect(text.toLowerCase()).toContain('colour')
      expect(text.toLowerCase()).not.toMatch(/\bcolor\b/)
    }
  })

  it('uses CONTEXT.md field names for title, description, priority and due date', () => {
    expect(TASK_FORM_TITLE_LABEL).toBe('Title')
    expect(TASK_FORM_DESCRIPTION_LABEL).toBe('Description')
    expect(TASK_FORM_PRIORITY_LABEL).toBe('Priority')
    expect(TASK_FORM_DUE_DATE_LABEL).toBe('Due date')
  })

  it('exposes British English dialog chrome and helpers', () => {
    expect(taskFormDialogTitle('create')).toBe(TASK_FORM_CREATE_TITLE)
    expect(taskFormDialogTitle('edit')).toBe(TASK_FORM_EDIT_TITLE)
    expect(taskFormSubmitLabel('create')).toBe(TASK_FORM_CREATE_SUBMIT)
    expect(taskFormSubmitLabel('edit')).toBe(TASK_FORM_EDIT_SUBMIT)
    expect(TASK_FORM_CANCEL_LABEL).toBe('Cancel')
    expect(TASK_FORM_TITLE_HINT).toBe('Optional')
    expect(TASK_FORM_TITLE_PLACEHOLDER).toBe('Short label')
    expect(TASK_FORM_DESCRIPTION_PLACEHOLDER).toContain('Markdown')
    expect(TASK_FORM_DESCRIPTION_HINT).toContain('Required')
    expect(TASK_FORM_DESCRIPTION_REQUIRED).toBe('Description is required.')
    expect(TASK_FORM_PRIORITY_HINT).toContain('Medium')
    expect(TASK_FORM_DUE_DATE_HINT).toBe('Optional')
  })
})
