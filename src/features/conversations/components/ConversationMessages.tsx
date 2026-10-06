import { Fragment, useLayoutEffect, useMemo, useRef } from 'react'
import { MessageSquare } from '@/components/ui/icon'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { MessageBubble } from './MessageBubble'
import { BotTypingIndicator } from './BotTypingIndicator'
import { formatMessageDateSeparator, getDateKey } from '../utils/format'
import type { UIConversation, UIMessage } from '../types'

interface ConversationMessagesProps {
  messages: UIMessage[]
  isLoading: boolean
  hasMore: boolean
  onLoadMore: () => void
  onReply: (msg: UIMessage) => void
  onImageClick: (url: string) => void
  /** The server's own signal (conversations.bot_turn_phase over realtime), not a "last message was recent" guess. */
  botTurnPhase: UIConversation['botTurnPhase'] | null
}

/** Loading: the shape of a conversation, not a spinner in the middle of it. */
function MessagesSkeleton() {
  return (
    <div className="flex flex-col gap-3" aria-hidden>
      {['w-2/3', 'w-1/2', 'w-3/5', 'w-2/5'].map((width, i) => (
        <Skeleton key={width} className={cn('h-14 rounded-2xl', width, i % 2 === 1 && 'self-end')} />
      ))}
    </div>
  )
}

export function ConversationMessages({ messages, isLoading, hasMore, onLoadMore, onReply, onImageClick, botTurnPhase }: ConversationMessagesProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const stickToBottom = useRef(true)

  const handleScroll = () => {
    const el = scrollRef.current
    if (el) stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 60
  }

  useLayoutEffect(() => {
    if (stickToBottom.current) bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, botTurnPhase])

  const days = useMemo(() => {
    const groups: { key: string; label: string; messages: UIMessage[] }[] = []
    for (const msg of messages) {
      const key = getDateKey(msg.timestamp)
      const last = groups.at(-1)
      if (last?.key === key) last.messages.push(msg)
      else groups.push({ key, label: formatMessageDateSeparator(msg.timestamp), messages: [msg] })
    }
    return groups
  }, [messages])

  return (
    <div ref={scrollRef} onScroll={handleScroll} className="flex flex-1 flex-col gap-2 overflow-y-auto px-3 py-4 sm:px-6">
      {hasMore && (
        <button
          type="button"
          onClick={onLoadMore}
          className="mx-auto cursor-pointer rounded-lg px-3 py-1.5 text-sm font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          הודעות קודמות
        </button>
      )}

      {isLoading ? (
        <MessagesSkeleton />
      ) : messages.length === 0 ? (
        <div className="m-auto flex flex-col items-center gap-2 text-center">
          <MessageSquare className="size-7 text-muted-foreground/50" />
          <p className="text-sm font-bold text-foreground">אין הודעות בשיחה</p>
          <p className="max-w-xs text-sm text-muted-foreground">כשהלקוח יכתוב, או כשתשלחו לו תבנית, ההודעות יופיעו כאן.</p>
        </div>
      ) : (
        days.map((day) => (
          <Fragment key={day.key}>
            <p className="mt-3 mb-1 text-center text-xs font-semibold text-muted-foreground select-none first:mt-0">{day.label}</p>
            {day.messages.map((msg) => (
              <MessageBubble key={msg.id} message={msg} onReply={onReply} onImageClick={onImageClick} />
            ))}
          </Fragment>
        ))
      )}

      {botTurnPhase && <BotTypingIndicator phase={botTurnPhase} />}
      <div ref={bottomRef} />
    </div>
  )
}
