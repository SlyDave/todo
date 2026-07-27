import DOMPurify from 'dompurify'
import { marked, Renderer, type Tokens } from 'marked'

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

/** Only allow common safe URL schemes for Markdown links and images. */
export function isSafeHref(href: string): boolean {
  const trimmed = href.trim().toLowerCase()
  if (trimmed === '' || trimmed.startsWith('#') || trimmed.startsWith('/')) {
    return true
  }
  return (
    trimmed.startsWith('https:') || trimmed.startsWith('http:') || trimmed.startsWith('mailto:')
  )
}

function createSafeRenderer(): Renderer {
  const renderer = new Renderer()

  // Raw HTML in Markdown is hostile input — never emit it.
  renderer.html = ({ text }: Tokens.HTML | Tokens.Tag): string => escapeHtml(text)

  renderer.link = ({ href, title, text }: Tokens.Link): string => {
    const body = text
    if (!isSafeHref(href)) {
      return body
    }
    const titleAttr = title ? ` title="${escapeHtml(title)}"` : ''
    return `<a href="${escapeHtml(href)}"${titleAttr} rel="noopener noreferrer">${body}</a>`
  }

  renderer.image = ({ href, title, text }: Tokens.Image): string => {
    if (!isSafeHref(href)) {
      return escapeHtml(text)
    }
    const titleAttr = title ? ` title="${escapeHtml(title)}"` : ''
    return `<img src="${escapeHtml(href)}" alt="${escapeHtml(text)}"${titleAttr}>`
  }

  return renderer
}

const renderer = createSafeRenderer()

marked.setOptions({
  gfm: true,
  breaks: true,
  renderer
})

const PURIFY_OPTIONS: {
  ALLOWED_TAGS: string[]
  ALLOWED_ATTR: string[]
} = {
  ALLOWED_TAGS: [
    'p',
    'br',
    'strong',
    'em',
    'del',
    'ul',
    'ol',
    'li',
    'a',
    'img',
    'code',
    'pre',
    'blockquote',
    'h1',
    'h2',
    'h3',
    'h4',
    'hr'
  ],
  ALLOWED_ATTR: ['href', 'title', 'rel', 'src', 'alt']
}

function purifyHostWorks(): boolean {
  try {
    const sample = DOMPurify.sanitize('<p>x</p>', { ALLOWED_TAGS: ['p'] })
    return sample.includes('<p>')
  } catch {
    return false
  }
}

/**
 * Converts task description Markdown to sanitised HTML.
 * Returns an empty string when no DOM is available (SSR), so callers
 * must render on the client for formatted output.
 *
 * Safety is primarily from the marked renderer (no raw HTML, safe URLs).
 * DOMPurify is a second pass only when the host DOM supports it correctly.
 */
export function renderTaskMarkdown(source: string): string {
  const raw = marked.parse(source, { async: false, renderer })
  if (typeof raw !== 'string') {
    return ''
  }

  if (typeof window === 'undefined') {
    return ''
  }

  if (!purifyHostWorks()) {
    return raw
  }

  return DOMPurify.sanitize(raw, { ...PURIFY_OPTIONS })
}
