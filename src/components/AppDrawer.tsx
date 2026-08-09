import { Link, useLocation, useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { Bell, LogOut } from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '#/components/ui/sheet.tsx'
import { Button } from '#/components/ui/button.tsx'
import { BrandMark } from '#/components/BrandMark.tsx'
import { SETTINGS_SUB_ITEMS } from '#/components/navigation.ts'
import { logout } from '#/features/auth/server/auth.ts'
import { getAiSettings } from '#/features/settings/server/ai.ts'
import { getUnreadNotificationsCount } from '#/features/notifications/server/notifications.ts'
import type { StaffRecord } from '#/integrations/pocketbase/types.ts'

const ROLE_LABELS: Record<string, string> = {
  owner: 'בעלים',
  admin: 'מנהל',
  staff: 'צוות',
}

interface AppDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  staff: StaffRecord
}

/**
 * Secondary navigation for mobile — settings, notifications, AI status and logout. The five
 * primary destinations live in the bottom tab bar, not here.
 *
 * Deliberately does not render <Sidebar>: that is `sticky h-svh w-72` with its own scroll
 * behaviour and would fight the sheet's sizing. The shared pieces are `navigation.ts` and
 * `BrandMark`.
 */
export function AppDrawer({ open, onOpenChange, staff }: AppDrawerProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const currentTab = (location.search as Record<string, string>)?.tab || 'team'
  const isInSettings = location.pathname.startsWith('/dashboard/settings')

  const { data: aiSettings } = useQuery({
    queryKey: ['ai-settings'],
    queryFn: () => getAiSettings(),
    refetchInterval: 60000,
  })
  const aiEnabled = Boolean(aiSettings?.aiEnabled)

  const { data: unreadNotificationsCount = 0 } = useQuery({
    queryKey: ['unread-notifications-count'],
    queryFn: () => getUnreadNotificationsCount(),
    refetchInterval: 60000,
  })

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="gap-0 p-0">
        <SheetHeader className="flex-row items-center gap-3">
          <BrandMark size="sm" />
          <div className="flex min-w-0 flex-col items-start">
            <SheetTitle>INKMIND</SheetTitle>
            <SheetDescription className="text-glow font-black uppercase text-primary/80">
              ניהול סטודיו
            </SheetDescription>
          </div>
        </SheetHeader>

        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          <Link
            to="/dashboard/settings"
            search={{ tab: 'ai' }}
            className="flex items-center justify-between rounded-xl border border-border px-3 py-2.5 font-assistant text-xs font-semibold text-muted-foreground transition-colors duration-150 hover:bg-accent active:bg-accent"
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

          <Link
            to="/dashboard/notifications"
            activeProps={{ className: 'border-primary/20 bg-primary/10 text-primary font-bold' }}
            inactiveProps={{
              className: 'border-transparent text-muted-foreground font-semibold',
            }}
            className="mt-4 flex h-11 items-center justify-between rounded-xl border px-3 font-assistant text-sm transition-colors duration-150 hover:bg-accent active:bg-accent"
          >
            <span className="flex items-center gap-2">
              <Bell size={16} />
              התראות מערכת
            </span>
            {unreadNotificationsCount > 0 && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1 text-micro font-black text-white">
                {unreadNotificationsCount}
              </span>
            )}
          </Link>

          <p className="mt-6 mb-2 px-1 font-assistant text-micro font-black uppercase tracking-wide text-muted-foreground/60">
            הגדרות
          </p>
          <ul className="space-y-1">
            {SETTINGS_SUB_ITEMS.map((subItem) => {
              const isTabActive = isInSettings && currentTab === subItem.id
              return (
                <li key={subItem.id}>
                  <Link
                    to="/dashboard/settings"
                    search={{ tab: subItem.id }}
                    className={`flex h-11 items-center justify-between rounded-xl border px-3 font-assistant text-sm transition-colors duration-150 active:bg-accent ${
                      isTabActive
                        ? 'border-primary/20 bg-primary/10 font-bold text-primary'
                        : 'border-transparent font-semibold text-muted-foreground hover:bg-accent hover:text-foreground'
                    }`}
                  >
                    <span>{subItem.label}</span>
                    {isTabActive ? <span className="h-1.5 w-1.5 rounded-full bg-primary" /> : null}
                  </Link>
                </li>
              )
            })}
          </ul>
        </div>

        <SheetFooter>
          <div>
            <p className="font-assistant text-sm font-medium text-foreground">{staff.name}</p>
            <p className="font-assistant text-xs text-muted-foreground">
              {ROLE_LABELS[staff.role] ?? staff.role}
            </p>
          </div>
          <Button
            variant="ghost"
            className="h-11 w-full justify-start gap-2"
            onClick={async () => {
              await logout()
              navigate({ to: '/auth/login' })
            }}
          >
            <LogOut className="size-4" />
            התנתקות
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
