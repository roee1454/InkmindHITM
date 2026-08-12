import { useEffect } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useMutation, useQuery } from '@tanstack/react-query'
import {
  LogOut,
  ChevronLeft,
  SlidersHorizontal,
  ClipboardList,
  Users,
  Sparkles,
  HelpCircle,
  Download,
} from 'lucide-react'
import { getCurrentSession, logout } from '@/features/auth/server/auth'
import { getStaffList } from '@/features/settings/server/staff'
import { clearSessionCache } from '@/routes/dashboard/route'
import { SETTINGS_SUB_ITEMS } from '@/components/navigation'
import { useIsMobile } from '@/hooks/use-media-query'

export const Route = createFileRoute('/dashboard/settings/')({
  loader: () => getCurrentSession(),
  component: SettingsMenu,
})

const ICONS: Record<(typeof SETTINGS_SUB_ITEMS)[number]['id'], typeof SlidersHorizontal> = {
  general: SlidersHorizontal,
  policy: ClipboardList,
  team: Users,
  ai: Sparkles,
  faq: HelpCircle,
  backups: Download,
}

function SettingsMenu() {
  const session = Route.useLoaderData()
  const navigate = useNavigate()
  const isMobile = useIsMobile()
  const { data: staffList } = useQuery({ queryKey: ['staff-list'], queryFn: () => getStaffList() })

  // Desktop shows the 3-pane shell (route.tsx) — the menu itself is mobile-only, so land on
  // the first section instead of a blank content pane.
  useEffect(() => {
    if (!isMobile) navigate({ to: '/dashboard/settings/general', replace: true })
  }, [isMobile, navigate])

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

  return (
    <div className="flex flex-col gap-[18px] px-4 pt-5 pb-8 font-assistant" dir="rtl">
      <div className="flex items-center gap-3">
        <div className="avatar-native size-[52px] text-lg">{(session?.staff.name || '?').charAt(0)}</div>
        <div className="flex min-w-0 flex-col">
          <span className="truncate text-[17px] font-extrabold text-foreground">{session?.staff.name}</span>
          <span dir="ltr" className="truncate text-end text-[13px] font-mono text-muted-foreground">
            {session?.staff.email}
          </span>
        </div>
      </div>

      <div className="card-native overflow-hidden">
        {SETTINGS_SUB_ITEMS.map((item) => {
          const Icon = ICONS[item.id]
          const sub = subtitle(item.id)
          return (
            <div key={item.id} onClick={() => navigate({ to: item.route })} className="row-native cursor-pointer">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                <Icon size={18} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[15px] font-bold text-foreground">{item.label}</div>
                {sub && <div className="truncate text-[13px] text-muted-foreground">{sub.text}</div>}
              </div>
              <ChevronLeft size={18} className="shrink-0 text-muted-foreground" />
            </div>
          )
        })}
      </div>

      <button
        type="button"
        disabled={logoutMutation.isPending}
        onClick={() => logoutMutation.mutate()}
        className="sticky bottom-0 z-10 flex h-13 w-full shrink-0 cursor-pointer items-center justify-center gap-2 rounded-2xl border border-border/80 bg-card text-[15px] font-bold text-destructive shadow-xs"
      >
        <LogOut size={18} />
        {logoutMutation.isPending ? 'מתנתק…' : 'התנתקות'}
      </button>
    </div>
  )
}
