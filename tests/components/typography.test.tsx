import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import {
  IMCaption,
  IMDisplay,
  IMHeading,
  IMHeadline,
  IMNum,
  IMSubtitle,
  IMText,
  IMTitle,
  IM_TYPE_ROLES,
  type IMHeadingVariant,
  type IMTextVariant,
  type IMTypeRole,
} from '@/components/ui/typography'
import { IM_TONES, type IMTone } from '@/components/ui/tones'

/** The approved role table (docs/design-system/typography.md): face, ladder step, weight. */
const ROLE_TABLE: Record<
  IMTypeRole,
  {
    face: 'display' | 'body'
    step: string
    weight: string
    px: number
    lh: number
  }
> = {
  display: {
    face: 'display',
    step: 'text-3xl',
    weight: 'font-extrabold',
    px: 28,
    lh: 1.2,
  },
  headline: {
    face: 'display',
    step: 'text-2xl',
    weight: 'font-extrabold',
    px: 23,
    lh: 1.25,
  },
  title: {
    face: 'body',
    step: 'text-lg',
    weight: 'font-bold',
    px: 17,
    lh: 1.45,
  },
  subtitle: {
    face: 'body',
    step: 'text-base',
    weight: 'font-semibold',
    px: 15,
    lh: 1.5,
  },
  body: {
    face: 'body',
    step: 'text-base',
    weight: 'font-medium',
    px: 15,
    lh: 1.5,
  },
  'body-sm': {
    face: 'body',
    step: 'text-sm',
    weight: 'font-medium',
    px: 13.5,
    lh: 1.4,
  },
  label: {
    face: 'body',
    step: 'text-sm',
    weight: 'font-bold',
    px: 13.5,
    lh: 1.4,
  },
  caption: {
    face: 'body',
    step: 'text-xs',
    weight: 'font-medium',
    px: 12.5,
    lh: 1.3,
  },
  micro: {
    face: 'body',
    step: 'text-2xs',
    weight: 'font-semibold',
    px: 11,
    lh: 1.25,
  },
}

const HEADING_VARIANTS: IMHeadingVariant[] = [
  'display',
  'headline',
  'title',
  'subtitle',
]
const TEXT_VARIANTS: IMTextVariant[] = [
  'body',
  'body-sm',
  'label',
  'caption',
  'micro',
]
const ROLES: IMTypeRole[] = [...HEADING_VARIANTS, ...TEXT_VARIANTS]
const TONES = Object.keys(IM_TONES).filter(
  (key): key is IMTone => key in IM_TONES,
)

/** The class list of the first element in `html`. */
function classesOf(html: string): string[] {
  const match = /class="([^"]*)"/.exec(html)
  return match?.[1]?.split(/\s+/) ?? []
}

function tagOf(html: string): string | undefined {
  return /^<([a-z0-9]+)/.exec(html)?.[1]
}

function isHeading(role: IMTypeRole): role is IMHeadingVariant {
  return HEADING_VARIANTS.some((variant) => variant === role)
}

function render(role: IMTypeRole, tone?: IMTone): string {
  return isHeading(role)
    ? renderToStaticMarkup(
        <IMHeading variant={role} tone={tone}>
          טקסט
        </IMHeading>,
      )
    : renderToStaticMarkup(
        <IMText variant={role} tone={tone}>
          טקסט
        </IMText>,
      )
}

