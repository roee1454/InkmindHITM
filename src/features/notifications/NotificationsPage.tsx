import { useEffect, useRef } from 'react'
import { NotificationsHeader } from './components/NotificationsHeader'
import { PwaPermissionBanner } from './components/PwaPermissionBanner'
import { NotificationList } from './components/NotificationList'
import { useNotifications } from './hooks/useNotifications'
import { usePwaNotifications } from './hooks/usePwaNotifications'

export interface NotificationsPageProps {
  highlightId?: string
}

export function NotificationsPage({ highlightId }: NotificationsPageProps) {
  const {
    notifications,
    unreadCount,
    groups,
    isLoading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAll,
    isMarkingAllRead,
    isClearingAll,
  } = useNotifications()

  const { permission, enableNotifications } = usePwaNotifications()
  const highlightRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (highlightId && notifications.length > 0) {
      const targeted = notifications.find((n) => n.id === highlightId)
      if (targeted && !targeted.read) {
        markAsRead(highlightId)
      }
      highlightRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [highlightId, notifications, markAsRead])

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-[18px] font-assistant lg:gap-6" dir="rtl">
      <NotificationsHeader
        unreadCount={unreadCount}
        totalCount={notifications.length}
        isLoading={isLoading}
        isMarkingAllRead={isMarkingAllRead}
        isClearingAll={isClearingAll}
        onMarkAllRead={markAllAsRead}
        onClearAll={() => void clearAll()}
      />

      <PwaPermissionBanner
        permission={permission}
        onEnable={() => void enableNotifications()}
      />

      <NotificationList
        groups={groups}
        totalCount={notifications.length}
        isLoading={isLoading}
        highlightId={highlightId}
        highlightRef={highlightRef}
        onMarkAsRead={markAsRead}
        onDelete={deleteNotification}
      />
    </div>
  )
}

export default NotificationsPage
