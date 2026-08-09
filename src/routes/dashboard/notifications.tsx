import { createFileRoute } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Bell, CheckCheck, AlertCircle, Info, CheckCircle2, AlertTriangle, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  type ApiNotification,
} from '@/features/notifications/server/notifications'
import { z } from 'zod'
import { useEffect } from 'react'

const notificationsSearchSchema = z.object({
  highlightId: z.string().optional(),
})

export const Route = createFileRoute('/dashboard/notifications')({
  validateSearch: notificationsSearchSchema,
  component: NotificationsPage,
})

function NotificationsPage() {
  const queryClient = useQueryClient()
  const { highlightId } = Route.useSearch()

  const { data: notifications = [], isLoading } = useQuery<ApiNotification[]>({
    queryKey: ['notifications'],
    queryFn: () => getNotifications(),
    // Realtime subscription (dashboard route) inserts new notifications directly;
    // long-interval fallback only.
    refetchInterval: 60000,
  })

  const markAsReadMutation = useMutation({
    mutationFn: (id: string) => markNotificationAsRead({ data: { id } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      queryClient.invalidateQueries({ queryKey: ['unread-notifications-count'] })
    },
  })

  useEffect(() => {
    if (highlightId && notifications.length > 0) {
      const targeted = notifications.find((n) => n.id === highlightId)
      if (targeted && !targeted.read) {
        markAsReadMutation.mutate(highlightId)
      }
    }
  }, [highlightId, notifications])

  const markAllReadMutation = useMutation({
    mutationFn: () => markAllNotificationsAsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      queryClient.invalidateQueries({ queryKey: ['unread-notifications-count'] })
    },
  })

  const handleMarkAsRead = (id: string) => {
    markAsReadMutation.mutate(id)
  }

  const handleMarkAllRead = () => {
    markAllReadMutation.mutate()
  }

  const formatNotificationTime = (isoString: string) => {
    const d = new Date(isoString)
    return d.toLocaleDateString('he-IL', {
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: '2-digit',
    })
  }

  const getIcon = (type: ApiNotification['type']) => {
    switch (type) {
      case 'success':
        return <CheckCircle2 className="text-emerald-500 shrink-0" size={18} />
      case 'error':
        return <AlertCircle className="text-rose-500 shrink-0" size={18} />
      case 'warning':
        return <AlertTriangle className="text-amber-500 shrink-0" size={18} />
      default:
        return <Info className="text-blue-500 shrink-0" size={18} />
    }
  }

  const getBgClass = (notification: ApiNotification) => {
    if (notification.id === highlightId) {
      return 'bg-primary/5 border-primary shadow-sm ring-2 ring-primary/20 scale-[1.01]'
    }
    if (notification.read) {
      return 'bg-card/50 border-border/40 opacity-70'
    }
    switch (notification.type) {
      case 'success':
        return 'bg-emerald-500/5 border-emerald-500/15 shadow-xs shadow-emerald-500/2'
      case 'error':
        return 'bg-rose-500/5 border-rose-500/15 shadow-xs shadow-rose-500/2'
      case 'warning':
        return 'bg-amber-500/5 border-amber-500/15 shadow-xs shadow-amber-500/2'
      default:
        return 'bg-card border-border/80 shadow-2xs'
    }
  }

  const unreadCount = notifications.filter((n) => !n.read).length

  return (
    <div className="w-full max-w-5xl mx-auto space-y-4 md:space-y-6 text-right font-assistant py-3 md:py-6" dir="rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="hidden lg:block">
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">התראות מערכת</h1>
          <p className="text-xs text-muted-foreground mt-1">
            {isLoading ? 'טוען התראות…' : `יש לך ${unreadCount} התראות שלא נקראו`}
          </p>
        </div>

        {unreadCount > 0 && (
          <Button
            onClick={handleMarkAllRead}
            disabled={markAllReadMutation.isPending}
            variant="outline"
            size="sm"
            className="self-start sm:self-auto cursor-pointer"
          >
            <CheckCheck size={14} className="ml-1.5" />
            סמן הכל כנקרא
          </Button>
        )}
      </div>

      {/* Notifications List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-muted/40 animate-pulse rounded-xl border border-border/40" />
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 rounded-2xl border border-dashed border-border/80 bg-card/30 text-center">
          <div className="flex size-12 items-center justify-center rounded-full bg-muted mb-4">
            <Bell size={24} className="text-muted-foreground/60" />
          </div>
          <h3 className="text-sm font-bold text-foreground">אין התראות חדשות</h3>
          <p className="text-xs text-muted-foreground mt-1">כאשר יהיו עדכונים או פעילויות במערכת, הם יופיעו כאן.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((notification) => (
            <div
              key={notification.id}
              onClick={() => !notification.read && handleMarkAsRead(notification.id)}
              className={`flex items-start gap-4 rounded-xl border p-4 transition-all duration-300 ${getBgClass(
                notification
              )} ${!notification.read ? 'cursor-pointer hover:border-border' : ''}`}
            >
              {/* Icon */}
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-card border border-border shadow-3xs">
                {getIcon(notification.type)}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <h3 className={`text-sm font-bold text-foreground ${!notification.read ? '' : 'font-semibold text-muted-foreground'}`}>
                    {notification.title}
                  </h3>
                  <span className="text-micro text-muted-foreground font-mono shrink-0">
                    {formatNotificationTime(notification.created)}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  {notification.message}
                </p>

                {/* Optional CTA Link */}
                {notification.link && (
                  <a
                    href={notification.link}
                    className="inline-flex items-center gap-1 text-mini font-semibold text-primary hover:underline mt-2.5"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <span>פרטים נוספים / מעבר לעמוד</span>
                    <ExternalLink size={10} />
                  </a>
                )}
              </div>

              {/* Status Dot */}
              {!notification.read && (
                <span className="h-2 w-2 rounded-full bg-primary animate-pulse shrink-0 self-center" />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
export default NotificationsPage
