import { describe, expect, it } from 'vitest'
import {
  TASK_CARD_DELETE_ICON,
  TASK_CARD_DELETE_LABEL,
  TASK_CARD_EDIT_ICON,
  TASK_CARD_EDIT_LABEL,
  taskCardDeleteAriaLabel,
  taskCardEditAriaLabel
} from './taskCardActions'

describe('taskCardActions', () => {
  it('uses British English Edit and Delete labels for tooltips', () => {
    expect(TASK_CARD_EDIT_LABEL).toBe('Edit')
    expect(TASK_CARD_DELETE_LABEL).toBe('Delete')
  })

  it('maps edit and delete to Font Awesome Pro icons', () => {
    expect(TASK_CARD_EDIT_ICON).toEqual(['fas', 'pen'])
    expect(TASK_CARD_DELETE_ICON).toEqual(['fas', 'trash'])
  })

  it('builds accessible names that include the task title when present', () => {
    expect(taskCardEditAriaLabel('Write docs')).toBe('Edit Write docs')
    expect(taskCardDeleteAriaLabel('Write docs')).toBe('Delete Write docs')
    expect(taskCardEditAriaLabel(null)).toBe('Edit task')
    expect(taskCardDeleteAriaLabel(null)).toBe('Delete task')
  })
})
