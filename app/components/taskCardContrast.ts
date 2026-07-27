import { contrastTextColour } from '../utils/contrast-text'

/**
 * Readable title/body colour for a task card background, or `null` to keep
 * theme defaults (no custom background / unparseable value).
 */
export function taskCardContrastText(background: string | null | undefined): string | null {
  try {
    return contrastTextColour(background)
  } catch {
    return null
  }
}
