import * as React from 'react'
import { cn } from '#/lib/utils.ts'

const SIZES = {
  sm: { box: 'size-8', text: 'text-sm', radius: 'rounded-full' },
  md: { box: 'size-11', text: 'text-base', radius: 'rounded-full' },
  lg: { box: 'size-12', text: 'text-lg', radius: 'rounded-full' },
} as const

interface BrandMarkProps {
  size?: keyof typeof SIZES
  className?: string
  /** The ambient blur behind the mark. Off inside dense chrome like the drawer header. */
  glow?: boolean
}

/**
 * The studio's logo, falling back to the "IM" wordmark. Replaces four hand-duplicated copies
 * of this block (auth/login, auth/setup, onboarding/route, Sidebar).
 *
 * The logo is a base64 data URL in localStorage (written by the onboarding profile step), so
 * it must be read in an effect — reading during render would desync the SSR markup from the
 * client and trip a hydration mismatch.
 */
export function BrandMark({ size = 'md', className, glow = true }: BrandMarkProps) {
  const [logo, setLogo] = React.useState<string | null>(null)

  React.useEffect(() => {
    setLogo(localStorage.getItem('studio_logo'))
  }, [])

  const s = SIZES[size]

  return (
    <div className={cn('relative shrink-0', className)}>
      {glow && <div className={cn('absolute inset-0 bg-primary/20 blur-lg', s.radius)} />}
      {logo ? (
        <img
          src={logo}
          alt=""
          className={cn(
            'relative border-2 border-primary/40 object-cover shadow-xs',
            s.box,
            s.radius,
          )}
        />
      ) : (
        <div
          className={cn(
            'relative flex items-center justify-center border-2 border-primary/40 bg-primary font-assistant font-black text-primary-foreground shadow-md',
            s.box,
            s.text,
            s.radius,
          )}
        >
          IM
        </div>
      )}
    </div>
  )
}
