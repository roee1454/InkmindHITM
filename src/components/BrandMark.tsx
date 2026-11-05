import { cn } from '#/lib/utils.ts'
import { studioConfig } from '#/config/studio.config.ts'

const SIZES = {
  sm: { box: 'size-[38px]', text: 'text-sm' },
  md: { box: 'size-12', text: 'text-lg' },
  lg: { box: 'size-18', text: 'text-2xl' },
} as const

interface BrandMarkProps {
  size?: keyof typeof SIZES
  className?: string
}

/**
 * The studio's logo, read directly from the static branding asset defined in `studio.config.ts`.
 * Falls back to the studio monogram initials if no asset is available.
 */
export function BrandMark({ size = 'md', className }: BrandMarkProps) {
  const logo = studioConfig.logoAssetUrl || null
  const s = SIZES[size]

  const words = studioConfig.studioName.trim().split(/\s+/).filter(Boolean)
  const first = words[0]?.[0] ?? ''
  const second = words[1]?.[0] ?? ''
  const monogram =
    first && second
      ? (first + second).toUpperCase()
      : studioConfig.studioName.slice(0, 2).toUpperCase() || 'IM'

  return (
    <div className={cn('relative shrink-0', className)}>
      {logo ? (
        <img
          src={logo}
          alt={studioConfig.studioName}
          className={cn('rounded-full object-cover shadow-xs', s.box)}
        />
      ) : (
        <div
          className={cn(
            'flex items-center justify-center rounded-full bg-primary font-assistant font-extrabold text-primary-foreground shadow-xs',
            s.box,
            s.text,
          )}
        >
          {monogram}
        </div>
      )}
    </div>
  )
}
