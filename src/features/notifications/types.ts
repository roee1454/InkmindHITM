import type { PwaNotificationOptions } from './utils/pwa-notifications'

export type NotificationType = 'info' | 'warning' | 'error' | 'success'

export interface ApiNotification {
  id: string
  title: string
  message: string
  type: NotificationType
  read: boolean
  link?: string
  created: string
}

export interface NotificationGroup {
  label: string
  items: ApiNotification[]
}

export type NotificationPermissionState = NotificationPermission | 'unsupported'

export type { PwaNotificationOptions }

