import { formatListTimestamp, formatWindowRemaining } from '../utils/format'
import type { UIConversation } from '../types'
import { cn } from '@/lib/utils'
import { formatPhoneForDisplay } from '@/lib/phone'

interface ConversationRowProps {
  conversation: UIConversation
  selected: boolean
  onSelect: () => void
}

export function ConversationRow({
  conversation,
  selected,
  onSelect,
}: ConversationRowProps) {
  const displayPhone = formatPhoneForDisplay(conversation.customerPhone)
  const title = conversation.customerName || displayPhone || 'לא ידוע'
  const windowInfo = formatWindowRemaining(conversation.windowExpiresAt)
  const windowDotClass = windowInfo.status === 'expired' ? 'bg-destructive' : 'bg-muted-foreground'

  return (
    <li>
      <button
        type="button"
        onClick={onSelect}
        className={cn(
          'row-native w-full flex flex-col justify-center gap-1 p-3.5 text-start cursor-pointer transition-all',
          selected
            ? 'bg-primary/8 border-s-2 border-s-primary'
            : 'hover:bg-muted/40',
        )}
      >
        <div className="flex w-full items-baseline justify-between gap-2">
          <span className={cn('truncate text-sm font-bold', selected ? 'text-primary' : 'text-foreground')}>
            {title}
          </span>
          <span className="shrink-0 text-micro text-muted-foreground tabular-nums">
            {formatListTimestamp(conversation.lastMessageAt)}
          </span>
        </div>

        <div className="flex w-full items-center justify-between gap-2">
          <span className="truncate text-xs text-muted-foreground">
            {displayPhone}
          </span>

          <div className="flex items-center gap-1.5 shrink-0">
            {conversation.unreadCount > 0 && (
              <span className="flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-primary px-1 text-3xs font-extrabold text-primary-foreground leading-none tabular-nums">
                {conversation.unreadCount}
              </span>
            )}
            <span
              className={cn('size-2 shrink-0 rounded-full transition-colors', windowDotClass)}
              title={`חלון 24 שעות: ${windowInfo.label}`}
            />
          </div>
        </div>
      </button>
    </li>
  )
}

