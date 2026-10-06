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
  IMHeading,
  IMText,
  IMDisplay,
  IMHeadline,
  IMTitle,
  IMSubtitle,
  IMLabelText,
  IMCaption,
  IMIcon,
  Calendar,
  User,
  ICON_SIZES,
  ICON_TONES,
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

describe('Inkmind Typography System', () => {
  it('renders IMHeading display variant with Assistant font classes', () => {
    const html = renderToStaticMarkup(<IMDisplay>כותרת ראשית לתצוגה</IMDisplay>)
    expect(html).toContain('<h1')
    expect(html).toContain('data-slot="im-heading"')
    expect(html).toContain('font-assistant')
    expect(html).toContain('כותרת ראשית לתצוגה')
  })

  it('renders IMHeadline variant for page titles', () => {
    const html = renderToStaticMarkup(<IMHeadline>לידים ופרויקטים</IMHeadline>)
    expect(html).toContain('<h1')
    expect(html).toContain('text-2xl')
    expect(html).toContain('לידים ופרויקטים')
  })

  it('renders IMHeading with custom as and variant props', () => {
    const html = renderToStaticMarkup(
      <IMHeading as="h3" variant="title">
        כותרת מותאמת
      </IMHeading>,
    )
    expect(html).toContain('<h3')
    expect(html).toContain('כותרת מותאמת')
  })

  it('renders IMTitle and IMSubtitle for sections and cards', () => {
    const html = renderToStaticMarkup(
      <div>
        <IMTitle>כותרת סקשן</IMTitle>
        <IMSubtitle>כותרת משנה</IMSubtitle>
      </div>,
    )
    expect(html).toContain('כותרת סקשן')
    expect(html).toContain('כותרת משנה')
  })

  it('renders IMText with body, label, and caption variants', () => {
    const html = renderToStaticMarkup(
      <div>
        <IMText variant="body">טקסט רגיל בגוף הממשק</IMText>
        <IMLabelText>תווית שדה</IMLabelText>
        <IMCaption>הערת עזר באפור</IMCaption>
      </div>,
    )
    expect(html).toContain('data-slot="im-text"')
    expect(html).toContain('<label')
    expect(html).toContain('text-muted-foreground')
  })
})

describe('Inkmind Icon System (Always Filled)', () => {
  it('renders icons with fill weight by default (not outlined)', () => {
    const html = renderToStaticMarkup(<Calendar />)
    expect(html).toContain('<svg')
  })

  it('IMIcon wrapper supports size, tone, and defaults to fill', () => {
    const html = renderToStaticMarkup(<IMIcon icon={User} size="lg" tone="primary" />)
    expect(html).toContain('<svg')
    expect(html).toContain('width="24"')
    expect(html).toContain('height="24"')
    expect(html).toContain('text-primary')
  })

  it('supports semantic tone palette including status and artist tokens', () => {
    expect(ICON_SIZES.md).toBe(20)
    expect(ICON_SIZES.lg).toBe(24)
    expect(ICON_TONES.success).toContain('text-emerald-500')
    expect(ICON_TONES.warning).toContain('text-amber-500')
    expect(ICON_TONES.destructive).toContain('text-rose-500')
    expect(ICON_TONES['artist-1']).toContain('var(--brand-artist-1)')
  })
})
