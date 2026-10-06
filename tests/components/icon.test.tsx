import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { ChevronLeft, IMIcon, Loader2, Trash2 } from '@/components/ui/icon'
import type { IMIconName, IMIconSize } from '@/components/ui/icon'
import { IM_ICONS } from '@/components/ui/icon-registry'

/** The SVG's children: the drawn paths, without the root element's attributes. */
const inner = (html: string) =>
  html.replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '')
const classOf = (html: string) =>
  /class="([^"]*)"/.exec(html)?.[1]?.split(' ') ?? []
const names = Object.keys(IM_ICONS) as IMIconName[]

function glyphMarkup(name: IMIconName) {
  const { glyph, weight } = IM_ICONS[name]
  return inner(renderToStaticMarkup(createElement(glyph, { weight })))
}

describe('IMIcon', () => {
  it('draws the registry glyph in the registry weight, for every name', () => {
    for (const name of names) {
      expect(inner(renderToStaticMarkup(<IMIcon name={name} />)), name).toBe(
        glyphMarkup(name),
      )
    }
  })

  it('is decorative by default: aria-hidden, no role', () => {
    const html = renderToStaticMarkup(<IMIcon name="calendar" />)
    expect(html).toContain('aria-hidden="true"')
    expect(html).not.toContain('role=')
    expect(html).toContain('data-slot="im-icon"')
  })

  it('becomes a labelled image with `label`', () => {
    const html = renderToStaticMarkup(<IMIcon name="warning" label="אזהרה" />)
    expect(html).toContain('role="img"')
    expect(html).toContain('aria-label="אזהרה"')
    expect(html).not.toContain('aria-hidden')
  })

  it('defaults to md (20px) and the inherit tone, which sets no colour class', () => {
    const html = renderToStaticMarkup(<IMIcon name="user" />)
    expect(html).toContain('width="20"')
    expect(classOf(html)).toContain('size-5')
    expect(classOf(html).filter((c) => c.startsWith('text-'))).toEqual([])
  })

  it('maps every size token to its pixel size and class', () => {
    const expected: Record<IMIconSize, [number, string]> = {
      xs: [12, 'size-3'],
      sm: [16, 'size-4'],
      md: [20, 'size-5'],
      lg: [24, 'size-6'],
      xl: [32, 'size-8'],
    }
    for (const [size, [px, cls]] of Object.entries(expected) as Array<
      [IMIconSize, [number, string]]
    >) {
      const html = renderToStaticMarkup(<IMIcon name="bell" size={size} />)
      expect(html).toContain(`width="${px}"`)
      expect(classOf(html)).toContain(cls)
    }
  })

  it('colours through tone tokens only', () => {
    expect(
      classOf(renderToStaticMarkup(<IMIcon name="info" tone="muted" />)),
    ).toContain('text-muted-foreground')
    expect(
      classOf(renderToStaticMarkup(<IMIcon name="info" tone="default" />)),
    ).toContain('text-foreground')
    expect(
      classOf(renderToStaticMarkup(<IMIcon name="info" tone="accent" />)),
    ).toContain('text-accent-ink')
    expect(
      classOf(
        renderToStaticMarkup(<IMIcon name="check-circle" tone="success" />),
      ),
    ).toContain('text-success')
    expect(
      classOf(renderToStaticMarkup(<IMIcon name="warning" tone="warning" />)),
    ).toContain('text-warning')
    expect(
      classOf(renderToStaticMarkup(<IMIcon name="trash" tone="destructive" />)),
    ).toContain('text-destructive')
    expect(
      classOf(renderToStaticMarkup(<IMIcon name="needle" tone="artist-3" />)),
    ).toContain('text-artist-3')
  })

  it('mirrors in RTL exactly the glyphs the registry flags', () => {
    for (const name of names) {
      const mirrored = classOf(
        renderToStaticMarkup(<IMIcon name={name} />),
      ).includes('rtl:-scale-x-100')
      expect(mirrored, name).toBe(IM_ICONS[name].mirrorInRtl === true)
    }
  })

  it('spins only with `spin`, and only when motion is allowed', () => {
    expect(
      classOf(renderToStaticMarkup(<IMIcon name="spinner" />)),
    ).not.toContain('motion-safe:animate-spin')
    const spinning = classOf(
      renderToStaticMarkup(<IMIcon name="spinner" spin />),
    )
    expect(spinning).toContain('motion-safe:animate-spin')
    expect(spinning).not.toContain('animate-spin')
  })

  it('keeps layout classes from className', () => {
    expect(
      classOf(renderToStaticMarkup(<IMIcon name="plus" className="ms-auto" />)),
    ).toContain('ms-auto')
  })

  it('rejects spin on any glyph but the spinner at compile time', () => {
    // @ts-expect-error — `spin` is for the spinner only
    const html = renderToStaticMarkup(<IMIcon name="refresh" spin />)
    expect(html).toContain('<svg')
  })
})

describe('legacy icon bridge (interim, plan Phase 3 item 3.1)', () => {
  it('draws what IMIcon draws for its registry name', () => {
    expect(inner(renderToStaticMarkup(<Trash2 className="h-4 w-4" />))).toBe(
      glyphMarkup('trash'),
    )
    expect(
      inner(renderToStaticMarkup(<Loader2 className="animate-spin" />)),
    ).toBe(glyphMarkup('spinner'))
  })

  it('keeps the old size and className API', () => {
    const html = renderToStaticMarkup(
      <Trash2 size={15} className="text-muted-foreground" />,
    )
    expect(html).toContain('width="15"')
    expect(classOf(html)).toEqual(
      expect.arrayContaining(['shrink-0', 'text-muted-foreground']),
    )
  })

  it('mirrors like the registry, so ChevronLeft keeps pointing to the inline end in RTL', () => {
    expect(classOf(renderToStaticMarkup(<ChevronLeft />))).toContain(
      'rtl:-scale-x-100',
    )
    expect(inner(renderToStaticMarkup(<ChevronLeft />))).toBe(
      glyphMarkup('chevron-end'),
    )
  })

  it('ignores a weight override: the registry decides', () => {
    expect(inner(renderToStaticMarkup(<Trash2 weight="thin" />))).toBe(
      glyphMarkup('trash'),
    )
  })
})
