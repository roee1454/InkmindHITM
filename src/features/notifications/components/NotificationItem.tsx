import type { Ref } from 'react'
import { Link } from '@tanstack/react-router'
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  Info,
  Trash2,
} from '@/components/ui/icon'
import { cn } from '@/lib/utils'
import type { ApiNotification, NotificationType } from '../types'
import {
  formatNotificationTime,
  getNotificationIconChipClass,
} from '../utils/notification-helpers'

function getNotificationIcon(type: NotificationType) {
  switch (type) {
    case 'success':
      return <CheckCircle2 size={18} />
    case 'error':
      return <AlertCircle size={18} />
    case 'warning':
      return <AlertTriangle size={18} />
    case 'info':
    default:
      return <Info size={18} />
  }
}

export interface NotificationItemProps {
  notification: ApiNotification
  isHighlighted?: boolean
  highlightRef?: Ref<HTMLDivElement>
  onMarkAsRead: (id: string) => void
  onDelete: (id: string) => void
}

export function NotificationItem({
  notification,
  isHighlighted = false,
  highlightRef,
  onMarkAsRead,
  onDelete,
}: NotificationItemProps) {
  return (
    <div
      ref={isHighlighted ? highlightRef : undefined}
      onClick={() => !notification.read && onMarkAsRead(notification.id)}
      className={cn(
        'row-native group relative items-center gap-3',
        !notification.read && 'cursor-pointer bg-primary/5',
        isHighlighted && 'ring-2 ring-primary/40',
      )}
    >
      {!notification.read && (
        <span className="absolute start-1.5 top-1/2 size-2 -translate-y-1/2 rounded-full bg-primary" />
      )}
      <div
        className={cn(
          'flex size-9 shrink-0 items-center justify-center rounded-xl',
          getNotificationIconChipClass(notification.type),
        )}
      >
        {getNotificationIcon(notification.type)}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <h3 className="truncate text-base font-bold text-foreground">{notification.title}</h3>
          <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
            {formatNotificationTime(notification.created)}
          </span>
        </div>
        <p className="mt-0.5 truncate text-sm text-muted-foreground">{notification.message}</p>

        {notification.link && (
          <Link
            to={notification.link}
            className="mt-1.5 inline-flex items-center gap-1 text-xs font-bold text-primary"
            onClick={(e) => e.stopPropagation()}
          >
            <span>פרטים נוספים</span>
            <ExternalLink size={11} />
          </Link>
        )}
      </div>

      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          onDelete(notification.id)
        }}
        title="מחק התראה"
        className="flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-lg text-muted-foreground opacity-70 transition-all hover:bg-destructive/10 hover:text-destructive hover:opacity-100 active:scale-90"
      >
        <Trash2 size={15} />
      </button>
    </div>
  )
}