describe('text roles', () => {
  it.each(ROLES)('%s renders its face, ladder step and weight', (role) => {
    const spec = ROLE_TABLE[role]
    const classes = classesOf(render(role))
    expect(classes).toContain(spec.step)
    expect(classes).toContain(spec.weight)
    if (spec.face === 'display') expect(classes).toContain('font-display')
    else
      expect(
        classes.some((c) => c.startsWith('font-display') || c === 'font-body'),
      ).toBe(false)
    // IM_TYPE_ROLES is what primitives that can't wrap IMText (IMLabel, dialog titles) compose.
    expect(classes).toEqual(
      expect.arrayContaining(IM_TYPE_ROLES[role].split(' ')),
    )
  })

  it('keeps the size class when a tone follows it (tailwind-merge must not read the step as a colour)', () => {
    for (const role of ROLES) {
      for (const tone of TONES) {
        const classes = classesOf(render(role, tone))
        expect(classes, `${role} + ${tone}`).toContain(ROLE_TABLE[role].step)
        expect(classes, `${role} + ${tone}`).toContain(IM_TONES[tone])
      }
    }
  })

  it('renders headings and text with their data slots and variants', () => {
    expect(renderToStaticMarkup(<IMTitle>כותרת</IMTitle>)).toContain(
      'data-slot="im-heading"',
    )
    expect(renderToStaticMarkup(<IMTitle>כותרת</IMTitle>)).toContain(
      'data-variant="title"',
    )
    expect(renderToStaticMarkup(<IMText variant="label">שם</IMText>)).toContain(
      'data-slot="im-text"',
    )
    expect(renderToStaticMarkup(<IMText variant="label">שם</IMText>)).toContain(
      'data-variant="label"',
    )
  })

  it('appends caller classes after the role (layout and alignment overrides)', () => {
    const classes = classesOf(
      renderToStaticMarkup(
        <IMHeadline className="text-center">לקוחות</IMHeadline>,
      ),
    )
    expect(classes).toContain('text-center')
    expect(classes).toContain('text-2xl')
  })

  it('lets weight emphasise body text without leaving two weights behind', () => {
    const classes = classesOf(
      renderToStaticMarkup(<IMText weight="bold">חשוב</IMText>),
    )
    expect(classes).toContain('font-bold')
    expect(classes).not.toContain('font-medium')
    expect(classes).toContain('text-base')
  })
})

describe('semantic element (`as`) is decoupled from the look', () => {
  it('gives each shortcut a sensible default element', () => {
    expect(tagOf(renderToStaticMarkup(<IMDisplay>₪12,400</IMDisplay>))).toBe(
      'h1',
    )
    expect(tagOf(renderToStaticMarkup(<IMHeadline>לקוחות</IMHeadline>))).toBe(
      'h1',
    )
    expect(tagOf(renderToStaticMarkup(<IMTitle>תורים</IMTitle>))).toBe('h2')
    expect(tagOf(renderToStaticMarkup(<IMSubtitle>נועה לוי</IMSubtitle>))).toBe(
      'h3',
    )
    expect(tagOf(renderToStaticMarkup(<IMText>הערה</IMText>))).toBe('p')
    expect(tagOf(renderToStaticMarkup(<IMCaption>לפני 5 דק׳</IMCaption>))).toBe(
      'p',
    )
  })

  it('changes the element and keeps the role classes', () => {
    const title = renderToStaticMarkup(<IMTitle as="h4">כותרת</IMTitle>)
    expect(tagOf(title)).toBe('h4')
    expect(classesOf(title)).toEqual(
      expect.arrayContaining(['text-lg', 'font-bold']),
    )

    const display = renderToStaticMarkup(
      <IMHeading variant="display" as="p">
        ₪12,400
      </IMHeading>,
    )
    expect(tagOf(display)).toBe('p')
    expect(classesOf(display)).toEqual(
      expect.arrayContaining(['font-display', 'text-3xl']),
    )

    const label = renderToStaticMarkup(
      <IMText as="span" variant="label">
        טלפון
      </IMText>,
    )
    expect(tagOf(label)).toBe('span')
    expect(classesOf(label)).toEqual(
      expect.arrayContaining(['text-sm', 'font-bold']),
    )
  })

  it('rejects block-level dir and label elements at compile time', () => {
    // A numeric run must be inline: block-level dir="ltr" flips the paragraph.
    const blockNumeric = (
      // @ts-expect-error `as="p"` is not an inline element
      <IMText numeric as="p">
        13:00–16:00
      </IMText>
    )
    // @ts-expect-error IMText has no dir prop; LTR runs go through numeric / IMNum
    const ltrParagraph = <IMText dir="ltr">abc</IMText>
    // @ts-expect-error nor does IMHeading
    const ltrHeading = <IMTitle dir="ltr">abc</IMTitle>
    // @ts-expect-error form labels are IMLabel (label.tsx), not IMText
    const labelElement = <IMText as="label">שם</IMText>
    expect([blockNumeric, ltrParagraph, ltrHeading, labelElement]).toHaveLength(
      4,
    )
  })
})

