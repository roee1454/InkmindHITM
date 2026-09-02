import { useQuery } from '@tanstack/react-query'
import { cn } from '#/lib/utils.ts'
import { getSettings } from '#/features/onboarding/server/onboarding.ts'

const SIZES = {
  sm: { box: 'size-[38px]', text: 'text-sm' },
  md: { box: 'size-12', text: 'text-lg' },
  lg: { box: 'size-18', text: 'text-2xl' },
} as const

interface BrandMarkProps {
  size?: keyof typeof SIZES
  className?: string
}

/** Builds the browser-reachable Pocketbase file URL for the studio's uploaded logo. */
function logoUrl(recordId: string, filename: string): string {
  const base = import.meta.env.VITE_POCKETBASE_URL ?? 'http://127.0.0.1:8090'
  return `${base}/api/files/settings/${recordId}/${encodeURIComponent(filename)}`
}

/**
 * The studio's logo, falling back to the "IM" wordmark. Replaces four hand-duplicated copies
 * of this block (auth/login, auth/setup, onboarding/route, Sidebar). Solid circle badge — no
 * gradient, sparkle, or glow.
 *
 * The logo is stored on the `settings` singleton record (uploaded via GeneralSettingsTab), so
 * it's fetched through the same `['settings']` query used there — cache is shared, no extra
 * request on pages where settings are already loaded.
 */
export function BrandMark({ size = 'md', className }: BrandMarkProps) {
  const { data } = useQuery({ queryKey: ['settings'], queryFn: () => getSettings() })
  const logo = data?.id && data.logo ? logoUrl(data.id, data.logo as string) : null

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
