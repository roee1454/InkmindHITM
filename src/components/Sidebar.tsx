import * as React from 'react'
import { Link, useLocation, useNavigate } from '@tanstack/react-router'
import { ChevronDown, LogOut, Bell } from 'lucide-react'
import { Button } from '#/components/ui/button.tsx'
import { logout } from '#/features/auth/server/auth.ts'
import type { StaffRecord } from '#/integrations/pocketbase/types.ts'
import { useQuery } from '@tanstack/react-query'
import { getUnseenMessagesCount } from '#/features/conversations/server/messages.ts'
import { getUnreadNotificationsCount } from '#/features/notifications/server/notifications.ts'
import { getAiSettings } from '@/features/settings/server/ai'

interface SidebarProps {
  staff: StaffRecord
}

const ROLE_LABELS: Record<string, string> = {
  owner: 'בעלים',
  admin: 'מנהל',
  staff: 'צוות',
}

const NAV_ITEMS = [
  { to: '/dashboard', label: 'בית' },
  { to: '/dashboard/calendar', label: 'תורים' },
  { to: '/dashboard/leads', label: 'לידים' },
  { to: '/dashboard/customers', label: 'לקוחות' },
  { to: '/dashboard/conversations', label: 'שיחות' },
] as const

const SETTINGS_SUB_ITEMS = [
  { id: 'team', label: 'צוות והרשאות' },
  { id: 'calendar', label: 'קישורי יומן' },
  { id: 'ai', label: 'הגדרות סוכן AI' },
  { id: 'policy', label: 'מדיניות סטודיו' },
  { id: 'whatsapp', label: 'וואטסאפ' },
] as const

