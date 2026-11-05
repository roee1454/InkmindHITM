import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { IMAvatar } from '@/components/ui/avatar'

/** The monogram as rendered: the fallback's text (it shows until a photo loads). */
const monogramOf = (name: string) =>
  /data-slot="avatar-fallback"[^>]*>([^<]*)</.exec(renderToStaticMarkup(<IMAvatar name={name} />))?.[1]

describe('IMAvatar monogram', () => {
  it('takes the first letters of the first and the last word', () => {
    expect(monogramOf('דניאל כהן')).toBe('דכ')
    expect(monogramOf('איתי בן חיים')).toBe('אח')
  })

  it('takes the first two letters of a one-word name', () => {
    expect(monogramOf('רואי')).toBe('רו')
  })

  it('skips punctuation such as a geresh, and extra whitespace', () => {
    expect(monogramOf("  ג'וני   כהן ")).toBe('גכ')
    expect(monogramOf("ג'וני")).toBe('גו')
  })

  it('upper-cases Latin names', () => {
    expect(monogramOf('roee levi')).toBe('RL')
  })

  it('is empty for an empty name', () => {
    expect(monogramOf('')).toBe('')
  })
})

describe('IMAvatar', () => {
  it('is an image named after the person', () => {
    const html = renderToStaticMarkup(<IMAvatar name="דניאל כהן" />)
    expect(html).toContain('role="img"')
    expect(html).toContain('aria-label="דניאל כהן"')
  })

  it('sizes sm 32 · md 42 (default) · lg 56', () => {
    expect(renderToStaticMarkup(<IMAvatar name="א" size="sm" />)).toContain('size-8')
    expect(renderToStaticMarkup(<IMAvatar name="א" />)).toContain('size-10.5')
    expect(renderToStaticMarkup(<IMAvatar name="א" size="lg" />)).toContain('size-14')
  })

  it("rings an artist in solid styling; a customer gets no ring", () => {
    const artist = renderToStaticMarkup(<IMAvatar name="דור" artist={3} />)
    expect(artist).toContain('ring-border')
    expect(artist).toContain('ring-offset-card')
    expect(renderToStaticMarkup(<IMAvatar name="דור" />)).not.toContain('ring-')
  })
})
