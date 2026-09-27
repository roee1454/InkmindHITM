import { useEffect, useState } from 'react'
import { createFileRoute, Link, Outlet, redirect, useLocation, useNavigate } from '@tanstack/react-router'
import { Plus } from '@/components/ui/icon'
import { Sidebar } from '@/components/Sidebar'
import { MobileTopBar } from '@/components/MobileTopBar'
import { MobileBottomNav } from '@/components/MobileBottomNav'
import { AppDrawer } from '@/components/AppDrawer'
import { routeTitle, settingsBackTarget } from '@/components/navigation'
import { getCurrentSession } from '@/features/auth/server/auth'
import { getSettings } from '@/features/onboarding/server/onboarding'
import { getStaffList } from '@/features/settings/server/staff'
import { ConfirmProvider } from '#/hooks/useConfirm'
import { McpAssistant } from '@/features/mcp-assistant/components/McpAssistant'
import { useQuery } from '@tanstack/react-query'
import { useDashboardRealtime } from '@/features/conversations/hooks/use-dashboard-realtime'
import { useLiveEntityCache } from '@/features/database/hooks/use-live-entity-cache'
import {
  getCachedDashboardData,
  setCachedDashboardData,
  clearSessionCache,
} from '@/features/auth/utils/session-cache'

import type { RecordModel } from 'pocketbase'


export const Route = createFileRoute('/dashboard')({
  beforeLoad: async () => {
    const cached = getCachedDashboardData()
    if (cached) {
      return cached
    }

    // Neither call depends on the other's result, and getSettings() doesn't require auth —
    // safe to run in parallel instead of a sequential round-trip each.
    const [session, settings] = await Promise.all([getCurrentSession(), getSettings()])
    if (!session) {
      clearSessionCache()
      throw redirect({ to: '/auth/login' })
    }
    if (!settings?.onboarding_completed) {
      throw redirect({ to: '/onboarding/studio' })
    }

    setCachedDashboardData(session, settings)
    return { session, settings }
  },
  loader: ({ context }) => context.session,
  component: DashboardLayout,
})

function DashboardLayout() {
  const session = Route.useLoaderData()
  const location = useLocation()
  const navigate = useNavigate()
  const isConversations = location.pathname.startsWith('/dashboard/conversations')
  // The calendar is a full-bleed screen like the chat thread (track-b B6.8): it owns its own
  // scroll so the grid fills the viewport instead of sitting in a card inside a padded page.
  const isFlushScreen = isConversations || location.pathname.startsWith('/dashboard/calendar')

  // Real-time subscriptions for messages, conversations, and notifications
  useDashboardRealtime({
    sessionToken: session?.token,
    sessionStaff: session?.staff as unknown as RecordModel | undefined,
  })
  useLiveEntityCache({
    sessionToken: session?.token,
    sessionStaff: session?.staff as unknown as RecordModel | undefined,
  })

  // An open chat thread is a full-screen detail view on mobile: no top bar, no tab bar, so the
  // composer isn't fighting the on-screen keyboard for the bottom 64px.
  const chatId = (location.search as Record<string, unknown>)?.chatId
  const isChatDetail = isConversations && typeof chatId === 'string' && !!chatId
  const showMobileChrome = !isChatDetail

  // Team member detail's top bar shows the member's name instead of the generic section title —
  // the only route whose title depends on loaded data rather than pathname alone.
  const isTeamDetail = location.pathname === '/dashboard/settings/team'
  const staffIdParam = isTeamDetail ? ((location.search as Record<string, unknown>)?.staff as string | undefined) : undefined
  const { data: staffListForTitle } = useQuery({
    queryKey: ['staff-list'],
    queryFn: () => getStaffList(),
    enabled: Boolean(staffIdParam),
  })
  const selectedStaffName = staffIdParam ? staffListForTitle?.find((m) => m.id === staffIdParam)?.name : undefined
  const mobileTopBarTitle = selectedStaffName ?? routeTitle(location.pathname)
  const isAdmin = session?.staff?.role === 'owner' || session?.staff?.role === 'admin'
  const backTo = settingsBackTarget(location.pathname, (location.search) ?? {}, isAdmin)

  // Customers and calendar show a page-specific "+" create action instead of the bell — the
  // page itself owns the create-dialog state, opened via the `new=1` search param.
  const showsCreateAction =
    location.pathname === '/dashboard/customers' ||
    location.pathname.startsWith('/dashboard/calendar')
  const mobileTopBarAction = showsCreateAction ? (
    <Link
      to="."
      search={(prev) => ({ ...prev, new: '1' }) as Record<string, unknown>}
      aria-label="הוספה"
      className="tap-target text-primary"
    >
      <Plus size={22} />
    </Link>
  ) : undefined

  const [menuOpen, setMenuOpen] = useState(false)
  // Radix won't close the sheet on a router navigation. Key on `href`, not `pathname` — the
  // settings sub-links differ only by their `?tab=` search param.
  useEffect(() => {
    setMenuOpen(false)
  }, [location.href])

  return (
    <ConfirmProvider>
      {/* data-mobile-chrome drives --app-top-bar-h / --app-bottom-nav-h (src/styles.css), so a
          single calc() stays correct in all four states: desktop, mobile-with-chrome,
          mobile-chat-detail, and desktop-chat. */}
      <div
        data-mobile-chrome={showMobileChrome ? 'on' : 'off'}
        className="flex h-svh w-screen overflow-hidden bg-background lg:h-auto lg:w-auto lg:overflow-visible"
      >
        <Sidebar staff={session.staff} />

        <div className="flex min-w-0 flex-1 flex-col">
          {showMobileChrome && (
            <MobileTopBar
              title={mobileTopBarTitle}
              onOpenMenu={() => setMenuOpen(true)}
              onBack={backTo ? () => navigate(backTo) : undefined}
              action={mobileTopBarAction}
              className="lg:hidden"
            />
          )}

          <main
            className={
              isFlushScreen
                ? // Deliberately NOT `flex-1`: in a flex column that sets flex-basis:0 and
                  // grow:1, which overrides this height — the fixed bottom nav would then
                  // overlay the last 64px of the thread, hiding the composer.
                  'page-container--flush h-[calc(100svh-var(--app-top-bar-h)-var(--app-bottom-nav-h))] min-w-0 shrink-0'
                : 'page-container min-w-0 flex-1'
            }
          >
            <Outlet />
          </main>
        </div>

        {showMobileChrome && <MobileBottomNav className="lg:hidden" />}
        <AppDrawer open={menuOpen} onOpenChange={setMenuOpen} staff={session.staff} />
        {/* Hidden during the full-screen chat detail view for the same reason the bottom nav
            is — the bubble would otherwise float on top of a screen that has no chrome. */}
        {showMobileChrome && <McpAssistant />}
      </div>
    </ConfirmProvider>
  )
}
