import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { IMBadge } from '@/components/ui/badge'
import { IMButton } from '@/components/ui/button'
import { IMCard, IMCardContent, IMCardHeader, IMCardTitle, IMListRow } from '@/components/ui/card'
import { IMCheckbox } from '@/components/ui/checkbox'
import { IMDialogActions } from '@/components/ui/responsive-dialog'
import { IMChip } from '@/components/ui/chip'
import { IMInput } from '@/components/ui/input'
import { IMLabel } from '@/components/ui/label'
import { IMSkeleton } from '@/components/ui/skeleton'
import { IMStatusLabel } from '@/components/ui/status-label'
import { IMSwitch } from '@/components/ui/switch'
import { IMTabs, IMTabsList, IMTabsTrigger } from '@/components/ui/tabs'
import { IMTextarea } from '@/components/ui/textarea'

const classOf = (html: string) => /class="([^"]*)"/.exec(html)?.[1]?.split(' ') ?? []
/** The class lists of every IMIcon in the markup, in order. */
const icons = (html: string) =>
  [...html.matchAll(/<svg[^>]*data-slot="im-icon"[^>]*class="([^"]*)"/g)].map((m) => m[1]?.split(' ') ?? [])

// Typography and icons have their own suites (typography.test.tsx, icon.test.tsx).
describe('IMButton', () => {
  it('defaults to the primary variant and md size, on the 10px control radius', () => {
    const html = renderToStaticMarkup(<IMButton>שמירה</IMButton>)
    expect(html).toContain('data-variant="primary"')
    expect(html).toContain('data-size="md"')
    const classes = classOf(html)
    expect(classes).toContain('rounded-lg')
    expect(classes).toContain('bg-primary')
    // 44 on desktop, 48 on touch — through a variable, so a caller's `h-9` still wins everywhere.
    expect(classes).toContain('h-(--im-control-h)')
    expect(classes).toContain('pointer-coarse:[--im-control-h:calc(var(--spacing)*12)]')
    expect(classes).not.toContain('font-assistant')
  })

  it("a caller's height replaces the md height on every device", () => {
    const classes = classOf(renderToStaticMarkup(<IMButton className="h-9">א</IMButton>))
    expect(classes).toContain('h-9')
    expect(classes).not.toContain('h-(--im-control-h)')
  })

  it('sizes: sm 40, lg 56 full width, icon and icon-sm squares', () => {
    expect(classOf(renderToStaticMarkup(<IMButton size="sm">א</IMButton>))).toContain('h-10')
    const lg = classOf(renderToStaticMarkup(<IMButton size="lg">א</IMButton>))
    expect(lg).toEqual(expect.arrayContaining(['h-14', 'w-full']))
    expect(classOf(renderToStaticMarkup(<IMButton size="icon" aria-label="א" />))).toContain('size-11')
    expect(classOf(renderToStaticMarkup(<IMButton size="icon-sm" aria-label="א" />))).toContain('size-10')
  })

  it('a link drops the box and the press scale', () => {
    const classes = classOf(renderToStaticMarkup(<IMButton variant="link">פרטים</IMButton>))
    expect(classes).toEqual(expect.arrayContaining(['h-auto', 'px-0', 'underline', 'text-accent-ink']))
    expect(classes).not.toContain('h-(--im-control-h)')
  })

  it('loading disables the button, marks it busy and leads with a spinner', () => {
    const html = renderToStaticMarkup(<IMButton loading>שומר…</IMButton>)
    expect(html).toContain('disabled=""')
    expect(html).toContain('aria-busy="true"')
    expect(html.indexOf('<svg')).toBeLessThan(html.indexOf('שומר…'))
  })

  it('icon and iconEnd frame the label, sized to the button', () => {
    const html = renderToStaticMarkup(
      <IMButton icon="plus" iconEnd="chevron-end">
        לקוח חדש
      </IMButton>,
    )
    const [lead, trail] = icons(html)
    expect(lead).toContain('size-5')
    expect(trail).toContain('size-5')
    expect(html.indexOf('data-slot="im-icon"')).toBeLessThan(html.indexOf('לקוח חדש'))
    expect(html.lastIndexOf('data-slot="im-icon"')).toBeGreaterThan(html.indexOf('לקוח חדש'))
    expect(icons(renderToStaticMarkup(<IMButton size="sm" icon="plus">א</IMButton>))[0]).toContain('size-4')
    expect(icons(renderToStaticMarkup(<IMButton size="icon" icon="trash" aria-label="מחיקה" />))[0]).toContain('size-6')
  })

  it('loading puts the spinner in the icon slot, so a button with an icon keeps its width', () => {
    const html = renderToStaticMarkup(
      <IMButton icon="save" loading>
        שומר…
      </IMButton>,
    )
    const all = icons(html)
    expect(all).toHaveLength(1)
    expect(all[0]).toContain('motion-safe:animate-spin')
    expect(html).toContain('שומר…')
  })

  it('asChild keeps its icons inside the slotted link', () => {
    const html = renderToStaticMarkup(
      <IMButton asChild icon="plus">
        <a href="/x">פרויקט חדש</a>
      </IMButton>,
    )
    expect(html).toMatch(/^<a href="\/x" data-slot="button"[^>]*><svg[^>]*data-slot="im-icon"/)
    expect(html).toContain('פרויקט חדש</a>')
  })

  it('loading an icon-only button swaps the glyph for the spinner, so the square holds', () => {
    const html = renderToStaticMarkup(
      <IMButton size="icon" aria-label="מחיקה" loading>
        <span data-testid="glyph" />
      </IMButton>,
    )
    expect(html).not.toContain('data-testid="glyph"')
    expect(html.match(/<svg/g)).toHaveLength(1)
  })
})

