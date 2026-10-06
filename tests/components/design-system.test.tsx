import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import {
  IMButton,
  IMCard,
  IMCardHeader,
  IMCardTitle,
  IMCardContent,
  IMBadge,
  IMLabel,
  IMInput,
  IMTextarea,
  IMCheckbox,
  IMSwitch,
  IMSkeleton,
  IMAvatar,
  IMAvatarFallback,
  IMIcon,
} from '@/components/ui'

describe('Inkmind Design System (IM*) Primitives', () => {
  it('renders IMButton with default variant and size', () => {
    const html = renderToStaticMarkup(<IMButton>לחץ כאן</IMButton>)
    expect(html).toContain('<button')
    expect(html).toContain('data-slot="button"')
    expect(html).toContain('לחץ כאן')
  })

  it('renders IMCard with structured header, title, and content', () => {
    const html = renderToStaticMarkup(
      <IMCard>
        <IMCardHeader>
          <IMCardTitle>כותרת כרטיס</IMCardTitle>
        </IMCardHeader>
        <IMCardContent>תוכן הכרטיס</IMCardContent>
      </IMCard>,
    )
    expect(html).toContain('data-slot="card"')
    expect(html).toContain('כותרת כרטיס')
    expect(html).toContain('תוכן הכרטיס')
  })

  it('renders IMBadge with status variants', () => {
    const html = renderToStaticMarkup(<IMBadge variant="done">הושלם</IMBadge>)
    expect(html).toContain('הושלם')
    expect(html).toContain('data-variant="done"')
  })

  it('renders IMInput, IMTextarea, and IMLabel with correct attributes', () => {
    const html = renderToStaticMarkup(
      <div>
        <IMLabel htmlFor="name">שם לקוח</IMLabel>
        <IMInput id="name" placeholder="הקלד שם..." />
        <IMTextarea placeholder="הקלד תיאור..." />
      </div>,
    )
    expect(html).toContain('שם לקוח')
    expect(html).toContain('placeholder="הקלד שם..."')
    expect(html).toContain('placeholder="הקלד תיאור..."')
  })

  it('renders IMCheckbox and IMSwitch controls', () => {
    const html = renderToStaticMarkup(
      <div>
        <IMCheckbox id="agree" />
        <IMSwitch id="notify" />
      </div>,
    )
    expect(html).toContain('button')
    expect(html).toContain('role="switch"')
  })

  it('renders IMAvatar and IMSkeleton for loading states', () => {
    const skeletonHtml = renderToStaticMarkup(<IMSkeleton className="h-6 w-24" />)
    expect(skeletonHtml).toContain('animate-pulse')
    expect(skeletonHtml).toContain('h-6 w-24')

    const avatarHtml = renderToStaticMarkup(
      <IMAvatar>
        <IMAvatarFallback>דח</IMAvatarFallback>
      </IMAvatar>,
    )
    expect(avatarHtml).toContain('דח')
  })
})

describe('Inkmind Icon System (Always Filled)', () => {
  it('IMIcon renders a registry glyph by name', () => {
    const html = renderToStaticMarkup(<IMIcon name="calendar" />)
    expect(html).toContain('<svg')
  })

  it('IMIcon supports size and tone tokens', () => {
    const html = renderToStaticMarkup(<IMIcon name="user" size="lg" tone="accent" />)
    expect(html).toContain('<svg')
    expect(html).toContain('width="24"')
    expect(html).toContain('height="24"')
    expect(html).toContain('text-accent-ink')
  })
})
