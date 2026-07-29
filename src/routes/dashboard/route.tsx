import { useEffect } from 'react'
import { createFileRoute, Outlet, redirect, useLocation, useNavigate } from '@tanstack/react-router'
import { Sidebar } from '@/components/Sidebar'
import { getCurrentSession } from '@/features/auth/server/auth'
import { getSettings } from '@/features/onboarding/server/onboarding'
import { getBrowserClient } from '@/integrations/pocketbase/client'
import { useToast } from '@/components/ui/ToastProvider'
import { useQueryClient } from '@tanstack/react-query'

export const Route = createFileRoute('/dashboard')({
  beforeLoad: async () => {
    const session = await getCurrentSession()
    if (!session) throw redirect({ to: '/auth/login' })
    const settings = await getSettings()
    if (!settings?.onboarding_completed) throw redirect({ to: '/onboarding/profile' })
    return { session }
  },
  loader: ({ context }) => context.session,
  component: DashboardLayout,
})

function DashboardLayout() {
  const session = Route.useLoaderData()
  const location = useLocation()
  const navigate = useNavigate()
  const isConversations = location.pathname.startsWith('/dashboard/conversations')
  const { toast } = useToast()
  const queryClient = useQueryClient()

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

        toast(
          `הודעה חדשה מ-${senderName}`,
          data.record.body || 'שלח/ה מדיה',
          'info',
          4000,
          () => {
            navigate({
              to: '/dashboard/conversations',
              search: { chatId: convId },
            })
          }
        )
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
        toast(
          data.record.title || 'התראת מערכת',
          data.record.message || '',
          data.record.type || 'info',
          4000,
          () => {
            navigate({
              to: '/dashboard/notifications',
              search: { highlightId: data.record.id },
            })
          }
        )

        const newNotification = {
          id: data.record.id,
          title: (data.record.title as string) || '',
          message: (data.record.message as string) || '',
          type: (data.record.type as any) || 'info',
          read: Boolean(data.record.read),
          link: (data.record.link as string) || undefined,
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
      }
    })

    return () => {
      pb.collection('messages').unsubscribe('*')
      pb.collection('conversations').unsubscribe('*')
      pb.collection('notifications').unsubscribe('*')
    }
  }, [toast, queryClient, navigate])

  return (
    <div className="flex min-h-svh bg-background">
      <Sidebar staff={session.staff} />
      <main className={isConversations ? "h-svh min-w-0 flex-1 overflow-hidden p-0 m-0" : "page-container min-w-0 flex-1"}>
        <Outlet />
      </main>
    </div>
  )
}
