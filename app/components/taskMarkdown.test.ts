import { afterEach, describe, expect, it } from 'vitest'
import { isSafeHref, renderTaskMarkdown } from './taskMarkdown'

describe('isSafeHref', () => {
  it('allows http(s), mailto, anchors and root-relative paths', () => {
    expect(isSafeHref('https://example.com')).toBe(true)
    expect(isSafeHref('http://example.com')).toBe(true)
    expect(isSafeHref('mailto:a@b.com')).toBe(true)
    expect(isSafeHref('#section')).toBe(true)
    expect(isSafeHref('/path')).toBe(true)
  })

  it('rejects javascript and data URLs', () => {
    expect(isSafeHref('javascript:alert(1)')).toBe(false)
    expect(isSafeHref(' data:text/html,hi')).toBe(false)
  })
})

describe('renderTaskMarkdown', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('renders basic Markdown to HTML', () => {
    const html = renderTaskMarkdown('**bold** and _italic_')
    expect(html).toContain('<strong>bold</strong>')
    expect(html).toContain('<em>italic</em>')
  })

  it('renders plain text', () => {
    const html = renderTaskMarkdown('Hello board')
    expect(html).toContain('Hello board')
  })

  it('escapes raw HTML from Markdown source', () => {
    const html = renderTaskMarkdown('<script>alert(1)</script>Safe')
    expect(html.toLowerCase()).not.toContain('<script')
    expect(html).toContain('Safe')
  })

  it('does not emit javascript URLs from Markdown links', () => {
    const safe = renderTaskMarkdown('[ok](https://example.com)')
    expect(safe).toContain('href="https://example.com"')

    const unsafe = renderTaskMarkdown('[bad](javascript:alert(1))')
    expect(unsafe.toLowerCase()).not.toContain('javascript:')
    expect(unsafe).toContain('bad')
  })
})
