import { createFileRoute, Link, Outlet, useLocation } from '@tanstack/react-router'
import { SETTINGS_SUB_ITEMS } from '@/components/navigation'

export const Route = createFileRoute('/dashboard/settings')({
  component: SettingsLayout,
})

/** Desktop-only 236px section list, sitting between the global 288px Sidebar and the section
 *  content — the three panes SCREENS.md's desktop settings spec describes. Mobile ignores this
 *  entirely: each section route renders its own full-screen view with a back chevron. */
function SettingsLayout() {
  const location = useLocation()

  return (
    <div className="flex h-full min-h-0 flex-1 font-assistant" dir="rtl">
      <nav className="hidden w-[236px] shrink-0 flex-col gap-1 border-e border-border/60 p-4 lg:flex">
        {SETTINGS_SUB_ITEMS.map((item) => {
          const active = location.pathname === item.route
          return (
            <Link
              key={item.id}
              to={item.route}
              className={`flex h-10 items-center rounded-xl px-3.5 text-[14px] font-bold transition-colors duration-150 ${
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
