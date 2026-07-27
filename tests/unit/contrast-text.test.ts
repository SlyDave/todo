import { describe, expect, it } from 'vitest'
import {
  CONTRAST_LUMINANCE_THRESHOLD,
  CONTRAST_TEXT_DARK,
  CONTRAST_TEXT_LIGHT,
  ContrastTextError,
  contrastTextColour,
  relativeLuminance
} from '../../app/utils/contrast-text'

describe('contrastTextColour', () => {
  it('returns dark text for light backgrounds', () => {
    expect(contrastTextColour('#ffffff')).toBe(CONTRAST_TEXT_DARK)
    expect(contrastTextColour('#f5f5f5')).toBe(CONTRAST_TEXT_DARK)
    expect(contrastTextColour('#ffe4b5')).toBe(CONTRAST_TEXT_DARK)
    expect(contrastTextColour('#fff')).toBe(CONTRAST_TEXT_DARK)
  })

  it('returns light text for dark backgrounds', () => {
    expect(contrastTextColour('#000000')).toBe(CONTRAST_TEXT_LIGHT)
    expect(contrastTextColour('#111827')).toBe(CONTRAST_TEXT_LIGHT)
    expect(contrastTextColour('#1e3a8a')).toBe(CONTRAST_TEXT_LIGHT)
    expect(contrastTextColour('#000')).toBe(CONTRAST_TEXT_LIGHT)
  })

  it('does not invent a text colour when background is none or absent', () => {
    expect(contrastTextColour(null)).toBeNull()
    expect(contrastTextColour(undefined)).toBeNull()
    expect(contrastTextColour('')).toBeNull()
    expect(contrastTextColour('   ')).toBeNull()
    expect(contrastTextColour('none')).toBeNull()
    expect(contrastTextColour('None')).toBeNull()
  })

  it('covers luminance threshold behaviour for representative samples', () => {
    expect(relativeLuminance('#ffffff')).toBeGreaterThan(CONTRAST_LUMINANCE_THRESHOLD)
    expect(relativeLuminance('#000000')).toBeLessThan(CONTRAST_LUMINANCE_THRESHOLD)
    expect(relativeLuminance('#808080')).toBeGreaterThan(CONTRAST_LUMINANCE_THRESHOLD)
    expect(relativeLuminance('#4b5563')).toBeLessThan(CONTRAST_LUMINANCE_THRESHOLD)

    expect(contrastTextColour('#808080')).toBe(CONTRAST_TEXT_DARK)
    expect(contrastTextColour('#4b5563')).toBe(CONTRAST_TEXT_LIGHT)
  })

  it('rejects non-hex custom backgrounds', () => {
    expect(() => contrastTextColour('red')).toThrow(ContrastTextError)
    expect(() => contrastTextColour('rgb(0,0,0)')).toThrow(ContrastTextError)
  })
})
