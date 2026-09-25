import { useEffect, useState } from 'react'
import {
  getNotificationPermission,
  requestNotificationPermission,
  sendPwaNotification,
} from '../utils/pwa-notifications'
import type { NotificationPermissionState } from '../types'

export function usePwaNotifications() {
  const [permission, setPermission] = useState<NotificationPermissionState>('unsupported')

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

  return {
    permission,
    enableNotifications: handleEnableNotifications,
  }
}

