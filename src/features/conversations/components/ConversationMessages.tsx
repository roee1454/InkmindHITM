import { Fragment, useLayoutEffect, useMemo, useRef } from 'react'
import { Loader2, MessageSquare } from '@/components/ui/icon'
import { MessageBubble } from './MessageBubble'
import { BookingActionCard } from './BookingActionCard'
import { BotTypingIndicator } from './BotTypingIndicator'
import { formatMessageDateSeparator, getDateKey } from '../utils/format'
import type { UIAppointmentSummary, UIConversation, UIMessage } from '../types'

interface ConversationMessagesProps {
  messages: UIMessage[]
  isLoading: boolean
  hasMore: boolean
  onLoadMore: () => void
  onReply: (msg: UIMessage) => void
  onImageClick: (url: string) => void
  appointment: UIAppointmentSummary | null
  conversation: UIConversation
}

export function ConversationMessages({
  messages,
  isLoading,
  hasMore,
  onLoadMore,
  onReply,
  onImageClick,
  appointment,
  conversation,
}: ConversationMessagesProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const shouldStickToBottom = useRef(true)

  // Driven by the real server-side signal (conversation.botTurnPhase, kept in sync over realtime
  // by use-dashboard-realtime.ts) instead of a client-side "was the last message recent" guess —
  // that heuristic never auto-hid once 45s passed without a render-triggering new message.
  const botTurnPhase = conversation.botTurnPhase || null

  const handleScroll = () => {
    const el = scrollRef.current
    if (!el) return
    const distanceToBottom = el.scrollHeight - el.scrollTop - el.clientHeight
    shouldStickToBottom.current = distanceToBottom < 60
  }

  useLayoutEffect(() => {
    if (shouldStickToBottom.current) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, botTurnPhase])

  const dateGroupedMessages = useMemo(() => {
    const groups: { key: string; label: string; messages: UIMessage[] }[] = []
    let currentGroup: { key: string; label: string; messages: UIMessage[] } | null = null

    for (const msg of messages) {
      const key = getDateKey(msg.timestamp)
      if (!currentGroup || currentGroup.key !== key) {
        currentGroup = {
          key,
          label: formatMessageDateSeparator(msg.timestamp),
          messages: [msg],
        }
        groups.push(currentGroup)
      } else {
        currentGroup.messages.push(msg)
      }
    }
    return groups
  }, [messages])

  return (
    <div
      ref={scrollRef}
      onScroll={handleScroll}
      className="flex-1 overflow-y-auto px-4 py-4 space-y-4"
    >
      {hasMore && (
        <div className="flex justify-center">
          <button
            type="button"
            onClick={onLoadMore}
            className="rounded-full border border-border bg-card px-3 py-1 text-xs font-semibold text-muted-foreground hover:bg-muted cursor-pointer transition-colors"
          >
            טעינת הודעות ישנות יותר
          </button>
        </div>
      )}

      {isLoading ? (
        <div className="flex h-full flex-col items-center justify-center gap-2 text-muted-foreground py-16">
          <Loader2 className="size-6 animate-spin text-primary" />
          <span className="text-xs font-semibold">טוען הודעות…</span>
        </div>
      ) : messages.length === 0 ? (
        <div className="flex h-full flex-col items-center justify-center gap-2 text-muted-foreground py-16">
          <MessageSquare className="size-8 text-muted-foreground/40" />
          <span className="text-sm font-medium">אין הודעות עדיין.</span>
        </div>
      ) : (
        dateGroupedMessages.map((group) => (
          <Fragment key={group.key}>
            <div className="flex justify-center my-3">
              <span className="rounded-full border border-border bg-card px-3 py-0.5 text-2xs font-bold text-muted-foreground shadow-2xs select-none">
                {group.label}
              </span>
            </div>
            {group.messages.map((msg) => (
              <MessageBubble
                key={msg.id}
                message={msg}
                onReply={onReply}
                onImageClick={onImageClick}
              />
            ))}
          </Fragment>
        ))
      )}

      {botTurnPhase && <BotTypingIndicator phase={botTurnPhase} />}
      {appointment && <BookingActionCard conversation={conversation} />}
      <div ref={bottomRef} />
    </div>
  )
}

