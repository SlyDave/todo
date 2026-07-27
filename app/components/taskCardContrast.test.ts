import { describe, expect, it } from 'vitest'
import { CONTRAST_TEXT_DARK, CONTRAST_TEXT_LIGHT } from '../utils/contrast-text'
import { taskCardContrastText } from './taskCardContrast'

describe('taskCardContrastText', () => {
  it('returns null when background is none so theme colours remain', () => {
    expect(taskCardContrastText(null)).toBeNull()
    expect(taskCardContrastText(undefined)).toBeNull()
    expect(taskCardContrastText('')).toBeNull()
    expect(taskCardContrastText('none')).toBeNull()
  })

  it('picks dark or light text from background luminance', () => {
    expect(taskCardContrastText('#ffffff')).toBe(CONTRAST_TEXT_DARK)
    expect(taskCardContrastText('#000000')).toBe(CONTRAST_TEXT_LIGHT)
    expect(taskCardContrastText('#1d4ed8')).toBe(CONTRAST_TEXT_LIGHT)
  })

  it('keeps theme defaults when the background is not a hex colour', () => {
    expect(taskCardContrastText('not-a-colour')).toBeNull()
  })
})
