import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useToast } from '@/components/ui/ToastProvider'
import { queryKeys } from '@/lib/query-keys'
import { getActiveAppointmentSummary, listMessages, markConversationAsSeen, sendMessage, takeOverConversation } from '../server/messages'
import { useConversationsUiStore } from '../store/conversationsUiStore'
import { formatWindowRemaining } from '../utils/format'
import { collectThreadMedia } from '../utils/thread-media'
import { resolveThreadAction } from '../utils/thread-action'
import type { UIAppointmentSummary, UIConversation, UIMessage } from '../types'

type MessagesPage = { messages: UIMessage[]; hasMore: boolean }

/** One conversation's data and the thread-level changes: send, take over, mark seen. */
export function useConversationThread(conversation: UIConversation) {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const { draft, replyingTo, selectedFile, messagesLimit, setDraft, setReplyingTo, setSelectedFile, resetThread } = useConversationsUiStore()

  useEffect(() => {
    resetThread()
  }, [conversation.id, resetThread])

  // The 24h window is measured against the clock, not against data: re-render once a minute.
  const [, tick] = useState(0)
  useEffect(() => {
    const interval = window.setInterval(() => tick((n) => n + 1), 60_000)
    return () => window.clearInterval(interval)
  }, [])
  const windowInfo = formatWindowRemaining(conversation.windowExpiresAt)

  const { data: appointment = null } = useQuery<UIAppointmentSummary | null>({
    queryKey: ['active-appointment', conversation.id],
    queryFn: () => getActiveAppointmentSummary({ data: { conversationId: conversation.id } }),
  })

  const messagesKey = ['messages', conversation.id, messagesLimit]
  const { data: page, isLoading } = useQuery({
    queryKey: messagesKey,
    queryFn: () => listMessages({ data: { conversationId: conversation.id, limit: messagesLimit } }),
    refetchInterval: 30000,
  })
  const messages = useMemo(() => page?.messages ?? [], [page])

  useEffect(() => {
    if (messages.length === 0) return
    void markConversationAsSeen({ data: { conversationId: conversation.id } }).then(() => {
      queryClient.invalidateQueries({ queryKey: queryKeys.conversations })
    })
  }, [conversation.id, messages.length, queryClient])

  const send = useMutation({
    mutationFn: () =>
      sendMessage({
        data: {
          conversationId: conversation.id,
          body: draft,
          replyToWamid: replyingTo?.whatsappMessageId || undefined,
          mediaData: selectedFile
            ? { filename: selectedFile.filename, mimeType: selectedFile.mimeType, base64: selectedFile.base64 }
            : undefined,
        },
      }),
    onSuccess: (sent) => {
      setDraft('')
      setSelectedFile(null)
      setReplyingTo(null)
      queryClient.setQueryData<MessagesPage>(messagesKey, (old) => (old ? { ...old, messages: [...old.messages, sent] } : { messages: [sent], hasMore: false }))
      queryClient.invalidateQueries({ queryKey: queryKeys.conversations })
    },
    onError: (err) => toast('ההודעה לא נשלחה', err instanceof Error ? err.message : 'נסו שוב.', 'error'),
  })

  const takeOver = useMutation({
    mutationFn: () => takeOverConversation({ data: { conversationId: conversation.id } }),
    onSuccess: () => {
      toast('השיחה אצלך', 'הבוט לא יענה עד שתחזירו אותה אליו.', 'info')
      queryClient.invalidateQueries({ queryKey: queryKeys.conversations })
    },
    onError: (err) => toast('ההשתלטות נכשלה', err instanceof Error ? err.message : 'נסו שוב.', 'error'),
  })

  const media = useMemo(() => collectThreadMedia(messages, appointment, conversation), [messages, appointment, conversation])
  const action = resolveThreadAction(conversation, appointment, Boolean(media.latestReceiptUrl))

  return {
    appointment,
    messages,
    hasMore: page?.hasMore ?? false,
    isLoading,
    windowInfo,
    windowExpired: windowInfo.status === 'expired',
    media,
    action,
    send,
    takeOver,
  }
}
