import { useEffect, useRef } from 'react'
import { useNavigate, useLocation } from '@tanstack/react-router'
import { useQueryClient } from '@tanstack/react-query'
import { getBrowserClient } from '@/integrations/pocketbase/client'
import { useToast } from '@/components/ui/ToastProvider'
import { sendPwaNotification } from '@/features/notifications/utils/pwa-notifications'
import type { MessageStatus, MessageType } from '@/integrations/whatsapp-cloud-api/types'
import type { UIConversation, UIMessage } from '@/features/conversations/types'
import type { ApiNotification } from '@/features/notifications/server/notifications'
import type { RecordModel } from 'pocketbase'

interface DashboardRealtimeProps {
  sessionToken?: string
  sessionStaff?: RecordModel
}

export function useDashboardRealtime({ sessionToken, sessionStaff }: DashboardRealtimeProps) {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const location = useLocation()

  const toastRef = useRef(toast)
  toastRef.current = toast
  const navigateRef = useRef(navigate)
  navigateRef.current = navigate
  const locationRef = useRef(location)
  locationRef.current = location
  const sessionStaffRef = useRef(sessionStaff)
  sessionStaffRef.current = sessionStaff

  const staffId = sessionStaff?.id

  useEffect(() => {
    if (!sessionToken || !staffId) {
      return
    }

    const pb = getBrowserClient()
    pb.authStore.save(sessionToken, sessionStaffRef.current)

    // 1. Messages subscription: immediate synchronous cache updates
    pb.collection('messages').subscribe('*', (data) => {
      if (data.action !== 'create') return

      const convId = data.record.conversation as string
      if (!convId) return

      const newMessage: UIMessage = {
        id: data.record.id,
        direction: data.record.direction as 'inbound' | 'outbound',
        senderType: data.record.sender_type as 'customer' | 'ai_bot' | 'staff',
        type: data.record.type as MessageType,
        body: (data.record.body as string) || '',
        mediaFilename: (data.record.media as string) || null,
        status: (data.record.status as MessageStatus) || null,
        timestamp: (data.record.timestamp as string) || data.record.created,
        replyToWamid: (data.record.reply_to_wamid as string) || null,
        errorDetail: (data.record.error_detail as string) || null,
        seen: Boolean(data.record.seen),
        mediaCategory: null,
      }

      // Update message thread cache
      const queries = queryClient.getQueryCache().findAll({
        queryKey: ['messages', convId],
        exact: false,
      })

      queries.forEach((query) => {
        queryClient.setQueryData(
          query.queryKey,
          (old: { messages: UIMessage[]; hasMore: boolean } | undefined) => {
            if (!old) return old
            if (old.messages.some((m) => m.id === newMessage.id)) return old
            return {
              ...old,
              messages: [...old.messages, newMessage],
            }
          }
        )
      })

      // Update conversations list cache
      queryClient.setQueryData<UIConversation[]>(['conversations'], (oldConvs) => {
        if (!oldConvs) return oldConvs
        const convExists = oldConvs.some((c) => c.id === convId)
        if (!convExists) {
          queryClient.invalidateQueries({ queryKey: ['conversations'] })
          return oldConvs
        }
        return oldConvs.map((conv) => {
          if (conv.id === convId) {
            return {
              ...conv,
              lastMessageAt: (data.record.timestamp as string) || data.record.created,
              unreadCount: conv.unreadCount + (data.record.direction === 'inbound' && !data.record.seen ? 1 : 0),
            }
          }
          return conv
        })
      })

      // Update global unread messages count & dispatch alerts
      if (data.record.direction === 'inbound') {
        queryClient.setQueryData(['unseen-messages-count'], (old: number | undefined) => {
          if (old === undefined) return old
          return old + (!data.record.seen ? 1 : 0)
        })

        const loc = locationRef.current
        const isViewingThisChat =
          loc.pathname.startsWith('/dashboard/conversations') &&
          (loc.search as Record<string, unknown>)?.chatId === convId

        if (!isViewingThisChat) {
          const convs = queryClient.getQueryData<UIConversation[]>(['conversations'])
          const conv = convs?.find((c) => c.id === convId)
          const senderName = conv?.customerName || conv?.customerPhone || 'לקוח'

          const msgBody =
            (data.record.body as string) ||
            (data.record.type === 'image'
              ? '📷 שלח/ה תמונה'
              : data.record.type === 'audio'
                ? '🎵 הודעה קולית'
                : data.record.type === 'document'
                  ? '📄 שלח/ה מסמך'
                  : 'שלח/ה מדיה')
          const notifTitle = `הודעה חדשה מ-${senderName}`
          const notifLink = `/dashboard/conversations?chatId=${convId}`

          toastRef.current(
            notifTitle,
            msgBody,
            'info',
            4000,
            () => {
              navigateRef.current({
                to: '/dashboard/conversations',
                search: { chatId: convId },
              })
            }
          )

          void sendPwaNotification(notifTitle, {
            body: msgBody,
            link: notifLink,
            tag: `msg-${data.record.id}`,
          })
        }
      }
    })

    // 2. Conversations subscription: status/state/staff changes
    pb.collection('conversations').subscribe(
      '*',
      (data) => {
        if (data.action === 'delete') {
          queryClient.invalidateQueries({ queryKey: ['conversations'] })
          return
        }
        const record = data.record
        queryClient.setQueryData<UIConversation[]>(['conversations'], (oldConvs) => {
          if (!oldConvs) return oldConvs
          const exists = oldConvs.some((c) => c.id === record.id)
          if (!exists) {
            queryClient.invalidateQueries({ queryKey: ['conversations'] })
            return oldConvs
          }
          const customer = record.expand?.customer as RecordModel | undefined
          return oldConvs.map((conv) =>
            conv.id === record.id
              ? {
                  ...conv,
                  status: (record.status as string) || conv.status,
                  state: (record.state as string) || conv.state,
                  staffCallReason: (record.staff_call_reason as string) || null,
                  lastMessageAt: (record.last_message_at as string) || conv.lastMessageAt,
                  windowExpiresAt: (record.whatsapp_window_expires_at as string) || conv.windowExpiresAt,
                  // Nullish (not ||) — the server legitimately clears this back to '' when a
                  // queued turn finishes, and '' must not fall back to the previous phase.
                  botTurnPhase: (record.bot_turn_phase as UIConversation['botTurnPhase']) ?? '',
                  ...(customer
                    ? {
                        customerName: (customer.name as string) || '',
                        customerPhone: (customer.phone as string) || '',
                        customerSource: (customer.source as UIConversation['customerSource']) ?? null,
                      }
                    : {}),
                }
              : conv,
          )
        })
        queryClient.invalidateQueries({ queryKey: ['appointment-summary', record.id] })
        // Invalidate active-appointment so ConversationThread picks up new appointments in real-time
        queryClient.invalidateQueries({ queryKey: ['active-appointment', record.id] })
      },
      { expand: 'customer' },
    )

    // 3. Appointments subscription: invalidate when an appointment is created/updated
    pb.collection('appointments').subscribe('*', (data) => {
      if (data.action === 'delete') return
      const convId = data.record.conversation as string | undefined
      if (convId) {
        queryClient.invalidateQueries({ queryKey: ['active-appointment', convId] })
        queryClient.invalidateQueries({ queryKey: ['appointment-summary', convId] })
      }
      queryClient.invalidateQueries({ queryKey: ['appointments'] })
    })

    // 4. Notifications subscription: persistent system notifications
    pb.collection('notifications').subscribe('*', (data) => {
      if (data.action === 'create') {
        const notifTitle = data.record.title || 'התראת מערכת'
        const notifMessage = data.record.message || ''
        const notifLink = (data.record.link as string) || undefined

        const newNotification: ApiNotification = {
          id: data.record.id,
          title: (data.record.title as string) || '',
          message: (data.record.message as string) || '',
          type: (data.record.type as ApiNotification['type']) || 'info',
          read: Boolean(data.record.read),
          link: notifLink || undefined,
          created: data.record.created,
        }

        queryClient.setQueryData<ApiNotification[]>(['notifications'], (oldNotifs) => {
          if (!oldNotifs) return [newNotification]
          if (oldNotifs.some((n) => n.id === newNotification.id)) return oldNotifs
          return [newNotification, ...oldNotifs]
        })

        queryClient.setQueryData(['unread-notifications-count'], (old: number | undefined) => {
          if (old === undefined) return 1
          return old + (newNotification.read ? 0 : 1)
        })

        if (!notifLink?.includes('chatId=')) {
          toastRef.current(
            notifTitle,
            notifMessage,
            (data.record.type as ApiNotification['type']) || 'info',
            4000,
            () => {
              navigateRef.current({
                to: '/dashboard/notifications',
                search: { highlightId: data.record.id },
              })
            }
          )

          void sendPwaNotification(notifTitle, {
            body: notifMessage,
            link: notifLink || `/dashboard/notifications?highlightId=${data.record.id}`,
            tag: `notif-${data.record.id}`,
          })
        }
      } else if (data.action === 'delete') {
        queryClient.setQueryData<ApiNotification[]>(['notifications'], (oldNotifs) => {
          if (!oldNotifs) return []
          return oldNotifs.filter((n) => n.id !== data.record.id)
        })
        queryClient.invalidateQueries({ queryKey: ['unread-notifications-count'] })
      } else if (data.action === 'update') {
        queryClient.setQueryData<ApiNotification[]>(['notifications'], (oldNotifs) => {
          if (!oldNotifs) return []
          return oldNotifs.map((n) =>
            n.id === data.record.id
              ? {
                  ...n,
                  title: (data.record.title as string) || n.title,
                  message: (data.record.message as string) || n.message,
                  read: Boolean(data.record.read),
                  type: (data.record.type as ApiNotification['type']) || n.type,
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
      pb.collection('appointments').unsubscribe('*')
      pb.collection('notifications').unsubscribe('*')
    }
  }, [queryClient, sessionToken, staffId])
}
