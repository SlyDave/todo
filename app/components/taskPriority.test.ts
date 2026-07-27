import { describe, expect, it } from 'vitest'
import {
  PRIORITY_ICON,
  PRIORITY_ICON_CLASS,
  PRIORITY_LABEL,
  PRIORITY_OPTIONS
} from './taskPriority'

describe('taskPriority', () => {
  it('maps priorities to the stakeholder icons', () => {
    expect(PRIORITY_ICON.low).toEqual(['fas', 'chevron-down'])
    expect(PRIORITY_ICON.medium).toEqual(['fas', 'minus'])
    expect(PRIORITY_ICON.high).toEqual(['fas', 'chevron-up'])
  })

  it('colours priority icons with theme semantic classes', () => {
    expect(PRIORITY_ICON_CLASS.high).toBe('text-error')
    expect(PRIORITY_ICON_CLASS.medium).toBe('text-success')
    expect(PRIORITY_ICON_CLASS.low).toBe('text-info')
  })

  it('exposes British English accessible labels', () => {
    expect(PRIORITY_LABEL.low).toBe('Low priority')
    expect(PRIORITY_LABEL.medium).toBe('Medium priority')
    expect(PRIORITY_LABEL.high).toBe('High priority')
  })

  it('lists all three priorities for the form', () => {
    expect(PRIORITY_OPTIONS.map((option) => option.value)).toEqual(['low', 'medium', 'high'])
  })
})
