import { Link, useNavigate } from '@tanstack/react-router'
import { Settings, LogOut, Bell } from 'lucide-react'
import { Button } from '#/components/ui/button.tsx'
import { logout } from '#/features/auth/server/auth.ts'
import type { StaffRecord } from '#/integrations/pocketbase/types.ts'
import { useQuery } from '@tanstack/react-query'
import { getUnseenMessagesCount } from '#/features/conversations/server/messages.ts'
import { getUnreadNotificationsCount } from '#/features/notifications/server/notifications.ts'
import { getAiSettings } from '@/features/settings/server/ai'
import { cn } from '#/lib/utils.ts'
import { BrandMark } from '#/components/BrandMark.tsx'
import { NAV_ITEMS } from '#/components/navigation.ts'
import { clearSessionCache } from '@/routes/dashboard/route'

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

  return (
    // `lg:flex`, not `lg:block` — the aside depends on flex-column for its `flex-1` nav and
    // the footer pinned to the bottom.
    <aside
      data-app-chrome
      className={cn(
        'sticky top-0 hidden h-svh w-72 shrink-0 flex-col border-e border-border bg-card font-assistant lg:flex',
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2 border-b border-border/60 p-5">
        <div className="flex min-w-0 items-center justify-start gap-3">
          <BrandMark size="sm" />
          <div className="flex min-w-0 flex-col items-start font-assistant">
            <h1 className="text-sm font-extrabold text-foreground">INKMIND</h1>
            <span className="text-[11px] font-bold uppercase text-muted-foreground">
              ניהול סטודיו
            </span>
          </div>
        </div>

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
      </div>

      <Link
        to="/dashboard/settings/ai"
        className="mx-5 mt-4 flex items-center justify-between rounded-2xl border border-border/80 px-3.5 py-2.5 font-assistant text-[13px] font-bold text-muted-foreground transition-colors duration-150 active:bg-muted"
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

      <nav aria-label="ניווט ראשי" className="flex-1 px-5 py-6">
        <ul className="space-y-1">
          {NAV_ITEMS.map((item) => (
            <li key={item.to}>
              <Link
                to={item.to}
                activeOptions={{ exact: item.exact }}
                activeProps={{ className: 'bg-primary/10 text-primary font-extrabold' }}
                inactiveProps={{
                  className: 'text-muted-foreground font-bold active:bg-muted',
                }}
                className="flex h-[46px] items-center justify-between rounded-2xl px-3.5 font-assistant text-sm transition-colors duration-150"
              >
                {({ isActive }) => (
                  <>
                    <div className="flex items-center gap-2.5">
                      <item.icon size={18} />
                      <span>{item.label}</span>
                    </div>
                    {item.to === '/dashboard/conversations' && unseenMessagesCount > 0 && (
                      <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-success px-1 text-[10px] font-extrabold text-white">
                        {unseenMessagesCount}
                      </span>
                    )}
                    {!(item.to === '/dashboard/conversations' && unseenMessagesCount > 0) && isActive ? (
                      <span className="size-1.5 rounded-full bg-primary" />
                    ) : null}
                  </>
                )}
              </Link>
            </li>
          ))}

          <li>
            <Link
              to="/dashboard/settings"
              activeProps={{ className: 'bg-primary/10 text-primary font-extrabold' }}
              inactiveProps={{ className: 'text-muted-foreground font-bold active:bg-muted' }}
              className="flex h-[46px] items-center gap-2.5 rounded-2xl px-3.5 font-assistant text-sm transition-colors duration-150"
            >
              <Settings size={18} />
              <span>הגדרות</span>
            </Link>
          </li>
        </ul>
      </nav>

      <div className="border-t border-border/60 p-5">
        <p className="font-assistant text-sm font-bold text-foreground">{staff.name}</p>
        <p className="font-assistant text-[13px] text-muted-foreground">
          {ROLE_LABELS[staff.role] ?? staff.role}
        </p>
        <Button
          variant="ghost"
          size="sm"
          className="mt-2 w-full justify-start gap-2"
          onClick={async () => {
            clearSessionCache()
            await logout()
            navigate({ to: '/auth/login' })
          }}
        >
          <LogOut className="size-4" />
          התנתקות
        </Button>
      </div>
    </aside>
  )
}
