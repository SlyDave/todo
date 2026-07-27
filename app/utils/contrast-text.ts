/**
 * Readable light/dark text colours for custom card backgrounds.
 * Chosen so title and body stay legible on typical hex backgrounds.
 */
export const CONTRAST_TEXT_DARK = '#111827'
export const CONTRAST_TEXT_LIGHT = '#f9fafb'

/**
 * WCAG relative-luminance midpoint used to choose black-vs-white style text.
 * Backgrounds at or above this threshold get dark text; below get light text.
 */
export const CONTRAST_LUMINANCE_THRESHOLD = 0.179

export class ContrastTextError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ContrastTextError'
  }
}

/**
 * Returns a readable text colour for a custom card background, or `null` when
 * there is no custom background (`null`, `undefined`, empty, or `"none"`) so
 * the caller keeps the theme default.
 */
export function contrastTextColour(background: string | null | undefined): string | null {
  if (background == null) {
    return null
  }
  const trimmed = background.trim()
  if (trimmed === '' || trimmed.toLowerCase() === 'none') {
    return null
  }

  const luminance = relativeLuminance(trimmed)
  return luminance >= CONTRAST_LUMINANCE_THRESHOLD ? CONTRAST_TEXT_DARK : CONTRAST_TEXT_LIGHT
}

/**
 * WCAG 2 relative luminance for an sRGB CSS hex colour (`#rgb` or `#rrggbb`).
 */
export function relativeLuminance(hex: string): number {
  const [r, g, b] = parseHexRgb(hex)
  return (
    0.2126 * srgbChannelToLinear(r) +
    0.7152 * srgbChannelToLinear(g) +
    0.0722 * srgbChannelToLinear(b)
  )
}

function parseHexRgb(hex: string): [number, number, number] {
  const raw = hex.trim()
  const match = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(raw)
  if (match === null || match[1] === undefined) {
    throw new ContrastTextError('Background colour must be a CSS hex value (#rgb or #rrggbb).')
  }

  const digits = match[1]
  if (digits.length === 3) {
    const r = digits[0]
    const g = digits[1]
    const b = digits[2]
    if (r === undefined || g === undefined || b === undefined) {
      throw new ContrastTextError('Background colour must be a CSS hex value (#rgb or #rrggbb).')
    }
    return [parseHexByte(r + r), parseHexByte(g + g), parseHexByte(b + b)]
  }

  return [
    parseHexByte(digits.slice(0, 2)),
    parseHexByte(digits.slice(2, 4)),
    parseHexByte(digits.slice(4, 6))
  ]
}

function parseHexByte(pair: string): number {
  return Number.parseInt(pair, 16)
}

function srgbChannelToLinear(channel: number): number {
  const c = channel / 255
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
}
