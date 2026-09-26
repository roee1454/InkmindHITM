import { Link, useLocation } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { cn } from '#/lib/utils.ts'
import { getUnseenMessagesCount } from '#/features/conversations/server/messages.ts'
import { MOBILE_NAV_ITEMS } from './navigation.ts'
import type { NavItem } from './navigation.ts'

function isItemActive(item: NavItem, pathname: string): boolean {
  if (item.activeMatch) return item.activeMatch(pathname)
  return item.exact ? pathname === item.to : pathname.startsWith(item.to)
}

interface MobileBottomNavProps {
  className?: string
}

/**
 * Fixed bottom tab bar — the primary navigation below `lg`.
 *
 * NOTE: the `h-16` below and the `4rem` inside `--app-bottom-nav-h` (src/styles.css) describe
 * the same bar and must be changed together. The safe-area padding lives on the nav itself so
 * its background extends into the home-indicator area, while the custom property accounts for
 * `4rem + inset` so page content clears the whole thing.
 */
export function MobileBottomNav({ className }: MobileBottomNavProps) {
  const location = useLocation()
  const { data: unseenMessagesCount = 0 } = useQuery({
    queryKey: ['unseen-messages-count'],
    queryFn: () => getUnseenMessagesCount(),
    refetchInterval: 60000,
  })

  return (
    <nav
      data-app-chrome
      aria-label="ניווט ראשי"
      // z-40 sits below sheets/dialogs (z-50) and toasts (z-[9999]) — deliberate.
      className={cn(
        'fixed inset-x-0 bottom-0 z-40 select-none border-t border-border bg-card',
        className,
      )}
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <ul className="flex h-16 items-stretch">
        {MOBILE_NAV_ITEMS.map((item) => {
          const active = isItemActive(item, location.pathname)
          return (
            <li key={item.to} className="flex-1">
              <Link
                to={item.to}
                className={cn(
                  'relative flex h-full flex-col items-center justify-center gap-1 font-assistant text-xs no-underline transition-colors duration-150 hover:no-underline active:no-underline active:bg-muted',
                  active ? 'text-primary font-extrabold' : 'text-muted-foreground font-bold',
                )}
              >
                {active && <span className="absolute inset-x-4 top-0 h-0.5 rounded-full bg-primary" />}
                <span className="relative">
                  <item.icon size={22} />
                  {item.to === '/dashboard/conversations' && unseenMessagesCount > 0 && (
                    <span className="absolute -top-1.5 -end-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-success px-1 text-2xs font-extrabold leading-none text-white">
                      {unseenMessagesCount}
                    </span>
                  )}
                </span>
                <span>{item.label}</span>
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
