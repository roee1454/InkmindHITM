import { cn } from '@/lib/utils'
import { IM_ICONS, IM_ICON_MIRROR_CLASS } from './icon-registry'
import type { IMIconName } from './icon-registry'
import { IM_ARTIST_TONES, IM_TONES } from './tones'
import type { IMArtistTone, IMTone } from './tones'

export type { IMIconName } from './icon-registry'

// INTERIM: the lucide-named exports (`Trash2`, `Loader2`…), deleted in plan Phase 3, item 3.1.
export * from './icon-legacy'

/** Tokens only: xs 12 · sm 16 · md 20 · lg 24 · xl 32 px. */
const SIZES = {
  xs: { px: 12, className: 'size-3' },
  sm: { px: 16, className: 'size-4' },
  md: { px: 20, className: 'size-5' },
  lg: { px: 24, className: 'size-6' },
  xl: { px: 32, className: 'size-8' },
} as const

export type IMIconSize = keyof typeof SIZES

export type IMIconTone = IMTone | IMArtistTone

const TONES: Record<IMIconTone, string> = { ...IM_TONES, ...IM_ARTIST_TONES }

export type IMIconProps<N extends IMIconName = IMIconName> = {
  /** What the icon means. The registry decides glyph, weight and RTL mirroring. */
  name: N
  size?: IMIconSize
  /** `inherit` (default) takes the colour of what holds it: a button, badge or menu item. */
  tone?: IMIconTone
  /** Makes the icon meaningful (`role="img"` + `aria-label`). Without it the icon is decorative. */
  label?: string
  /** Rotates the `spinner` — no other icon spins. Paused under reduced motion. */
  spin?: N extends 'spinner' ? boolean : never
  /** Layout only (margins, position, visibility). Size and colour go through `size` and `tone`. */
  className?: string
}

/**
 * A filled icon from the closed registry: `<IMIcon name="calendar" size="sm" tone="muted" />`.
 * Rules, sizes by context and the full name table: docs/design-system/icons.md.
 */
export function IMIcon<N extends IMIconName>({
  name,
  size = 'md',
  tone = 'inherit',
  label,
  spin,
  className,
}: IMIconProps<N>) {
  const { glyph: Glyph, weight, mirrorInRtl } = IM_ICONS[name]
  const a11y = label
    ? { role: 'img', 'aria-label': label }
    : { 'aria-hidden': true }
  return (
    <Glyph
      data-slot="im-icon"
      size={SIZES[size].px}
      weight={weight}
      {...a11y}
      className={cn(
        'shrink-0',
        SIZES[size].className,
        // `inherit` adds no class: a holder that colours its icons (a menu item's muted glyph)
        // keeps doing so, and anywhere else the SVG's `currentColor` already inherits.
        tone !== 'inherit' && TONES[tone],
        mirrorInRtl && IM_ICON_MIRROR_CLASS,
        spin && 'motion-safe:animate-spin',
        className,
      )}
    />
  )
}
