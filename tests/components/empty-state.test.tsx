import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { IMButton } from '@/components/ui/button'
import { IMEmptyState } from '@/components/ui/empty-state'

describe('IMEmptyState', () => {
  it('draws the icon xl and muted in a surface-2 disc, then the title', () => {
    const html = renderToStaticMarkup(<IMEmptyState icon="users" title="עדיין אין לקוחות" />)
    expect(html).toMatch(/size-16[^"]*rounded-full bg-surface-2/)
    const icon = /<svg[^>]*data-slot="im-icon"[^>]*class="([^"]*)"/.exec(html)?.[1]?.split(' ') ?? []
    expect(icon).toEqual(expect.arrayContaining(['size-8', 'text-muted-foreground']))
    // The title role, as a paragraph: an empty state isn't part of the page outline.
    expect(html).toMatch(/<p data-slot="im-heading" data-variant="title"[^>]*>עדיין אין לקוחות<\/p>/)
  })

  it('adds the description and the action only when given', () => {
    const bare = renderToStaticMarkup(<IMEmptyState icon="kanban" title="עדיין אין פרויקטים" />)
    expect(bare).not.toContain('data-variant="body-sm"')
    expect(bare).not.toContain('<button')

    const full = renderToStaticMarkup(
      <IMEmptyState
        icon="users"
        title="אין לקוחות שמתאימים"
        description="נסו לשנות את הסינון."
        action={<IMButton variant="outline">ניקוי הסינון</IMButton>}
      />,
    )
    expect(full).toMatch(/data-variant="body-sm"[^>]*>נסו לשנות את הסינון\.</)
    expect(full).toContain('ניקוי הסינון</button>')
  })
})
