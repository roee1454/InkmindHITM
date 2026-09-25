import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  clearAllNotifications,
} from '../server/notifications'
import type { ApiNotification } from '../types'
import { groupNotificationsByDate } from '../utils/notification-helpers'
import { useConfirm } from '#/hooks/useConfirm'

export function useNotifications() {
  const queryClient = useQueryClient()
  const confirm = useConfirm()

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

  const unreadCount = notifications.filter((n) => !n.read).length
  const groups = groupNotificationsByDate(notifications)

  return {
    notifications,
    unreadCount,
    groups,
    isLoading,
    markAsRead: handleMarkAsRead,
    markAllAsRead: handleMarkAllRead,
    deleteNotification: handleDeleteNotification,
    clearAll: handleClearAll,
    isMarkingAllRead: markAllReadMutation.isPending,
    isClearingAll: clearAllMutation.isPending,
  }
}

