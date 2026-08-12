import * as React from 'react'
import { cn } from '#/lib/utils.ts'

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
 * The studio's logo, falling back to the "IM" wordmark. Replaces four hand-duplicated copies
 * of this block (auth/login, auth/setup, onboarding/route, Sidebar). Solid circle badge — no
 * gradient, sparkle, or glow.
 *
 * The logo is a base64 data URL in localStorage (written by the onboarding profile step), so
 * it must be read in an effect — reading during render would desync the SSR markup from the
 * client and trip a hydration mismatch.
 */
export function BrandMark({ size = 'md', className }: BrandMarkProps) {
  const [logo, setLogo] = React.useState<string | null>(null)

  React.useEffect(() => {
    setLogo(localStorage.getItem('studio_logo'))
  }, [])

  const s = SIZES[size]

  return (
    <div className={cn('relative shrink-0', className)}>
      {logo ? (
        <img
          src={logo}
          alt=""
          className={cn('rounded-full object-cover shadow-md', s.box)}
        />
      ) : (
        <div
          className={cn(
            'flex items-center justify-center rounded-full bg-primary font-assistant font-extrabold text-primary-foreground shadow-md',
            s.box,
            s.text,
          )}
        >
          IM
        </div>
      )}
    </div>
  )
}
