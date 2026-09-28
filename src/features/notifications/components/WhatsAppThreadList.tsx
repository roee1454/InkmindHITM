import { MessageCircle, Trash2 } from '@/components/ui/icon'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import type { WhatsAppThread } from '../utils/notification-helpers'
import { formatNotificationTime } from '../utils/notification-helpers'

interface WhatsAppThreadListProps {
  threads: WhatsAppThread[]
  isLoading: boolean
  onOpen: (thread: WhatsAppThread) => void
  onDelete: (thread: WhatsAppThread) => void
}

/**
 * Who wrote in on WhatsApp: one row per conversation — the latest message and how many are unread
 * — like an inbox, not one line per message. Opening a row goes to the conversation and marks it read.
 */
export function WhatsAppThreadList({ threads, isLoading, onOpen, onDelete }: WhatsAppThreadListProps) {
  if (isLoading) {
    return (
      <div className="card-native flex flex-col gap-3 p-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    )
  }

  if (threads.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-16 text-center">
        <MessageCircle size={28} className="text-muted-foreground/50" />
        <p className="text-sm font-bold text-foreground">אין הודעות חדשות</p>
        <p className="max-w-xs text-sm text-muted-foreground">כשלקוח כותב בוואטסאפ, השיחה תופיע כאן עד שפותחים אותה.</p>
      </div>
    )
  }

  return (
    <div className="card-native overflow-hidden">
      {threads.map((thread) => {
        const unread = thread.unreadIds.length
        return (
          <div key={thread.key} className="group flex items-stretch border-t border-border/70 first:border-t-0">
            <button type="button" onClick={() => onOpen(thread)} className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 px-4 py-3 text-start transition-colors hover:bg-muted/40">
              <span className="avatar-native size-10 text-sm">{thread.sender.charAt(0) || '?'}</span>
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="flex items-baseline justify-between gap-3">
                  <span className={cn('min-w-0 truncate text-sm', unread ? 'font-extrabold text-foreground' : 'font-semibold text-foreground/75')}>{thread.sender}</span>
                  <time dateTime={thread.latestAt} className={cn('shrink-0 text-xs tabular-nums', unread ? 'font-bold text-foreground' : 'text-muted-foreground')}>
                    {formatNotificationTime(thread.latestAt)}
                  </time>
                </span>
                <span className="flex items-center justify-between gap-3">
                  <span className="min-w-0 truncate text-sm text-muted-foreground">{thread.preview}</span>
                  {unread > 0 && (
                    <span aria-label={`${unread} לא נקראו`} className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-foreground px-1.5 text-2xs font-extrabold text-background tabular-nums">
                      {unread}
                    </span>
                  )}
                </span>
              </span>
            </button>
            <button
              type="button"
              onClick={() => onDelete(thread)}
              aria-label={`הסרת ההתראות של ${thread.sender}`}
              className="flex w-11 shrink-0 cursor-pointer items-center justify-center text-muted-foreground transition-opacity hover:text-destructive focus-visible:opacity-100 lg:opacity-0 lg:group-hover:opacity-100"
            >
              <Trash2 size={15} />
            </button>
          </div>
        )
      })}
    </div>
  )
}
