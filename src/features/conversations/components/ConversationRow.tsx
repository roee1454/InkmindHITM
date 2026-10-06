import { cn } from '@/lib/utils'
import { formatPhoneForDisplay } from '@/lib/phone'
import { formatListTimestamp, formatWindowRemaining } from '../utils/format'
import { attentionLabel } from '../utils/labels'
import type { UIConversation } from '../types'

const SENDER_PREFIX: Partial<Record<NonNullable<UIConversation['lastMessageSender']>, string>> = {
  ai_bot: 'בוט: ',
  staff: 'צוות: ',
}

interface ConversationRowProps {
  conversation: UIConversation
  selected: boolean
  onSelect: () => void
}

/**
 * An inbox row: who, when, and one line under it — why a person has to step in, or else the last
 * message. The phone shows only when there's no name to show instead.
 */
export function ConversationRow({ conversation, selected, onSelect }: ConversationRowProps) {
  const phone = formatPhoneForDisplay(conversation.customerPhone)
  const title = conversation.customerName || phone || 'לא ידוע'
  const attention = attentionLabel(conversation)
  const unread = conversation.unreadCount > 0
  const windowClosed = formatWindowRemaining(conversation.windowExpiresAt).status === 'expired'
  const preview = conversation.lastMessagePreview
    ? `${conversation.lastMessageSender ? (SENDER_PREFIX[conversation.lastMessageSender] ?? '') : ''}${conversation.lastMessagePreview}`
    : conversation.customerName ? phone : ''

  return (
    <li>
      <button
        type="button"
        onClick={onSelect}
        aria-current={selected ? 'true' : undefined}
        className={cn(
          'flex w-full cursor-pointer flex-col gap-0.5 px-4 py-3 text-start transition-colors duration-150',
          selected ? 'bg-muted' : 'hover:bg-muted/50',
        )}
      >
        <span className="flex w-full items-baseline justify-between gap-3">
          <span className={cn('min-w-0 truncate text-sm', unread || attention ? 'font-bold text-foreground' : 'font-semibold text-foreground/85')}>{title}</span>
          <time dateTime={conversation.lastMessageAt ?? undefined} className={cn('shrink-0 text-xs tabular-nums', unread ? 'font-bold text-foreground' : 'text-muted-foreground')}>
            {formatListTimestamp(conversation.lastMessageAt)}
          </time>
        </span>

        <span className="flex w-full items-center justify-between gap-3">
          {attention ? (
            <span className="flex min-w-0 items-center gap-1.5 text-sm font-semibold text-foreground">
              <span aria-hidden className="size-1.5 shrink-0 rounded-full bg-status-wait" />
              <span className="truncate">{attention}</span>
            </span>
          ) : (
            <span className="min-w-0 truncate text-sm text-muted-foreground">{preview}</span>
          )}
          {unread ? (
            <span aria-label={`${conversation.unreadCount} הודעות שלא נקראו`} className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-foreground px-1.5 text-2xs font-extrabold text-background tabular-nums">
              {conversation.unreadCount}
            </span>
          ) : (
            windowClosed && <span className="shrink-0 text-xs text-muted-foreground">חלון סגור</span>
          )}
        </span>
      </button>
    </li>
  )
}
