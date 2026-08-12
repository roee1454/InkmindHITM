import { createFileRoute } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Bell, CheckCheck, AlertCircle, Info, CheckCircle2, AlertTriangle, ExternalLink } from 'lucide-react'
import {
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  type ApiNotification,
} from '@/features/notifications/server/notifications'
import { z } from 'zod'
import { useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'

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

  const highlightRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (highlightId && notifications.length > 0) {
      const targeted = notifications.find((n) => n.id === highlightId)
      if (targeted && !targeted.read) {
        markAsReadMutation.mutate(highlightId)
      }
      highlightRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const formatRelativeTime = (isoString: string) => {
    const d = new Date(isoString)
    return d.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })
  }

  const getIconChipClass = (type: ApiNotification['type']) => {
    switch (type) {
      case 'success':
        return 'bg-success/12 text-success'
      case 'error':
        return 'bg-destructive/10 text-destructive'
      case 'warning':
        return 'bg-warning/12 text-warning'
      default:
        return 'bg-primary/10 text-primary'
    }
  }

  const getIcon = (type: ApiNotification['type']) => {
    switch (type) {
      case 'success':
        return <CheckCircle2 size={18} />
      case 'error':
        return <AlertCircle size={18} />
      case 'warning':
        return <AlertTriangle size={18} />
      default:
        return <Info size={18} />
    }
  }

  const unreadCount = notifications.filter((n) => !n.read).length

  // Group by date bucket — היום / אתמול / השבוע / קודם לכן.
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
  const today = startOfDay(new Date())
  const yesterday = today - 86400000
  const weekAgo = today - 7 * 86400000

  const groups: { label: string; items: ApiNotification[] }[] = [
    { label: 'היום', items: [] },
    { label: 'אתמול', items: [] },
    { label: 'השבוע', items: [] },
    { label: 'קודם לכן', items: [] },
  ]
  for (const n of notifications) {
    const day = startOfDay(new Date(n.created))
    if (day === today) groups[0]!.items.push(n)
    else if (day === yesterday) groups[1]!.items.push(n)
    else if (day > weekAgo) groups[2]!.items.push(n)
    else groups[3]!.items.push(n)
  }
  const nonEmptyGroups = groups.filter((g) => g.items.length > 0)

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-[18px] font-assistant lg:gap-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="page-head">
          <h1>התראות מערכת</h1>
          <p>{isLoading ? 'טוען התראות…' : `יש לך ${unreadCount} התראות שלא נקראו`}</p>
        </div>

        {unreadCount > 0 && (
          <button
            type="button"
            onClick={handleMarkAllRead}
            disabled={markAllReadMutation.isPending}
            className="shrink-0 cursor-pointer text-[13.5px] font-bold text-primary disabled:opacity-50"
          >
            <CheckCheck size={14} className="me-1 inline" />
            סמן הכל כנקרא
          </button>
        )}
      </div>

      {/* Notifications List */}
      {isLoading ? (
        <div className="flex flex-col gap-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-2xl bg-muted" />
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-3xl border border-dashed border-border py-16 text-center">
          <Bell size={64} className="text-muted-foreground/30" />
          <p className="text-sm font-medium text-muted-foreground">אין התראות חדשות</p>
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          {nonEmptyGroups.map((group) => (
            <div key={group.label} className="flex flex-col gap-2">
              <h2 className="px-1 text-[13px] font-extrabold text-muted-foreground">{group.label}</h2>
              <div className="card-native overflow-hidden">
                {group.items.map((notification) => (
                  <div
                    key={notification.id}
                    ref={notification.id === highlightId ? highlightRef : undefined}
                    onClick={() => !notification.read && handleMarkAsRead(notification.id)}
                    className={cn(
                      'row-native relative',
                      !notification.read && 'bg-primary/5',
                      !notification.read && 'cursor-pointer',
                      notification.id === highlightId && 'ring-2 ring-primary/40',
                    )}
                  >
                    {!notification.read && (
                      <span className="absolute start-1.5 top-1/2 size-2 -translate-y-1/2 rounded-full bg-primary" />
                    )}
                    <div
                      className={cn(
                        'flex size-9 shrink-0 items-center justify-center rounded-xl',
                        getIconChipClass(notification.type),
                      )}
                    >
                      {getIcon(notification.type)}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="truncate text-[15px] font-bold text-foreground">{notification.title}</h3>
                        <span className="shrink-0 text-[12px] tabular-nums text-muted-foreground">
                          {formatRelativeTime(notification.created)}
                        </span>
                      </div>
                      <p className="mt-0.5 truncate text-[13px] text-muted-foreground">{notification.message}</p>

                      {notification.link && (
                        <a
                          href={notification.link}
                          className="mt-1.5 inline-flex items-center gap-1 text-[12.5px] font-bold text-primary"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <span>פרטים נוספים</span>
                          <ExternalLink size={11} />
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
export default NotificationsPage
