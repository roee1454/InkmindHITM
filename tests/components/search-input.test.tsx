import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { IMSearchInput } from '@/components/ui/search-input'

const noop = () => {}
const inputClasses = (html: string) => /<input[^>]*class="([^"]*)"/.exec(html)?.[1]?.split(' ') ?? []

describe('IMSearchInput', () => {
  it('default md: the IMInput surface with room for the icon and the clear button', () => {
    const classes = inputClasses(renderToStaticMarkup(<IMSearchInput value="" onChange={noop} />))
    expect(classes).toEqual(expect.arrayContaining(['rounded-lg', 'bg-card', 'shadow-xs', 'h-(--im-control-h)', 'ps-10.5', 'pe-10']))
  })

  it('subtle: a recessed fill and no shadow, for toolbars and popovers', () => {
    const classes = inputClasses(renderToStaticMarkup(<IMSearchInput value="" onChange={noop} variant="subtle" />))
    expect(classes).toEqual(expect.arrayContaining(['bg-surface-2/55', 'shadow-none']))
    expect(classes).not.toContain('bg-card')
    expect(classes).not.toContain('shadow-xs')
  })

  it('sm: 38px with body-sm text, also on touch', () => {
    const classes = inputClasses(renderToStaticMarkup(<IMSearchInput value="" onChange={noop} size="sm" />))
    expect(classes).toEqual(expect.arrayContaining(['h-9.5', 'text-sm']))
    expect(classes).not.toContain('h-(--im-control-h)')
    expect(classes).not.toContain('text-(length:--im-control-fs)')
  })

  it('merges a className override', () => {
    const classes = inputClasses(renderToStaticMarkup(<IMSearchInput value="" onChange={noop} className="h-9" />))
    expect(classes).toContain('h-9')
    expect(classes).not.toContain('h-(--im-control-h)')
  })

  it('shows the clear button only once there is a value', () => {
    expect(renderToStaticMarkup(<IMSearchInput value="" onChange={noop} />)).not.toContain('ניקוי החיפוש')
    expect(renderToStaticMarkup(<IMSearchInput value="דניאל" onChange={noop} />)).toContain('aria-label="ניקוי החיפוש"')
  })
})
