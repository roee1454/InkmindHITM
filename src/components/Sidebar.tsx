import { Link, useNavigate } from '@tanstack/react-router'
import { Settings, LogOut, Bell, SidebarToggle } from '@/components/ui/icon'
import { Button } from '#/components/ui/button.tsx'
import { logout } from '#/features/auth/server/auth.ts'
import type { StaffRecord } from '#/integrations/pocketbase/types.ts'
import { useQuery } from '@tanstack/react-query'
import { getUnseenMessagesCount } from '#/features/conversations/server/messages.ts'
import { getUnreadNotificationsCount } from '#/features/notifications/server/notifications.ts'
import { getAiSettings } from '@/features/settings/server/ai'
import { cn } from '#/lib/utils.ts'
import { BrandMark } from '#/components/BrandMark.tsx'
import { ThemeModeControl } from '#/components/ThemeModeControl.tsx'
import { NAV_GROUPS } from '#/components/navigation.ts'
import { useSidebarCollapsed } from '#/hooks/useSidebarCollapsed.ts'
import { clearSessionCache } from '@/features/auth/utils/session-cache'

interface SidebarProps {
  staff: StaffRecord
  className?: string
}

const ROLE_LABELS: Record<string, string> = {
  owner: 'בעלים',
  admin: 'מנהל',
  staff: 'צוות',
}

