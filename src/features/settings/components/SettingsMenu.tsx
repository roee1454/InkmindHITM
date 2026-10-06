import { useEffect } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useMutation, useQuery } from '@tanstack/react-query'
import { LogOut, ChevronLeft, SlidersHorizontal, Users, Sparkles, Database, FileText, CalendarOff } from '@/components/ui/icon'
import { logout } from '@/features/auth/server/auth'
import { getStaffList } from '@/features/settings/server/staff'
import { clearSessionCache } from '@/features/auth/utils/session-cache'
import { SETTINGS_SUB_ITEMS } from '@/components/navigation'
import { useIsMobile } from '#/hooks/useMediaQuery'
import type { StaffRecord } from '@/integrations/pocketbase/types'

const ICONS: Record<(typeof SETTINGS_SUB_ITEMS)[number]['id'], typeof SlidersHorizontal> = {
  general: SlidersHorizontal,
  team: Users,
  policy: FileText,
  closures: CalendarOff,
  ai: Sparkles,
  system: Database,
}

interface SettingsMenuProps {
  staff?: StaffRecord | null
}

export function SettingsMenu({ staff }: SettingsMenuProps) {
  const navigate = useNavigate()
  const isMobile = useIsMobile()
  const { data: staffList } = useQuery({ queryKey: ['staff-list'], queryFn: () => getStaffList() })

  const isAdmin = staff?.role === 'owner' || staff?.role === 'admin'

  // Desktop shows the 3-pane shell (route.tsx) — the menu itself is mobile-only, so land on
  // the first allowed section instead of a blank content pane.
  useEffect(() => {
    if (!isMobile) {
      navigate({ to: isAdmin ? '/dashboard/settings/general' : '/dashboard/settings/team', replace: true })
    }
  }, [isMobile, isAdmin, navigate])

  const logoutMutation = useMutation({
    mutationFn: async () => {
      clearSessionCache()
      await logout()
    },
    onSuccess: () => navigate({ to: '/auth/login' }),
  })

  if (!isMobile) return null

  const subtitle = (id: (typeof SETTINGS_SUB_ITEMS)[number]['id']) => {
    if (id === 'team') return { text: `${staffList?.length ?? 0} חברי צוות` }
    return null
  }

  const visibleItems = isAdmin
    ? SETTINGS_SUB_ITEMS
    : SETTINGS_SUB_ITEMS.filter((i) => i.id === 'team').map((i) => ({
        ...i,
        label: 'הפרופיל שלי',
      }))

  return (
    <div className="flex flex-col gap-6 px-4 pt-5 pb-8 font-assistant" dir="rtl">
      <div className="flex items-center gap-3 px-1">
        <div className="avatar-native size-12 text-lg">{(staff?.name || '?').charAt(0)}</div>
        <div className="flex min-w-0 flex-col">
          <span className="truncate text-lg font-extrabold text-foreground">{staff?.name}</span>
          <span dir="ltr" className="truncate text-end text-sm font-medium text-muted-foreground">
            {staff?.email}
          </span>
        </div>
      </div>

      <nav aria-label="הגדרות" className="card-native overflow-hidden">
        {visibleItems.map((item) => {
          const Icon = ICONS[item.id]
          const sub = subtitle(item.id)
          return (
            <button key={item.id} type="button" onClick={() => navigate({ to: item.route })} className="row-native w-full cursor-pointer text-start">
              <Icon size={19} className="shrink-0 text-muted-foreground" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-base font-bold text-foreground">{item.label}</span>
                {sub && <span className="block truncate text-sm text-muted-foreground">{sub.text}</span>}
              </span>
              <ChevronLeft size={18} className="shrink-0 text-muted-foreground" />
            </button>
          )
        })}
      </nav>

      <button
        type="button"
        disabled={logoutMutation.isPending}
        onClick={() => logoutMutation.mutate()}
        className="card-native flex h-12 w-full cursor-pointer items-center justify-center gap-2 text-base font-bold text-destructive disabled:opacity-60"
      >
        <LogOut size={18} />
        {logoutMutation.isPending ? 'מתנתק…' : 'התנתקות'}
      </button>
    </div>
  )
}

export default SettingsMenu
