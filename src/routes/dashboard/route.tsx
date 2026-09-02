import { useEffect, useState } from 'react'
import { createFileRoute, Link, Outlet, redirect, useLocation, useNavigate } from '@tanstack/react-router'
import { Plus } from 'lucide-react'
import { Sidebar } from '@/components/Sidebar'
import { MobileTopBar } from '@/components/MobileTopBar'
import { MobileBottomNav } from '@/components/MobileBottomNav'
import { AppDrawer } from '@/components/AppDrawer'
import { routeTitle, settingsBackTarget } from '@/components/navigation'
import { getCurrentSession } from '@/features/auth/server/auth'
import { getSettings } from '@/features/onboarding/server/onboarding'
import { getStaffList } from '@/features/settings/server/staff'
import { getBrowserClient } from '@/integrations/pocketbase/client'
import { useToast } from '@/components/ui/ToastProvider'
import { ConfirmProvider } from '@/hooks/use-confirm'
import { McpAssistant } from '@/features/mcp-assistant/components/McpAssistant'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { sendPwaNotification } from '@/features/notifications/lib/pwa-notifications'

let cachedSession: any = null
let cachedSettings: any = null

export function clearSessionCache() {
  cachedSession = null
  cachedSettings = null
}

export const Route = createFileRoute('/dashboard')({
  beforeLoad: async () => {
    if (typeof window !== 'undefined' && cachedSession && cachedSettings) {
      return { session: cachedSession, settings: cachedSettings }
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

    if (typeof window !== 'undefined') {
      cachedSession = session
      cachedSettings = settings
    }

    return { session, settings }
  },
  loader: ({ context }) => context.session,
  component: DashboardLayout,
})

function DashboardLayout() {
  const session = Route.useLoaderData()
  const { settings } = Route.useRouteContext()
  const location = useLocation()
  const navigate = useNavigate()
  const isConversations = location.pathname.startsWith('/dashboard/conversations')
  const { toast } = useToast()
  const queryClient = useQueryClient()

  // Studio-wide palette/dark-mode — DB stays authoritative (cross-device), but every load here
  // reconciles it into localStorage so `__root.tsx`'s inline head script can apply the theme
  // synchronously before first paint on the *next* load, with no extra fetch of its own.
  useEffect(() => {
    if (!settings) return
    const theme = (settings.ui_theme as string) || 'indigo'
    const dark = Boolean(settings.ui_dark_mode)
    document.documentElement.setAttribute('data-theme', theme)
    document.documentElement.classList.toggle('dark', dark)
    try {
      localStorage.setItem('ui-theme', theme)
      localStorage.setItem('ui-dark-mode', dark ? '1' : '0')
    } catch {}
  }, [settings])

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
  const backTo = settingsBackTarget(location.pathname, (location.search as Record<string, unknown>) ?? {})

  // Customers and calendar show a page-specific "+" create action instead of the bell — the
  // page itself owns the create-dialog state, opened via the `new=1` search param.
  const showsCreateAction =
    location.pathname === '/dashboard/customers' ||
    location.pathname.startsWith('/dashboard/calendar') ||
    location.pathname === '/dashboard/settings/faq'
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

  useEffect(() => {
    const pb = getBrowserClient()
    if (session?.token) {
      pb.authStore.save(session.token, session.staff as any)
    }

    // Subscribe to new messages. Cache updates (thread + conversations list) run for every
    // new message regardless of direction/sender, so the bot's own replies (sender_type
    // 'ai_bot') appear instantly instead of waiting for the next poll — but the toast popup
    // stays inbound-only: a customer message is something staff needs to notice, the bot's own
    // reply to it isn't.
    pb.collection('messages').subscribe('*', async (data) => {
      if (data.action !== 'create') return

      const convId = data.record.conversation as string

      if (data.record.direction === 'inbound') {
        let senderName = 'לקוח'
        if (convId) {
          try {
            const conv = await pb.collection('conversations').getOne(convId, { expand: 'customer' })
            const customer = conv.expand?.customer
            if (customer) {
              senderName = customer.name || customer.phone || senderName
            }
          } catch {}
        }

        const msgBody =
          (data.record.body as string) ||
          (data.record.type === 'image'
            ? '📷 שלח/ה תמונה'
            : data.record.type === 'document'
              ? '📄 שלח/ה מסמך'
              : 'שלח/ה מדיה')
        const notifTitle = `הודעה חדשה מ-${senderName}`
        const notifLink = `/dashboard/conversations?chatId=${convId}`

        toast(
          notifTitle,
          msgBody,
          'info',
          4000,
          () => {
            navigate({
              to: '/dashboard/conversations',
              search: { chatId: convId },
            })
          }
        )

        // Dispatch PWA / OS Notification
        void sendPwaNotification(notifTitle, {
          body: msgBody,
          link: notifLink,
          tag: `msg-${data.record.id}`,
        })
      }

      // 1. Direct cache update for the message thread
      if (convId) {
        const newMessage = {
          id: data.record.id,
          direction: data.record.direction as any,
          senderType: data.record.sender_type as any,
          type: data.record.type as any,
          body: (data.record.body as string) || '',
          mediaFilename: (data.record.media as string) || null,
          status: (data.record.status as any) || null,
          timestamp: (data.record.timestamp as string) || data.record.created,
          replyToWamid: (data.record.reply_to_wamid as string) || null,
          errorDetail: (data.record.error_detail as string) || null,
          seen: Boolean(data.record.seen),
        }

        const queries = queryClient.getQueryCache().findAll({
          queryKey: ['messages', convId],
          exact: false,
        })

        queries.forEach((query) => {
          queryClient.setQueryData(query.queryKey, (old: any) => {
            if (!old) return old
            if (old.messages.some((m: any) => m.id === newMessage.id)) return old
            return {
              ...old,
              messages: [...old.messages, newMessage],
            }
          })
        })
      }

      // 2. Direct cache update for conversations list
      queryClient.setQueryData(['conversations'], (oldConvs: any) => {
        if (!oldConvs) return oldConvs
        const convExists = oldConvs.some((c: any) => c.id === convId)
        if (!convExists) {
          queryClient.invalidateQueries({ queryKey: ['conversations'] })
          return oldConvs
        }
        return oldConvs.map((conv: any) => {
          if (conv.id === convId) {
            return {
              ...conv,
              lastMessageAt: data.record.timestamp || data.record.created,
              unreadCount: conv.unreadCount + (data.record.direction === 'inbound' && !data.record.seen ? 1 : 0),
            }
          }
          return conv
        })
      })

      // 3. Direct cache update for global unread messages count
      if (data.record.direction === 'inbound') {
        queryClient.setQueryData(['unseen-messages-count'], (old: number | undefined) => {
          if (old === undefined) return old
          return old + (!data.record.seen ? 1 : 0)
        })
      }
    })

    // Subscribe to conversation changes (HITL-1). Status/state flips used to reach the
    // UI only via the 8s list poll — so staff saw the customer's receipt screenshot
    // instantly (messages realtime above) but the approve button, gated on
    // staffCallReason, appeared seconds later. Merges the changed fields straight into
    // the query cache; the customer relation is expanded server-side by the subscription.
    pb.collection('conversations').subscribe(
      '*',
      (data) => {
        if (data.action === 'delete') {
          queryClient.invalidateQueries({ queryKey: ['conversations'] })
          return
        }
        const record = data.record
        queryClient.setQueryData(['conversations'], (oldConvs: any) => {
          if (!oldConvs) return oldConvs
          const exists = oldConvs.some((c: any) => c.id === record.id)
          if (!exists) {
            // New conversation — let the server function build the full row (unread
            // counts etc.) instead of guessing here.
            queryClient.invalidateQueries({ queryKey: ['conversations'] })
            return oldConvs
          }
          const customer = (record as any).expand?.customer
          return oldConvs.map((conv: any) =>
            conv.id === record.id
              ? {
                  ...conv,
                  status: (record.status as string) || conv.status,
                  state: (record.state as string) || conv.state,
                  staffCallReason: (record.staff_call_reason as string) || null,
                  lastMessageAt: (record.last_message_at as string) || conv.lastMessageAt,
                  windowExpiresAt: (record.whatsapp_window_expires_at as string) || conv.windowExpiresAt,
                  ...(customer
                    ? { customerName: customer.name || '', customerPhone: customer.phone || '' }
                    : {}),
                }
              : conv,
          )
        })
        // The inline HITL cards (pricing / deposit preview) key off state — refresh the
        // appointment summary for this conversation when it moves through the funnel.
        queryClient.invalidateQueries({ queryKey: ['appointment-summary', record.id] })
      },
      { expand: 'customer' },
    )

    // Subscribe to system notifications
    pb.collection('notifications').subscribe('*', (data) => {
      if (data.action === 'create') {
        const notifTitle = data.record.title || 'התראת מערכת'
        const notifMessage = data.record.message || ''
        const notifLink = (data.record.link as string) || undefined

        toast(
          notifTitle,
          notifMessage,
          data.record.type || 'info',
          4000,
          () => {
            navigate({
              to: '/dashboard/notifications',
              search: { highlightId: data.record.id },
            })
          }
        )

        // Dispatch PWA / OS Notification
        void sendPwaNotification(notifTitle, {
          body: notifMessage,
          link: notifLink || `/dashboard/notifications?highlightId=${data.record.id}`,
          tag: `notif-${data.record.id}`,
        })

        const newNotification = {
          id: data.record.id,
          title: (data.record.title as string) || '',
          message: (data.record.message as string) || '',
          type: (data.record.type as any) || 'info',
          read: Boolean(data.record.read),
          link: notifLink,
          created: data.record.created,
        }

        // Update notifications list
        queryClient.setQueryData(['notifications'], (oldNotifs: any) => {
          if (!oldNotifs) return [newNotification]
          if (oldNotifs.some((n: any) => n.id === newNotification.id)) return oldNotifs
          return [newNotification, ...oldNotifs]
        })

        // Update unread notifications count
        queryClient.setQueryData(['unread-notifications-count'], (old: number | undefined) => {
          if (old === undefined) return old
          return old + (newNotification.read ? 0 : 1)
        })
      } else if (data.action === 'delete') {
        queryClient.setQueryData(['notifications'], (oldNotifs: any) => {
          if (!oldNotifs) return []
          return oldNotifs.filter((n: any) => n.id !== data.record.id)
        })
        queryClient.invalidateQueries({ queryKey: ['unread-notifications-count'] })
      } else if (data.action === 'update') {
        queryClient.setQueryData(['notifications'], (oldNotifs: any) => {
          if (!oldNotifs) return []
          return oldNotifs.map((n: any) =>
            n.id === data.record.id
              ? {
                  ...n,
                  title: (data.record.title as string) || n.title,
                  message: (data.record.message as string) || n.message,
                  read: Boolean(data.record.read),
                  type: (data.record.type as any) || n.type,
                  link: (data.record.link as string) || n.link,
                }
              : n,
          )
        })
        queryClient.invalidateQueries({ queryKey: ['unread-notifications-count'] })
      }
    })

    return () => {
      pb.collection('messages').unsubscribe('*')
      pb.collection('conversations').unsubscribe('*')
      pb.collection('notifications').unsubscribe('*')
    }
  }, [toast, queryClient, navigate])

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
              isConversations
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
