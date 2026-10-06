import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getNotifications,
  markNotificationAsRead,
  markNotificationsAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  deleteNotifications,
  clearAllNotifications,
} from '../server/notifications'
import type { ApiNotification, NotificationKind } from '../types'
import { groupNotificationsByDate, groupWhatsAppNotifications } from '../utils/notification-helpers'
import { useConfirm } from '#/hooks/useConfirm'

const LIST_KEY = ['notifications']
const COUNT_KEY = ['unread-notifications-count']

/** The notifications screen's data, split by kind, and every change it makes — optimistic where it removes. */
export function useNotifications() {
  const queryClient = useQueryClient()
  const confirm = useConfirm()

  const { data: notifications = [], isLoading } = useQuery<ApiNotification[]>({
    queryKey: LIST_KEY,
    queryFn: () => getNotifications(),
    refetchInterval: 60000,
  })

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: LIST_KEY })
    queryClient.invalidateQueries({ queryKey: COUNT_KEY })
  }

  /** Drops rows from the cache at once and puts them back if the server refuses. */
  const optimisticRemove = (keep: (n: ApiNotification) => boolean) => async () => {
    await queryClient.cancelQueries({ queryKey: LIST_KEY })
    const previous = queryClient.getQueryData<ApiNotification[]>(LIST_KEY)
    queryClient.setQueryData<ApiNotification[]>(LIST_KEY, (old) => (old ?? []).filter(keep))
    return { previous }
  }
  const rollback = (_err: unknown, _vars: unknown, context: { previous?: ApiNotification[] } | undefined) => {
    if (context?.previous) queryClient.setQueryData(LIST_KEY, context.previous)
  }

  const markRead = useMutation({
    mutationFn: (ids: string[]) => (ids.length === 1 ? markNotificationAsRead({ data: { id: ids[0]! } }) : markNotificationsAsRead({ data: { ids } })),
    onMutate: (ids) => {
      queryClient.setQueryData<ApiNotification[]>(LIST_KEY, (old) => (old ?? []).map((n) => (ids.includes(n.id) ? { ...n, read: true } : n)))
    },
    onSettled: refresh,
  })

  const remove = useMutation({
    mutationFn: (ids: string[]) => (ids.length === 1 ? deleteNotification({ data: { id: ids[0]! } }) : deleteNotifications({ data: { ids } })),
    onMutate: (ids) => optimisticRemove((n) => !ids.includes(n.id))(),
    onError: rollback,
    onSettled: refresh,
  })

  const markAllRead = useMutation({
    mutationFn: (kind: NotificationKind) => markAllNotificationsAsRead({ data: { kind } }),
    onSettled: refresh,
  })

  const clearAll = useMutation({
    mutationFn: (kind: NotificationKind) => clearAllNotifications({ data: { kind } }),
    onMutate: (kind) => optimisticRemove((n) => n.kind !== kind)(),
    onError: rollback,
    onSettled: refresh,
  })

  const system = notifications.filter((n) => n.kind === 'system')
  const whatsapp = notifications.filter((n) => n.kind === 'whatsapp_message')

  const confirmClear = async (kind: NotificationKind) => {
    const ok = await confirm({
      title: kind === 'system' ? 'ניקוי התראות המערכת' : 'ניקוי הודעות הוואטסאפ',
      description: kind === 'system' ? 'כל התראות המערכת יימחקו מהרשימה.' : 'ההתראות יימחקו מהרשימה. השיחות וההודעות עצמן נשארות.',
      confirmLabel: 'ניקוי',
      variant: 'destructive',
    })
    if (ok) clearAll.mutate(kind)
  }

  return {
    notifications,
    isLoading,
    system: { groups: groupNotificationsByDate(system), total: system.length, unread: system.filter((n) => !n.read).length },
    whatsapp: { threads: groupWhatsAppNotifications(whatsapp), total: whatsapp.length, unread: whatsapp.filter((n) => !n.read).length },
    markRead: (ids: string[]) => ids.length > 0 && markRead.mutate(ids),
    remove: (ids: string[]) => remove.mutate(ids),
    markAllRead: (kind: NotificationKind) => markAllRead.mutate(kind),
    clearAll: confirmClear,
    isMarkingAllRead: markAllRead.isPending,
    isClearingAll: clearAll.isPending,
  }
}
