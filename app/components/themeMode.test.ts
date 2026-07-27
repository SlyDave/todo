import { describe, expect, it } from 'vitest'
import { nextThemePreference, THEME_STORAGE_KEY, themeToggleLabel } from './themeMode'

describe('themeMode', () => {
  it('persists preference under the Nuxt Color Mode storage key', () => {
    expect(THEME_STORAGE_KEY).toBe('nuxt-color-mode')
  })

  it('toggles from light to dark and back', () => {
    expect(nextThemePreference('light')).toBe('dark')
    expect(nextThemePreference('dark')).toBe('light')
  })

  it('exposes British English aria-labels for the toggle', () => {
    expect(themeToggleLabel('light')).toBe('Switch to dark mode')
    expect(themeToggleLabel('dark')).toBe('Switch to light mode')
  })
})