describe('tones come from tones.ts only', () => {
  it.each(TONES)(
    '%s tone maps to its token class on text and headings',
    (tone) => {
      expect(
        classesOf(renderToStaticMarkup(<IMText tone={tone}>x</IMText>)),
      ).toContain(IM_TONES[tone])
      expect(
        classesOf(renderToStaticMarkup(<IMTitle tone={tone}>x</IMTitle>)),
      ).toContain(IM_TONES[tone])
    },
  )

  it('defaults text and headings to the default tone and captions to muted', () => {
    expect(classesOf(renderToStaticMarkup(<IMText>x</IMText>))).toContain(
      'text-foreground',
    )
    expect(
      classesOf(renderToStaticMarkup(<IMHeadline>x</IMHeadline>)),
    ).toContain('text-foreground')
    expect(classesOf(renderToStaticMarkup(<IMCaption>x</IMCaption>))).toContain(
      'text-muted-foreground',
    )
    expect(
      classesOf(
        renderToStaticMarkup(<IMCaption tone="destructive">x</IMCaption>),
      ),
    ).toEqual(expect.arrayContaining(['text-destructive', 'text-xs']))
  })

  it('never emits a raw palette colour, letter-spacing, case transform, legacy font or breakpoint size', () => {
    const forbidden =
      /(?:^|-)(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\d|^tracking-|^(?:uppercase|lowercase|capitalize)$|^font-assistant$|^leading-|^(?:sm|md|lg|xl):text-|^text-(?:left|right)$|\[\d+px\]/
    for (const role of ROLES) {
      for (const tone of TONES) {
        for (const c of classesOf(render(role, tone)))
          expect(c, `${role} + ${tone}`).not.toMatch(forbidden)
      }
    }
  })
})

describe('numeric runs inside Hebrew', () => {
  it('IMText numeric renders an inline, isolated, tabular run', () => {
    const html = renderToStaticMarkup(
      <IMText variant="caption" tone="muted" numeric>
        13:00–16:00
      </IMText>,
    )
    expect(tagOf(html)).toBe('span')
    expect(html).toContain('dir="ltr"')
    expect(classesOf(html)).toEqual(
      expect.arrayContaining([
        'tabular-nums',
        'text-xs',
        'text-muted-foreground',
      ]),
    )
    const caption = renderToStaticMarkup(
      <IMCaption numeric as="small">
        052-705-1611
      </IMCaption>,
    )
    expect(tagOf(caption)).toBe('small')
    expect(caption).toContain('dir="ltr"')
  })

  it('IMNum keeps the surrounding role and only adds isolation and tabular figures', () => {
    const html = renderToStaticMarkup(
      <IMText variant="body-sm" tone="muted">
        <IMNum>132</IMNum> לקוחות · <IMNum>₪1,200</IMNum>
      </IMText>,
    )
    expect(html).toContain(
      '<span data-slot="im-num" dir="ltr" class="tabular-nums">132</span>',
    )
    expect(html).toContain(
      '<span data-slot="im-num" dir="ltr" class="tabular-nums">₪1,200</span>',
    )
  })

  it('leaves non-numeric text without a dir attribute', () => {
    expect(renderToStaticMarkup(<IMText>שלום</IMText>)).not.toContain('dir=')
    expect(renderToStaticMarkup(<IMTitle>שלום</IMTitle>)).not.toContain('dir=')
  })
})

describe('the ladder in styles.css', () => {
  const css = readFileSync(
    path.resolve(__dirname, '../../src/styles.css'),
    'utf8',
  )
  const theme = /@theme\s*\{([\s\S]*?)\n\}/.exec(css)?.[1] ?? ''
  const themeValue = (name: string) =>
    new RegExp(`--${name}:\\s*([^;]+);`).exec(theme)?.[1]?.trim()

  it.each(ROLES)(
    'defines the %s step at the approved size and line-height',
    (role) => {
      const { step, px, lh } = ROLE_TABLE[role]
      expect(themeValue(step), `--${step}`).toBe(`${px / 16}rem`)
      expect(
        Number(themeValue(`${step}--line-height`)),
        `--${step}--line-height`,
      ).toBe(lh)
    },
  )

  it('raises micro to 12px on touch screens', () => {
    expect(css).toMatch(
      /@media \(pointer: coarse\)\s*\{\s*:root\s*\{\s*--text-2xs:\s*0\.75rem;/,
    )
  })

  it('sets Assistant as the display face and Open Sans as the body face', () => {
    expect(themeValue('font-display')).toMatch(/^'Assistant'/)
    expect(themeValue('font-body')).toMatch(/^'Open Sans'/)
    expect(css).toContain('family=Assistant:wght@800&')
  })
})