export function Sidebar({ staff, className }: SidebarProps) {
  const navigate = useNavigate()
  // Counts update via the dashboard route's realtime subscriptions (direct cache
  // writes); these long intervals are only a fallback for a dropped SSE connection
  // (HITL-10 — three 15s polls used to run alongside realtime).
  const { data: unseenMessagesCount = 0 } = useQuery({
    queryKey: ['unseen-messages-count'],
    queryFn: () => getUnseenMessagesCount(),
    refetchInterval: 60000,
  })

  const { data: unreadNotificationsCount = 0 } = useQuery({
    queryKey: ['unread-notifications-count'],
    queryFn: () => getUnreadNotificationsCount(),
    refetchInterval: 60000,
  })

  const { data: aiSettings } = useQuery({
    queryKey: ['ai-settings'],
    queryFn: () => getAiSettings(),
    refetchInterval: 60000,
  })
  const aiEnabled = Boolean(aiSettings?.aiEnabled)

  const isAdmin = staff.role === 'owner' || staff.role === 'admin'
  const { collapsed, toggle } = useSidebarCollapsed()

  return (
    // `lg:flex`, not `lg:block` — the aside depends on flex-column for its `flex-1` nav and
    // the footer pinned to the bottom. Width transitions for the icon-only rail (track-b B6.6);
    // per-device only (useSidebarCollapsed), so nothing here needs to survive a different device.
    <aside
      data-app-chrome
      className={cn(
        'sticky top-0 hidden h-svh shrink-0 flex-col border-e border-border bg-card font-assistant transition-[width] duration-200 ease-native lg:flex',
        collapsed ? 'w-[76px]' : 'w-72',
        className,
      )}
    >
      <div
        className={cn(
          'flex items-center gap-2 border-b border-border p-5',
          collapsed ? 'flex-col justify-center' : 'justify-between',
        )}
      >
        <div className={cn('flex min-w-0 items-center gap-3', collapsed ? 'justify-center' : 'justify-start')}>
          <BrandMark size="sm" />
          {!collapsed && (
            <div className="flex min-w-0 flex-col items-start font-assistant">
              <h1 className="text-sm font-extrabold text-foreground">INKMIND</h1>
              <span className="text-2xs font-bold uppercase text-muted-foreground">
                ניהול סטודיו
              </span>
            </div>
          )}
        </div>

        <div className={cn('flex items-center gap-1', collapsed && 'flex-col')}>
          {/* Bell icon button for system notifications */}
          <Link
            to="/dashboard/notifications"
            activeProps={{ className: 'text-primary' }}
            inactiveProps={{ className: 'text-muted-foreground' }}
            className="tap-target relative"
            title="התראות מערכת"
          >
            <Bell size={18} />
            {unreadNotificationsCount > 0 && (
              <span className="absolute end-2 top-2 size-2 rounded-full bg-destructive ring-[1.5px] ring-card" />
            )}
          </Link>

          <button
            type="button"
            onClick={toggle}
            className="tap-target text-muted-foreground"
            title={collapsed ? 'הרחבת התפריט' : 'כיווץ התפריט'}
            aria-label={collapsed ? 'הרחבת התפריט' : 'כיווץ התפריט'}
          >
            <SidebarToggle size={18} />
          </button>
        </div>
      </div>

      {isAdmin && !collapsed && (
        <Link
          to="/dashboard/settings/ai"
          className="mx-5 mt-4 flex items-center justify-between rounded-2xl border border-border px-3.5 py-2.5 font-assistant text-sm font-bold text-muted-foreground transition-colors duration-150 active:bg-muted"
          title="הגדרות סוכן AI"
        >
          <span className="flex items-center gap-2">
            <span
              className={cn('size-2 rounded-full', aiEnabled ? 'bg-success' : 'bg-muted-foreground/40')}
            />
            סוכן AI
          </span>
          <span className={aiEnabled ? 'font-extrabold text-success' : 'text-muted-foreground'}>
            {aiEnabled ? 'פעיל' : 'כבוי'}
          </span>
        </Link>
      )}

      <nav aria-label="ניווט ראשי" className="flex-1 overflow-y-auto px-5 py-6">
        <div className="space-y-5">
          {NAV_GROUPS.map((group) => (
            <div key={group.label}>
              {!collapsed && (
                <p className="mb-1.5 px-3.5 text-2xs font-bold uppercase tracking-wide text-muted-foreground/70">
                  {group.label}
                </p>
              )}
              <ul className="space-y-1">
                {group.items.map((item) => (
                  <li key={item.to}>
                    <Link
                      to={item.to}
                      activeOptions={{ exact: item.exact }}
                      activeProps={{ className: 'bg-primary/10 text-primary font-extrabold' }}
                      inactiveProps={{
                        className: 'text-muted-foreground font-bold active:bg-muted',
                      }}
                      title={collapsed ? item.label : undefined}
                      className={cn(
                        'flex h-[46px] items-center rounded-2xl font-assistant text-sm transition-colors duration-150',
                        collapsed ? 'justify-center px-0' : 'justify-between px-3.5',
                      )}
                    >
                      {({ isActive }) => (
                        <>
                          <div className={cn('flex items-center', !collapsed && 'gap-2.5')}>
                            <item.icon size={18} />
                            {!collapsed && <span>{item.label}</span>}
                          </div>
                          {!collapsed && item.to === '/dashboard/conversations' && unseenMessagesCount > 0 && (
                            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-success px-1 text-2xs font-extrabold text-white">
                              {unseenMessagesCount}
                            </span>
                          )}
                          {!collapsed && !(item.to === '/dashboard/conversations' && unseenMessagesCount > 0) && isActive ? (
                            <span className="size-1.5 rounded-full bg-primary" />
                          ) : null}
                        </>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          <div className={cn('border-t border-border pt-3', collapsed && 'flex justify-center')}>
            <Link
              to={isAdmin ? '/dashboard/settings' : '/dashboard/settings/team'}
              activeProps={{ className: 'bg-primary/10 text-primary font-extrabold' }}
              inactiveProps={{ className: 'text-muted-foreground font-bold active:bg-muted' }}
              title={collapsed ? (isAdmin ? 'הגדרות' : 'הפרופיל שלי') : undefined}
              className={cn(
                'flex h-[46px] items-center rounded-2xl font-assistant text-sm transition-colors duration-150',
                collapsed ? 'justify-center px-0' : 'gap-2.5 px-3.5',
              )}
            >
              <Settings size={18} />
              {!collapsed && <span>{isAdmin ? 'הגדרות' : 'הפרופיל שלי'}</span>}
            </Link>
          </div>
        </div>
      </nav>

      <div className="border-t border-border p-5">
        {!collapsed && (
          <>
            <p className="font-assistant text-sm font-bold text-foreground">{staff.name}</p>
            <p className="font-assistant text-sm text-muted-foreground">
              {ROLE_LABELS[staff.role] ?? staff.role}
            </p>
            <ThemeModeControl className="mt-3" />
          </>
        )}
        <Button
          variant="ghost"
          size="sm"
          className={cn('mt-2 gap-2', collapsed ? 'w-full justify-center px-0' : 'w-full justify-start')}
          title={collapsed ? 'התנתקות' : undefined}
          onClick={async () => {
            clearSessionCache()
            await logout()
            navigate({ to: '/auth/login' })
          }}
        >
          <LogOut className="size-4" />
          {!collapsed && 'התנתקות'}
        </Button>
      </div>
    </aside>
  )
}
