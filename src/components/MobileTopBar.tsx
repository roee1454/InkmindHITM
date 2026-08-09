import { Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { Bell, Menu } from 'lucide-react'
import { cn } from '#/lib/utils.ts'
import { getUnreadNotificationsCount } from '#/features/notifications/server/notifications.ts'

interface MobileTopBarProps {
  title: string
  onOpenMenu: () => void
  className?: string
}

export function MobileTopBar({ title, onOpenMenu, className }: MobileTopBarProps) {
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
        'sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between gap-2 border-b border-border bg-card/95 px-4 backdrop-blur-md',
        className,
      )}
    >
      <button
        type="button"
        onClick={onOpenMenu}
        aria-label="פתיחת תפריט"
        className="flex size-11 items-center justify-center rounded-xl text-muted-foreground transition-colors duration-150 hover:bg-accent hover:text-foreground active:bg-accent active:text-foreground"
      >
        <Menu size={20} />
      </button>

      <span className="truncate font-assistant text-base font-black text-foreground">{title}</span>

      <Link
        to="/dashboard/notifications"
        aria-label="התראות מערכת"
        activeProps={{ className: 'text-primary' }}
        inactiveProps={{ className: 'text-muted-foreground' }}
        className="relative flex size-11 items-center justify-center rounded-xl transition-colors duration-150 hover:bg-accent active:bg-accent"
      >
        <Bell size={18} />
        {unreadNotificationsCount > 0 && (
          <span className="absolute end-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-micro font-black leading-none text-white">
            {unreadNotificationsCount}
          </span>
        )}
      </Link>
    </header>
  )
}
