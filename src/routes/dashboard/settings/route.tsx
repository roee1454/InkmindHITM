import { useEffect } from 'react'
import { createFileRoute, Link, Outlet, useLocation, useNavigate } from '@tanstack/react-router'
import { ChevronRight } from '@/components/ui/icon'
import { SETTINGS_SUB_ITEMS } from '@/components/navigation'
import { getCurrentSession } from '@/features/auth/server/auth'

export const Route = createFileRoute('/dashboard/settings')({
  loader: () => getCurrentSession(),
  component: SettingsLayout,
})

/** Desktop-only 236px section list, sitting between the global 288px Sidebar and the section
 *  content — the three panes SCREENS.md's desktop settings spec describes. Mobile ignores this
 *  entirely: each section route renders its own full-screen view with a back chevron.
 *  Non-admin staff members are scoped to their profile ('team') section only. */
function SettingsLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const session = Route.useLoaderData()
  const isAdmin = session?.staff.role === 'owner' || session?.staff.role === 'admin'

  useEffect(() => {
    const adminOnlyRoutes = [
      '/dashboard/settings/general',
      '/dashboard/settings/ai',
      '/dashboard/settings/system',
    ]
    if (!isAdmin && adminOnlyRoutes.some((r) => location.pathname.startsWith(r))) {
      navigate({ to: '/dashboard/settings/team', replace: true })
    }
  }, [isAdmin, location.pathname, navigate])

  const visibleItems = isAdmin
    ? SETTINGS_SUB_ITEMS
    : SETTINGS_SUB_ITEMS.filter((i) => i.id === 'team').map((i) => ({
        ...i,
        label: 'הפרופיל שלי',
      }))

  return (
    <div className="flex h-full min-h-0 flex-1 font-assistant" dir="rtl">
      <nav className="hidden w-[236px] shrink-0 flex-col gap-1 border-e border-border p-4 lg:flex">
        <Link
          to="/dashboard"
          className="mb-2 flex h-9 items-center gap-1.5 rounded-xl px-2.5 text-xs font-bold text-muted-foreground transition-colors duration-150 hover:bg-muted hover:text-foreground"
        >
          <ChevronRight size={16} />
          <span>חזרה ללוח הבקרה</span>
        </Link>
        {visibleItems.map((item) => {
          const active = location.pathname === item.route
          return (
            <Link
              key={item.id}
              to={item.route}
              className={`flex h-10 items-center rounded-xl px-3.5 text-sm font-bold transition-colors duration-150 ${
                active ? 'bg-primary/10 text-primary font-extrabold' : 'text-muted-foreground'
              }`}
            >
              {item.label}
            </Link>
          )
        })}
      </nav>
      <div className="min-w-0 flex-1">
        <Outlet />
      </div>
    </div>
  )
}
