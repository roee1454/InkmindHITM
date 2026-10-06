import { useEffect } from 'react'
import { createFileRoute, Link, Outlet, useLocation, useNavigate } from '@tanstack/react-router'
import { SETTINGS_SUB_ITEMS } from '@/components/navigation'
import { getCurrentSession } from '@/features/auth/server/auth'

export const Route = createFileRoute('/dashboard/settings')({
  loader: () => getCurrentSession(),
  component: SettingsLayout,
})

/** Desktop-only section list, sitting between the global 288px Sidebar and the section
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
      '/dashboard/settings/policy',
      '/dashboard/settings/closures',
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
      <nav aria-label="הגדרות" className="hidden w-56 shrink-0 flex-col gap-0.5 border-e border-border px-3 py-8 lg:flex">
        <span className="mb-2 px-3 text-xs font-bold text-muted-foreground">הגדרות</span>
        {visibleItems.map((item) => {
          const active = location.pathname === item.route
          return (
            <Link
              key={item.id}
              to={item.route}
              aria-current={active ? 'page' : undefined}
              className={`flex h-9 items-center rounded-lg px-3 text-sm transition-colors duration-150 ${
                active ? 'bg-muted font-extrabold text-foreground' : 'font-bold text-muted-foreground hover:bg-muted/60 hover:text-foreground'
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
