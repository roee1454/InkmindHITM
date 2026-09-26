import { Link } from '@tanstack/react-router'
import { cn } from '@/lib/utils'

const TABS = [
  { to: '/dashboard/projects', label: 'פרויקטים' },
  { to: '/dashboard/leads', label: 'לידים' },
] as const

/**
 * Mobile-only switch between the two pipeline pages (track-b B6.7): the bottom tab bar has one
 * combined "צינורת" slot for both, so this is how a phone flips between them. Desktop shows both
 * as separate sidebar links and never renders this.
 */
export function PipelineMobileSwitch({ active }: { active: 'projects' | 'leads' }) {
  return (
    <div className="flex gap-2 lg:hidden" role="group" aria-label="מעבר בין פרויקטים ללידים" dir="rtl">
      {TABS.map((tab) => {
        const isActive = tab.to === `/dashboard/${active}`
        return (
          <Link
            key={tab.to}
            to={tab.to}
            className={cn(
              'flex h-9 flex-1 items-center justify-center rounded-xl text-sm font-bold transition-all duration-150 ease-native active:scale-[0.97]',
              isActive ? 'bg-primary text-primary-foreground shadow-xs' : 'border border-border bg-muted/60 text-muted-foreground',
            )}
          >
            {tab.label}
          </Link>
        )
      })}
    </div>
  )
}
