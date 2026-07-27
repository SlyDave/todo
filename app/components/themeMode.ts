/** Applied colour mode on the document (never `system`). */
export type AppliedTheme = 'light' | 'dark'

/**
 * localStorage key used by `@nuxtjs/color-mode` (via Nuxt UI) to persist the
 * user's preference across refreshes.
 */
export const THEME_STORAGE_KEY = 'nuxt-color-mode'

/** Accessible British English label for the control that would switch away from `applied`. */
export function themeToggleLabel(applied: AppliedTheme): string {
  return applied === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'
}

/** Explicit preference to store when the user toggles from the currently applied theme. */
export function nextThemePreference(applied: AppliedTheme): AppliedTheme {
  return applied === 'dark' ? 'light' : 'dark'
}
