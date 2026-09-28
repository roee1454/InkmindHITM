import type { Ref } from 'react'
import { AlertCircle, AlertTriangle, Bell, CheckCircle2, Info, Trash2 } from '@/components/ui/icon'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import type { ApiNotification, NotificationGroup, NotificationType } from '../types'
import { formatNotificationTime, getNotificationToneClass } from '../utils/notification-helpers'

const ICONS: Record<NotificationType, typeof Info> = { success: CheckCircle2, error: AlertCircle, warning: AlertTriangle, info: Info }

interface RowProps {
  notification: ApiNotification
  highlighted: boolean
  highlightRef?: Ref<HTMLDivElement>
  onOpen: (notification: ApiNotification) => void
  onDelete: (id: string) => void
}

function SystemNotificationRow({ notification: n, highlighted, highlightRef, onOpen, onDelete }: RowProps) {
  const Icon = ICONS[n.type] ?? Info
  return (
    <div
      ref={highlighted ? highlightRef : undefined}
      className={cn('group flex items-stretch border-t border-border/70 first:border-t-0', highlighted && 'bg-muted/60')}
    >
      {/* The whole row opens what it's about (and marks it read); delete sits beside it, not inside. */}
      <button type="button" onClick={() => onOpen(n)} className="relative flex min-w-0 flex-1 cursor-pointer items-start gap-3 px-4 py-3.5 text-start transition-colors hover:bg-muted/40">
        {!n.read && <span aria-label="לא נקרא" className="absolute start-1.5 top-5 size-1.5 rounded-full bg-foreground" />}
        <Icon size={18} className={cn('mt-0.5 shrink-0', n.read ? 'text-muted-foreground/60' : getNotificationToneClass(n.type))} />
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="flex items-baseline justify-between gap-3">
            <span className={cn('min-w-0 truncate text-sm', n.read ? 'font-semibold text-foreground/75' : 'font-extrabold text-foreground')}>{n.title}</span>
            <time dateTime={n.created} className="shrink-0 text-xs text-muted-foreground tabular-nums">
              {formatNotificationTime(n.created)}
            </time>
          </span>
          {n.message && <span className="line-clamp-2 text-sm text-muted-foreground">{n.message}</span>}
        </span>
      </button>
      <button
        type="button"
        onClick={() => onDelete(n.id)}
        aria-label={`מחיקת "${n.title}"`}
        className="flex w-11 shrink-0 cursor-pointer items-center justify-center text-muted-foreground transition-opacity hover:text-destructive focus-visible:opacity-100 lg:opacity-0 lg:group-hover:opacity-100"
      >
        <Trash2 size={15} />
      </button>
    </div>
  )
}

interface SystemNotificationListProps {
  groups: NotificationGroup[]
  isLoading: boolean
  highlightId?: string
  highlightRef?: Ref<HTMLDivElement>
  onOpen: (notification: ApiNotification) => void
  onDelete: (id: string) => void
}

/** What the system told staff — appointments, escalations, sync errors — by day. */
export function SystemNotificationList({ groups, isLoading, highlightId, highlightRef, onOpen, onDelete }: SystemNotificationListProps) {
  if (isLoading) {
    return (
      <div className="card-native flex flex-col gap-3 p-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    )
  }

  if (groups.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-16 text-center">
        <Bell size={28} className="text-muted-foreground/50" />
        <p className="text-sm font-bold text-foreground">אין התראות</p>
        <p className="max-w-xs text-sm text-muted-foreground">כשתור נקבע, שיחה צריכה צוות או סנכרון נכשל — זה יופיע כאן.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      {groups.map((group) => (
        <section key={group.label} aria-label={group.label} className="flex flex-col gap-2">
          <h2 className="px-1 text-sm font-extrabold text-muted-foreground">{group.label}</h2>
          <div className="card-native overflow-hidden">
            {group.items.map((n) => (
              <SystemNotificationRow key={n.id} notification={n} highlighted={n.id === highlightId} highlightRef={highlightRef} onOpen={onOpen} onDelete={onDelete} />
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