export function Sidebar({ staff }: SidebarProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const pathname = location.pathname

  const isInSettings = pathname.startsWith('/dashboard/settings')
  const [isSettingsExpanded, setIsSettingsExpanded] = React.useState(isInSettings)

  React.useEffect(() => {
    if (isInSettings) setIsSettingsExpanded(true)
  }, [isInSettings])

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

  // Read custom studio logo from localStorage if set during onboarding
  const [studioLogo, setStudioLogo] = React.useState<string | null>(null)

  React.useEffect(() => {
    const saved = localStorage.getItem('studio_logo')
    if (saved) setStudioLogo(saved)
  }, [])

  // Extract active tab from location.search
  const currentTab = (location.search as Record<string, string>)?.tab || 'team'

  return (
    <aside className="sticky top-0 flex h-screen w-72 shrink-0 flex-col border-e border-border bg-card font-assistant">
      <div className="flex items-center justify-between gap-2 border-b border-border p-5">
        <div className="flex min-w-0 items-center justify-start gap-4">
          <div className="relative shrink-0">
            <div className="absolute inset-0 rounded-full bg-primary/20 blur-lg" />
            {studioLogo ? (
              <img src={studioLogo} alt="Studio Logo" className="relative h-9 w-9 rounded-full object-cover border-2 border-primary/40 shadow-xs" />
            ) : (
              <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-primary/40 bg-primary font-assistant text-sm font-black text-primary-foreground">
                IM
              </div>
            )}
          </div>
          <div className="flex min-w-0 flex-col items-start font-assistant">
            <h1 className="text-sm font-black text-foreground">INKMIND</h1>
            <span className="text-glow text-xs font-black uppercase text-primary/80">
              ניהול סטודיו
            </span>
          </div>
        </div>

        {/* Bell icon button for system notifications */}
        <Link
          to="/dashboard/notifications"
          activeProps={{ className: 'text-primary border-primary/20 bg-primary/10' }}
          inactiveProps={{ className: 'text-muted-foreground border-border hover:bg-accent hover:text-foreground' }}
          className="relative flex h-8 w-8 items-center justify-center rounded-xl border transition-all duration-200"
          title="התראות מערכת"
        >
          <Bell size={15} />
          {unreadNotificationsCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-black text-white leading-none">
              {unreadNotificationsCount}
            </span>
          )}
        </Link>
      </div>

      <Link
        to="/dashboard/settings"
        search={{ tab: 'ai' }}
        className="mx-5 mt-4 flex items-center justify-between rounded-xl border border-border px-3 py-2 font-assistant text-xs font-semibold text-muted-foreground transition-colors hover:bg-accent"
        title="הגדרות סוכן AI"
      >
        <span className="flex items-center gap-2">
          <span
            className={`h-2 w-2 rounded-full ${aiEnabled ? 'bg-emerald-500' : 'bg-muted-foreground/40'}`}
          />
          סוכן AI
        </span>
        <span className={aiEnabled ? 'font-bold text-emerald-500' : 'text-muted-foreground'}>
          {aiEnabled ? 'פעיל' : 'כבוי'}
        </span>
      </Link>

      <nav aria-label="ניווט ראשי" className="flex-1 px-5 py-6">
        <ul className="space-y-1.5">
          {NAV_ITEMS.map((item) => (
            <li key={item.to}>
              <Link
                to={item.to}
                activeOptions={{ exact: item.to === '/dashboard' }}
                activeProps={{ className: 'border-border bg-primary/10 text-primary font-bold' }}
                inactiveProps={{
                  className:
                    'border-transparent text-muted-foreground hover:border-border hover:bg-accent hover:text-foreground font-semibold',
                }}
                className="flex h-10 items-center justify-between rounded-xl border px-3 font-assistant text-sm transition-colors"
              >
                {({ isActive }) => (
                  <>
                    <div className="flex items-center gap-2">
                      <span>{item.label}</span>
                      {item.to === '/dashboard/conversations' && unseenMessagesCount > 0 && (
                        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-emerald-500 px-1 text-[10px] font-black text-white">
                          {unseenMessagesCount}
                        </span>
                      )}
                    </div>
                    {isActive ? <span className="h-1.5 w-1.5 rounded-full bg-primary" /> : null}
                  </>
                )}
              </Link>
            </li>
          ))}

          <li>
            <button
              type="button"
              onClick={() => setIsSettingsExpanded(!isSettingsExpanded)}
              className={`flex h-10 w-full cursor-pointer items-center justify-between rounded-xl border px-3 font-assistant text-sm font-bold outline-none transition-colors ${
                isInSettings && !isSettingsExpanded
                  ? 'border-border bg-primary/10 text-primary'
                  : 'border-transparent text-muted-foreground hover:border-border hover:bg-accent hover:text-foreground'
              }`}
            >
              <span>הגדרות</span>
              <ChevronDown
                className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${
                  isSettingsExpanded ? 'rotate-180' : ''
                }`}
              />
            </button>

            {isSettingsExpanded && (
              <ul className="mt-1 animate-fade-in space-y-1 ps-4">
                {SETTINGS_SUB_ITEMS.map((subItem) => {
                  const isTabActive = isInSettings && currentTab === subItem.id
                  return (
                    <li key={subItem.id}>
                      <Link
                        to="/dashboard/settings"
                        search={{ tab: subItem.id }}
                        className={`flex h-9 items-center justify-between rounded-xl border px-3 font-assistant text-xs transition-all ${
                          isTabActive
                            ? 'border-primary/20 bg-primary/10 font-bold text-primary'
                            : 'border-transparent font-semibold text-muted-foreground/70 hover:border-border hover:bg-accent hover:text-muted-foreground'
                        }`}
                      >
                        <span>{subItem.label}</span>
                        {isTabActive ? (
                          <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                        ) : null}
                      </Link>
                    </li>
                  )
                })}
              </ul>
            )}
          </li>
        </ul>
      </nav>

      <div className="border-t border-border p-5">
        <p className="font-assistant text-sm font-medium text-foreground">{staff.name}</p>
        <p className="font-assistant text-xs text-muted-foreground">
          {ROLE_LABELS[staff.role] ?? staff.role}
        </p>
        <Button
          variant="ghost"
          size="sm"
          className="mt-2 w-full justify-start gap-2"
          onClick={async () => {
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