describe('IMBadge', () => {
  it('defaults to muted, and the cva and the component agree on it', () => {
    const html = renderToStaticMarkup(<IMBadge>טיוטה</IMBadge>)
    expect(html).toContain('data-variant="muted"')
    expect(classOf(html)).toContain('bg-surface-2')
  })

  it('takes an xs icon', () => {
    expect(icons(renderToStaticMarkup(<IMBadge icon="check">שולם</IMBadge>))[0]).toContain('size-3')
  })

  it('renders the status roles without a hue: new is an outline, dead a filled grey', () => {
    expect(classOf(renderToStaticMarkup(<IMBadge variant="new">חדש</IMBadge>))).toContain('border-status-new-border')
    expect(classOf(renderToStaticMarkup(<IMBadge variant="dead">אבוד</IMBadge>))).toContain('bg-status-dead-soft')
  })
})

describe('IMCard and IMListRow', () => {
  it('renders the header, the title role and the content', () => {
    const html = renderToStaticMarkup(
      <IMCard>
        <IMCardHeader>
          <IMCardTitle>תורים וסשנים</IMCardTitle>
        </IMCardHeader>
        <IMCardContent>תוכן</IMCardContent>
      </IMCard>,
    )
    expect(html).toContain('data-slot="card"')
    // IMTitle: an <h2> by default, 17/700.
    expect(html).toMatch(/<h2 data-slot="card-title"[^>]*class="text-lg font-bold/)
    expect(html).toContain('תוכן')
  })

  it('a flush card marks itself so its content drops the padding', () => {
    const html = renderToStaticMarkup(
      <IMCard variant="flush">
        <IMCardContent>
          <IMListRow>דניאל כהן</IMListRow>
        </IMCardContent>
      </IMCard>,
    )
    expect(html).toContain('data-variant="flush"')
    expect(html).toContain('group-data-[variant=flush]/card:px-0')
  })

  it('a row rendered asChild (a button) gets the pressed state; a plain row does not', () => {
    const asButton = renderToStaticMarkup(
      <IMListRow asChild>
        <button type="button">פתיחה</button>
      </IMListRow>,
    )
    expect(asButton).toMatch(/^<button/)
    expect(classOf(asButton)).toContain('active:bg-surface-2')
    expect(classOf(renderToStaticMarkup(<IMListRow>שורה</IMListRow>))).not.toContain('active:bg-surface-2')
  })
})

describe('form controls', () => {
  it("a caller's height and text size replace the control defaults on every device", () => {
    const classes = classOf(renderToStaticMarkup(<IMInput className="h-9 text-xs" />))
    expect(classes).toEqual(expect.arrayContaining(['h-9', 'text-xs']))
    expect(classes).not.toContain('h-(--im-control-h)')
    expect(classes).not.toContain('text-(length:--im-control-fs)')
  })

  it('IMInput, IMTextarea and IMLabel render on the shared control surface', () => {
    const html = renderToStaticMarkup(
      <div>
        <IMLabel htmlFor="name">שם לקוח</IMLabel>
        <IMInput id="name" placeholder="דניאל כהן" />
        <IMTextarea placeholder="הערות" />
      </div>,
    )
    expect(html).toContain('for="name"')
    expect(html.match(/rounded-lg/g)?.length).toBeGreaterThanOrEqual(2)
    expect(html).not.toContain('font-assistant')
  })

  it('IMCheckbox and IMSwitch render their Radix roles', () => {
    expect(renderToStaticMarkup(<IMCheckbox />)).toContain('role="checkbox"')
    expect(renderToStaticMarkup(<IMSwitch />)).toContain('role="switch"')
  })
})

describe('IMTabs', () => {
  it('shows an optional count after the label', () => {
    const html = renderToStaticMarkup(
      <IMTabs defaultValue="all">
        <IMTabsList>
          <IMTabsTrigger value="all" count={57}>
            הכל
          </IMTabsTrigger>
          <IMTabsTrigger value="vip">VIP</IMTabsTrigger>
        </IMTabsList>
      </IMTabs>,
    )
    expect(html).toContain('data-slot="tabs-count"')
    expect(html.match(/data-slot="tabs-count"/g)).toHaveLength(1)
    expect(html).toMatch(/data-slot="tabs-count"[^>]*dir="ltr"[^>]*>57</)
  })

  it('takes an sm icon', () => {
    const html = renderToStaticMarkup(
      <IMTabs defaultValue="all">
        <IMTabsList>
          <IMTabsTrigger value="all" icon="users">
            הכל
          </IMTabsTrigger>
        </IMTabsList>
      </IMTabs>,
    )
    expect(icons(html)[0]).toContain('size-4')
  })
})

describe('IMChip', () => {
  it('reports its state as aria-pressed and fills with primary when selected', () => {
    const on = renderToStaticMarkup(<IMChip selected>30 יום</IMChip>)
    expect(on).toContain('aria-pressed="true"')
    expect(classOf(on)).toContain('bg-primary')
    const off = renderToStaticMarkup(<IMChip count={4}>פעילים</IMChip>)
    expect(off).toContain('aria-pressed="false"')
    expect(off).toContain('type="button"')
    expect(off).toContain('data-slot="chip-count"')
  })

  it('takes an sm icon', () => {
    expect(icons(renderToStaticMarkup(<IMChip icon="filter">סינון</IMChip>))[0]).toContain('size-4')
  })
})

describe('IMDialogActions', () => {
  it('puts the error first, then the confirming action, cancel, and the secondary action — the DOM order is the reading order', () => {
    const html = renderToStaticMarkup(
      <IMDialogActions error="השמירה נכשלה." secondary={<IMButton variant="ghost">מחיקה</IMButton>}>
        <IMButton>שמירה</IMButton>
        <IMButton variant="ghost">ביטול</IMButton>
      </IMDialogActions>,
    )
    const order = ['השמירה נכשלה.', 'שמירה<', 'ביטול', 'מחיקה'].map((text) => html.indexOf(text))
    expect(order.every((at) => at >= 0)).toBe(true)
    expect([...order].sort((a, b) => a - b)).toEqual(order)
    expect(html).toContain('role="alert"')
    // The two main actions share the row equally.
    expect(html).toContain('*:flex-1')
  })
})

describe('feedback', () => {
  it('IMSkeleton is a surface-2 block that stops pulsing under reduced motion', () => {
    const classes = classOf(renderToStaticMarkup(<IMSkeleton className="h-6 w-24" />))
    expect(classes).toEqual(expect.arrayContaining(['bg-surface-2', 'motion-reduce:animate-none', 'h-6', 'w-24']))
  })

  it('IMStatusLabel keeps the colour in the dot', () => {
    const html = renderToStaticMarkup(<IMStatusLabel role="done">שולם</IMStatusLabel>)
    expect(html).toContain('bg-status-done')
    expect(html).toContain('שולם')
  })
})
