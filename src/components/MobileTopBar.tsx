import type { ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { Bell, ChevronRight, Menu } from 'lucide-react'
import { cn } from '#/lib/utils.ts'
import { getUnreadNotificationsCount } from '#/features/notifications/server/notifications.ts'

interface MobileTopBarProps {
  title: string
  onOpenMenu: () => void
  /** When set, the leading button becomes a back-chevron calling this instead of opening the
   *  drawer — the single place app-wide a page's back-navigation lives. */
  onBack?: () => void
  className?: string
  /** Overrides the trailing bell with a page-specific action (e.g. "+" on customers/calendar). */
  action?: ReactNode
}

export function MobileTopBar({ title, onOpenMenu, onBack, className, action }: MobileTopBarProps) {
  // Same query key as Sidebar — shared cache, so this costs no extra network. The dashboard
  // route's realtime subscription writes this key directly.
  const { data: unreadNotificationsCount = 0 } = useQuery({
    queryKey: ['unread-notifications-count'],
    queryFn: () => getUnreadNotificationsCount(),
    refetchInterval: 60000,
  })

  return (
    <header
      data-app-chrome
      className={cn(
        'sticky top-0 z-30 flex h-14 shrink-0 items-center justify-between gap-2 border-b border-border bg-card px-2 [transform:translate3d(0,0,0)]',
        className,
      )}
    >
      {onBack ? (
        <button type="button" onClick={onBack} aria-label="חזרה" className="tap-target text-foreground">
          <ChevronRight size={20} />
        </button>
      ) : (
        <button type="button" onClick={onOpenMenu} aria-label="פתיחת תפריט" className="tap-target text-foreground">
          <Menu size={20} />
        </button>
      )}

      <span className="truncate font-assistant text-[17px] font-extrabold text-foreground">{title}</span>

      {action ?? (
        <Link
          to="/dashboard/notifications"
          aria-label="התראות מערכת"
          activeProps={{ className: 'text-primary' }}
          inactiveProps={{ className: 'text-foreground' }}
          className="tap-target relative"
        >
          <Bell size={20} />
          {unreadNotificationsCount > 0 && (
            <span className="absolute end-2 top-2 size-2 rounded-full bg-destructive ring-[1.5px] ring-card" />
          )}
        </Link>
      )}
    </header>
  )
}
