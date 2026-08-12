import { Link, useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { Bell, LogOut, Settings } from 'lucide-react'
import { cn } from '#/lib/utils.ts'
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
import { logout } from '#/features/auth/server/auth.ts'
import { getAiSettings } from '#/features/settings/server/ai.ts'
import { getUnreadNotificationsCount } from '#/features/notifications/server/notifications.ts'
import type { StaffRecord } from '#/integrations/pocketbase/types.ts'
import { clearSessionCache } from '@/routes/dashboard/route'

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
      <SheetContent side="right" className="gap-0 rounded-e-3xl p-0 shadow-lg">
        <SheetHeader className="flex-row items-center gap-3 border-border/60">
          <BrandMark size="sm" />
          <div className="flex min-w-0 flex-col items-start">
            <SheetTitle>INKMIND</SheetTitle>
            <SheetDescription className="text-[11px] font-bold uppercase text-muted-foreground">
              ניהול סטודיו
            </SheetDescription>
          </div>
        </SheetHeader>

        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          <Link
            to="/dashboard/settings/ai"
            className="flex items-center justify-between rounded-2xl border border-border/80 px-3.5 py-2.5 font-assistant text-[13px] font-bold text-muted-foreground transition-colors duration-150 active:bg-muted"
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

          <Link
            to="/dashboard/notifications"
            activeProps={{ className: 'bg-primary/10 text-primary font-extrabold' }}
            inactiveProps={{
              className: 'text-muted-foreground font-bold',
            }}
            className="mt-4 flex h-[46px] items-center justify-between rounded-2xl px-3.5 font-assistant text-sm transition-colors duration-150 active:bg-muted"
          >
            <span className="flex items-center gap-2.5">
              <Bell size={18} />
              התראות מערכת
            </span>
            {unreadNotificationsCount > 0 && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-extrabold text-white">
                {unreadNotificationsCount}
              </span>
            )}
          </Link>

          <Link
            to="/dashboard/settings"
            activeProps={{ className: 'bg-primary/10 text-primary font-extrabold' }}
            inactiveProps={{ className: 'text-muted-foreground font-bold' }}
            className="mt-4 flex h-[46px] items-center gap-2.5 rounded-2xl px-3.5 font-assistant text-sm transition-colors duration-150 active:bg-muted"
          >
            <Settings size={18} />
            <span>הגדרות</span>
          </Link>
        </div>

        <SheetFooter className="border-border/60">
          <div>
            <p className="font-assistant text-sm font-bold text-foreground">{staff.name}</p>
            <p className="font-assistant text-[13px] text-muted-foreground">
              {ROLE_LABELS[staff.role] ?? staff.role}
            </p>
          </div>
          <Button
            variant="ghost"
            className="h-11 w-full justify-start gap-2"
            onClick={async () => {
              clearSessionCache()
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
