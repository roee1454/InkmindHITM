import * as React from 'react'
import { cn } from '@/lib/utils'
import { IM_TONES, type IMTone } from './tones'

/**
 * Inkmind typography: nine roles, two faces (docs/design-system/typography.md).
 *
 * - display · headline: Assistant 800 (`font-display`), through IMHeading.
 * - title · subtitle · body · body-sm · label · caption · micro: Open Sans, inherited from <body>.
 *
 * Each role is pinned to one step of the type ladder in styles.css; the step carries the
 * line-height, so no role adds `leading-*`. No `uppercase`, no `tracking-*` (Hebrew has no case,
 * and letter-spacing breaks its letterforms). Alignment is inherited (CSS `start`), so a centred
 * parent stays centred; override with `text-start` / `text-end`, never `text-left` / `text-right`.
 */
export const IM_TYPE_ROLES = {
  display: 'font-display text-3xl font-extrabold text-balance',
  headline: 'font-display text-2xl font-extrabold text-balance',
  title: 'text-lg font-bold',
  subtitle: 'text-base font-semibold',
  body: 'text-base font-medium',
  'body-sm': 'text-sm font-medium',
  label: 'text-sm font-bold',
  caption: 'text-xs font-medium',
  micro: 'text-2xs font-semibold',
} as const

export type IMTypeRole = keyof typeof IM_TYPE_ROLES
export type IMHeadingVariant = 'display' | 'headline' | 'title' | 'subtitle'
export type IMTextVariant = Exclude<IMTypeRole, IMHeadingVariant>

/** Emphasis inside running text only; never a way to fake another role. */
const IM_TEXT_WEIGHTS = {
  medium: 'font-medium',
  semibold: 'font-semibold',
  bold: 'font-bold',
} as const

export type IMTextWeight = keyof typeof IM_TEXT_WEIGHTS

/** `Omit` that keeps a union's branches apart (the built-in one merges them). */
type DistributiveOmit<T, K extends PropertyKey> = T extends unknown
  ? Omit<T, K>
  : never

// ---------------------------------------------------------------------------------------------
// Headings
// ---------------------------------------------------------------------------------------------

export type IMHeadingElement =
  'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'p' | 'span' | 'div'

/** The element each heading role renders when `as` is not given. */
const IM_HEADING_ELEMENTS: Record<IMHeadingVariant, IMHeadingElement> = {
  display: 'h1',
  headline: 'h1',
  title: 'h2',
  subtitle: 'h3',
}

export interface IMHeadingProps extends Omit<
  React.HTMLAttributes<HTMLHeadingElement>,
  'dir'
> {
  /** The look. Independent of `as`. */
  variant?: IMHeadingVariant
  /** The semantic element (document outline level). Independent of `variant`. */
  as?: IMHeadingElement
  tone?: IMTone
}

export function IMHeading({
  variant = 'title',
  as,
  tone = 'default',
  className,
  ...props
}: IMHeadingProps) {
  const Component: React.ElementType = as ?? IM_HEADING_ELEMENTS[variant]
  return (
    <Component
      data-slot="im-heading"
      data-variant={variant}
      {...props}
      className={cn(IM_TYPE_ROLES[variant], IM_TONES[tone], className)}
    />
  )
}

export type IMHeadingShortcutProps = Omit<IMHeadingProps, 'variant'>

/** One hero figure or question per screen (dashboard total, onboarding question). */
export function IMDisplay(props: IMHeadingShortcutProps) {
  return <IMHeading variant="display" {...props} />
}

/** The page title; full-screen sheet and drawer titles. */
export function IMHeadline(props: IMHeadingShortcutProps) {
  return <IMHeading variant="headline" {...props} />
}

/** Card headers, section titles, dialog and sheet titles. */
export function IMTitle(props: IMHeadingShortcutProps) {
  return <IMHeading variant="title" {...props} />
}

/** Sub-sections, and a row's primary line (a customer's name). */
export function IMSubtitle(props: IMHeadingShortcutProps) {
  return <IMHeading variant="subtitle" {...props} />
}

// ---------------------------------------------------------------------------------------------
// Text
// ---------------------------------------------------------------------------------------------

export type IMTextBlockElement = 'p' | 'div' | 'li' | 'dt' | 'dd'
export type IMTextInlineElement = 'span' | 'strong' | 'em' | 'small'

/** `dir` is left out on purpose: block-level `dir="ltr"` flips a paragraph's alignment and
 *  punctuation. LTR runs inside Hebrew go through `numeric` or `IMNum`, which are inline. */
interface IMTextOwnProps extends Omit<
  React.HTMLAttributes<HTMLElement>,
  'dir'
> {
  variant?: IMTextVariant
  tone?: IMTone
  weight?: IMTextWeight
}

export type IMTextProps = IMTextOwnProps &
  (
    | { numeric?: false; as?: IMTextBlockElement | IMTextInlineElement }
    /** The whole element is a number, money, phone or time range: tabular figures plus an
     *  inline `dir="ltr"`, which isolates the run (`unicode-bidi: isolate`). Inline elements only. */
    | { numeric: true; as?: IMTextInlineElement }
  )

export function IMText({
  variant = 'body',
  tone = 'default',
  weight,
  numeric = false,
  as,
  className,
  ...props
}: IMTextProps) {
  const Component: React.ElementType = as ?? (numeric ? 'span' : 'p')
  return (
    <Component
      data-slot="im-text"
      data-variant={variant}
      {...props}
      dir={numeric ? 'ltr' : undefined}
      className={cn(
        IM_TYPE_ROLES[variant],
        IM_TONES[tone],
        weight && IM_TEXT_WEIGHTS[weight],
        numeric && 'tabular-nums',
        className,
      )}
    />
  )
}

export type IMCaptionProps = DistributiveOmit<IMTextProps, 'variant'>

/** Timestamps, footnotes, meta lines. Muted unless told otherwise. */
export function IMCaption({ tone = 'muted', ...props }: IMCaptionProps) {
  return <IMText variant="caption" tone={tone} {...props} />
}

export type IMNumProps = Omit<React.HTMLAttributes<HTMLSpanElement>, 'dir'>

/**
 * A number, amount, phone, time range, email or URL inside Hebrew text: `₪1,200`, `052-705-1611`,
 * `13:00–16:00`. Keeps the surrounding role (size, weight, tone) and adds tabular figures plus an
 * isolated LTR run, so RTL reordering can't flip `13:00–16:00` into `16:00–13:00`.
 */
export function IMNum({ className, ...props }: IMNumProps) {
  return (
    <span
      data-slot="im-num"
      {...props}
      dir="ltr"
      className={cn('tabular-nums', className)}
    />
  )
}
