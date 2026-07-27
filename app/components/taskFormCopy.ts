/** British English dialog title when creating a task. */
export const TASK_FORM_CREATE_TITLE = 'Create task'

/** British English dialog title when editing a task. */
export const TASK_FORM_EDIT_TITLE = 'Edit task'

/** Submit label when creating. */
export const TASK_FORM_CREATE_SUBMIT = 'Create task'

/** Submit label when saving edits. */
export const TASK_FORM_EDIT_SUBMIT = 'Save changes'

/** Cancel control label. */
export const TASK_FORM_CANCEL_LABEL = 'Cancel'

/** Title field label (CONTEXT.md). */
export const TASK_FORM_TITLE_LABEL = 'Title'

/** Title field placeholder. */
export const TASK_FORM_TITLE_PLACEHOLDER = 'Short label'

/** Description field label (CONTEXT.md). */
export const TASK_FORM_DESCRIPTION_LABEL = 'Description'

/** Description field placeholder. */
export const TASK_FORM_DESCRIPTION_PLACEHOLDER = 'What needs doing? Markdown is supported.'

/** Client-side required-description message. */
export const TASK_FORM_DESCRIPTION_REQUIRED = 'Description is required.'

/** Priority field label (CONTEXT.md). */
export const TASK_FORM_PRIORITY_LABEL = 'Priority'

/** Due date field label (CONTEXT.md). */
export const TASK_FORM_DUE_DATE_LABEL = 'Due date'

/**
 * Field label for optional card colour (CONTEXT.md: Background colour).
 * Spelling is British English: colour, not color.
 */
export const TASK_FORM_BACKGROUND_COLOUR_LABEL = 'Background colour'

/** Select option for no card background colour. */
export const TASK_FORM_COLOUR_NONE_LABEL = 'None'

/** Select option for a custom card background colour. */
export const TASK_FORM_COLOUR_CUSTOM_LABEL = 'Custom colour'

/**
 * Colour picker field label.
 * Spelling is British English: colour, not color.
 */
export const TASK_FORM_COLOUR_LABEL = 'Colour'

export function taskFormDialogTitle(mode: 'create' | 'edit'): string {
  return mode === 'create' ? TASK_FORM_CREATE_TITLE : TASK_FORM_EDIT_TITLE
}

export function taskFormSubmitLabel(mode: 'create' | 'edit'): string {
  return mode === 'create' ? TASK_FORM_CREATE_SUBMIT : TASK_FORM_EDIT_SUBMIT
}
