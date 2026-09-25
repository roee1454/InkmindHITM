import type { Ref } from 'react'
import { Bell } from '@/components/ui/icon'
import type { NotificationGroup } from '../types'
import { NotificationItem } from './NotificationItem'

export interface NotificationListProps {
  groups: NotificationGroup[]
  totalCount: number
  isLoading: boolean
  highlightId?: string
  highlightRef?: Ref<HTMLDivElement>
  onMarkAsRead: (id: string) => void
  onDelete: (id: string) => void
}

export function NotificationList({
  groups,
  totalCount,
  isLoading,
  highlightId,
  highlightRef,
  onMarkAsRead,
  onDelete,
}: NotificationListProps) {
  if (isLoading) {
    return (
      <div className="flex flex-col gap-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 animate-pulse rounded-2xl bg-muted" />
        ))}
      </div>
    )
  }

  if (totalCount === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-3xl border border-dashed border-border py-16 text-center">
        <Bell size={64} className="text-muted-foreground/30" />
        <p className="text-sm font-medium text-muted-foreground">אין התראות חדשות</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-5">
      {groups.map((group) => (
        <div key={group.label} className="flex flex-col gap-2">
          <h2 className="px-1 text-sm font-extrabold text-muted-foreground">{group.label}</h2>
          <div className="card-native overflow-hidden">
            {group.items.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                isHighlighted={notification.id === highlightId}
                highlightRef={notification.id === highlightId ? highlightRef : undefined}
                onMarkAsRead={onMarkAsRead}
                onDelete={onDelete}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

