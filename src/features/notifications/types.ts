import type { PwaNotificationOptions } from './utils/pwa-notifications'

export type NotificationType = 'info' | 'warning' | 'error' | 'success'

/** `whatsapp_message`: a customer wrote in (title = the sender). `system`: everything the CRM tells staff. */
export type NotificationKind = 'system' | 'whatsapp_message'

export interface ApiNotification {
  id: string
  title: string
  message: string
  type: NotificationType
  kind: NotificationKind
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

