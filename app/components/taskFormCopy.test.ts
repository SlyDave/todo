import { describe, expect, it } from 'vitest'
import { DESCRIPTION_MAX_LENGTH, TITLE_MAX_LENGTH } from '../utils/task-domain'
import {
  TASK_FORM_BACKGROUND_COLOUR_LABEL,
  TASK_FORM_CANCEL_LABEL,
  TASK_FORM_COLOUR_CUSTOM_LABEL,
  TASK_FORM_COLOUR_LABEL,
  TASK_FORM_COLOUR_NONE_LABEL,
  TASK_FORM_CREATE_SUBMIT,
  TASK_FORM_CREATE_TITLE,
  TASK_FORM_DESCRIPTION_LABEL,
  TASK_FORM_DESCRIPTION_PLACEHOLDER,
  TASK_FORM_DESCRIPTION_REQUIRED,
  TASK_FORM_DUE_DATE_LABEL,
  TASK_FORM_EDIT_SUBMIT,
  TASK_FORM_EDIT_TITLE,
  TASK_FORM_PRIORITY_LABEL,
  TASK_FORM_TITLE_LABEL,
  TASK_FORM_TITLE_PLACEHOLDER,
  taskFormDialogTitle,
  taskFormSubmitLabel
} from './taskFormCopy'
import { taskFormCanSubmit } from './taskFormSubmit'

/** User-facing form strings must never use American "color". */
const COLOUR_COPY = [
  TASK_FORM_BACKGROUND_COLOUR_LABEL,
  TASK_FORM_COLOUR_CUSTOM_LABEL,
  TASK_FORM_COLOUR_LABEL
] as const

describe('taskFormCopy', () => {
  it('uses British English colour spelling on colour field labels', () => {
    expect(TASK_FORM_BACKGROUND_COLOUR_LABEL).toBe('Background colour')
    expect(TASK_FORM_COLOUR_NONE_LABEL).toBe('None')
    expect(TASK_FORM_COLOUR_CUSTOM_LABEL).toBe('Custom colour')
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

  it('exposes British English dialog chrome without Optional or Required helpers', () => {
    expect(taskFormDialogTitle('create')).toBe(TASK_FORM_CREATE_TITLE)
    expect(taskFormDialogTitle('edit')).toBe(TASK_FORM_EDIT_TITLE)
    expect(taskFormSubmitLabel('create')).toBe(TASK_FORM_CREATE_SUBMIT)
    expect(taskFormSubmitLabel('edit')).toBe(TASK_FORM_EDIT_SUBMIT)
    expect(TASK_FORM_CREATE_TITLE).toBe('Create task')
    expect(TASK_FORM_CREATE_SUBMIT).toBe('Create task')
    expect(TASK_FORM_CANCEL_LABEL).toBe('Cancel')
    expect(TASK_FORM_TITLE_PLACEHOLDER).toBe('Short label')
    expect(TASK_FORM_DESCRIPTION_PLACEHOLDER).toContain('Markdown')
    expect(TASK_FORM_DESCRIPTION_REQUIRED).toBe('Description is required.')
  })

  it('aligns input limits with domain constants from #79', () => {
    expect(TITLE_MAX_LENGTH).toBe(50)
    expect(DESCRIPTION_MAX_LENGTH).toBe(5000)
  })
})

describe('taskFormCanSubmit', () => {
  it('disables submit when description is empty or whitespace', () => {
    expect(taskFormCanSubmit('')).toBe(false)
    expect(taskFormCanSubmit('   ')).toBe(false)
    expect(taskFormCanSubmit('Write the brief')).toBe(true)
  })
})
