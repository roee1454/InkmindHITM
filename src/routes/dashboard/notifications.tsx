import { createFileRoute } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Bell,
  BellRing,
  CheckCheck,
  AlertCircle,
  Info,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  Trash2,
} from 'lucide-react'
import {
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  clearAllNotifications,
  type ApiNotification,
} from '@/features/notifications/server/notifications'
import {
  getNotificationPermission,
  requestNotificationPermission,
  sendPwaNotification,
} from '@/features/notifications/lib/pwa-notifications'
import { useConfirm } from '@/hooks/use-confirm'
import { z } from 'zod'
import { useEffect, useRef, useState } from 'react'
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
  const confirm = useConfirm()
  const { highlightId } = Route.useSearch()

  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>('unsupported')

  useEffect(() => {
    setPermission(getNotificationPermission())
  }, [])

  const handleEnableNotifications = async () => {
    const res = await requestNotificationPermission()
    setPermission(res)
    if (res === 'granted') {
      void sendPwaNotification('התראות הופעלו בהצלחה!', {
        body: 'מעכשיו תקבל התראות מערכת ועדכונים בזמן אמת',
      })
    }
  }

  const { data: notifications = [], isLoading } = useQuery<ApiNotification[]>({
    queryKey: ['notifications'],
    queryFn: () => getNotifications(),
    refetchInterval: 60000,
  })

  const markAsReadMutation = useMutation({
    mutationFn: (id: string) => markNotificationAsRead({ data: { id } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      queryClient.invalidateQueries({ queryKey: ['unread-notifications-count'] })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteNotification({ data: { id } }),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['notifications'] })
      const previous = queryClient.getQueryData<ApiNotification[]>(['notifications'])
      queryClient.setQueryData<ApiNotification[]>(['notifications'], (old) =>
        old ? old.filter((n) => n.id !== id) : [],
      )
      queryClient.invalidateQueries({ queryKey: ['unread-notifications-count'] })
      return { previous }
    },
    onError: (_err, _id, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['notifications'], context.previous)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      queryClient.invalidateQueries({ queryKey: ['unread-notifications-count'] })
    },
  })

  const clearAllMutation = useMutation({
    mutationFn: () => clearAllNotifications(),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['notifications'] })
      const previous = queryClient.getQueryData<ApiNotification[]>(['notifications'])
      queryClient.setQueryData<ApiNotification[]>(['notifications'], () => [])
      queryClient.setQueryData(['unread-notifications-count'], () => 0)
      return { previous }
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['notifications'], context.previous)
      }
    },
    onSettled: () => {
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

  const handleDeleteNotification = (id: string) => {
    deleteMutation.mutate(id)
  }

  const handleClearAll = async () => {
    const ok = await confirm({
      title: 'מחיקת כל ההתראות',
      description: 'האם אתה בטוח שברצונך למחוק את כל ההתראות? פעולה זו אינה ניתנת לביטול.',
      confirmLabel: 'מחק הכל',
      cancelLabel: 'ביטול',
      variant: 'destructive',
    })
    if (ok) {
      clearAllMutation.mutate()
    }
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
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="page-head">
          <h1>התראות מערכת</h1>
          <p>{isLoading ? 'טוען התראות…' : `יש לך ${unreadCount} התראות שלא נקראו`}</p>
        </div>

        <div className="flex items-center gap-3">
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={handleMarkAllRead}
              disabled={markAllReadMutation.isPending}
              className="flex shrink-0 cursor-pointer items-center gap-1 text-[13.5px] font-bold text-primary transition-colors hover:underline disabled:opacity-50"
            >
              <CheckCheck size={14} />
              <span>סמן הכל כנקרא</span>
            </button>
          )}

          {notifications.length > 0 && (
            <button
              type="button"
              onClick={handleClearAll}
              disabled={clearAllMutation.isPending}
              className="flex shrink-0 cursor-pointer items-center gap-1 text-[13.5px] font-bold text-destructive transition-colors hover:underline disabled:opacity-50"
            >
              <Trash2 size={14} />
              <span>מחק הכל</span>
            </button>
          )}
        </div>
      </div>

      {/* PWA Notification Permission Banner */}
      {permission === 'default' && (
        <div className="flex flex-col gap-3 rounded-2xl border border-primary/20 bg-primary/5 p-4 sm:flex-row sm:items-center sm:justify-between sm:rounded-3xl">
          <div className="flex items-center gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <BellRing size={18} />
            </div>
            <div>
              <div className="text-sm font-extrabold text-foreground">הפעל התראות מכשיר ו-PWA</div>
              <div className="text-xs font-medium text-muted-foreground">
                קבל התראות קופצות בזמן אמת במחשב ובנייד על תורים, לידים ופניות חדשות
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={handleEnableNotifications}
            className="mt-1 h-9 shrink-0 cursor-pointer select-none rounded-xl bg-primary px-4 text-xs font-extrabold text-primary-foreground shadow-2xs transition-all duration-150 ease-native hover:bg-primary/90 active:scale-95 sm:mt-0"
          >
            הפעל התראות
          </button>
        </div>
      )}

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
                      'row-native group relative items-center gap-3',
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

                    {/* Single notification delete button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDeleteNotification(notification.id)
                      }}
                      title="מחק התראה"
                      className="flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-lg text-muted-foreground opacity-70 transition-all hover:bg-destructive/10 hover:text-destructive hover:opacity-100 active:scale-90"
                    >
                      <Trash2 size={15} />
                    </button>
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
