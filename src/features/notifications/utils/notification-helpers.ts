import { HEBREW_DAYS_SHORT } from '@/lib/date-utils'
import type { ApiNotification, NotificationGroup, NotificationKind, NotificationType } from '../types'

/** Rows from before `kind` existed are system notifications (the migration backfills them too). */
export function toNotificationKind(value: unknown): NotificationKind {
  return value === 'whatsapp_message' ? 'whatsapp_message' : 'system'
}

/**
 * When a notification arrived, as short as it can be and still be unambiguous: the time today,
 * the weekday and time this week, the date before that.
 */
export function formatNotificationTime(isoString: string, now: Date = new Date()): string {
  const d = new Date(isoString)
  if (Number.isNaN(d.getTime())) return ''
  const time = d.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit', hour12: false })
  const startOfDay = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime()
  const days = Math.round((startOfDay(now) - startOfDay(d)) / 86_400_000)
  if (days <= 0) return time
  if (days < 7) return `${HEBREW_DAYS_SHORT[d.getDay()]} ${time}`
  return d.getFullYear() === now.getFullYear() ? `${d.getDate()}.${d.getMonth() + 1}` : `${d.getDate()}.${d.getMonth() + 1}.${String(d.getFullYear()).slice(2)}`
}

/** The icon's colour for a notification type — a status role, never a tinted chip behind it. */
export function getNotificationToneClass(type: NotificationType): string {
  switch (type) {
    case 'success':
      return 'text-status-done'
    case 'error':
      return 'text-destructive'
    case 'warning':
      return 'text-warning'
    case 'info':
    default:
      return 'text-muted-foreground'
  }
}

/**
 * Pure helper to bucket notifications by date (היום, אתמול, השבוע, קודם לכן).
 * Accepts an optional reference `now` date for deterministic unit testing.
 */
export function groupNotificationsByDate(
  notifications: ApiNotification[],
  now: Date = new Date(),
): NotificationGroup[] {
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
  const today = startOfDay(now)
  const yesterday = today - 86400000
  const weekAgo = today - 7 * 86400000

  const groups: NotificationGroup[] = [
    { label: 'היום', items: [] },
    { label: 'אתמול', items: [] },
    { label: 'השבוע', items: [] },
    { label: 'קודם לכן', items: [] },
  ]

  for (const n of notifications) {
    const day = startOfDay(new Date(n.created))
    if (day === today) {
      groups[0]!.items.push(n)
    } else if (day === yesterday) {
      groups[1]!.items.push(n)
    } else if (day > weekAgo) {
      groups[2]!.items.push(n)
    } else {
      groups[3]!.items.push(n)
    }
  }

  return groups.filter((g) => g.items.length > 0)
}


/** One conversation in the WhatsApp tab: who wrote, their latest message, how many are unread. */
export interface WhatsAppThread {
  /** The conversation link; a message notification without one stands alone under its own id. */
  key: string
  link: string | undefined
  sender: string
  preview: string
  latestAt: string
  count: number
  unreadIds: string[]
  ids: string[]
}

/**
 * Folds message notifications into one row per conversation, newest conversation first, so ten
 * messages from one customer read as one line with "10" rather than ten lines.
 */
export function groupWhatsAppNotifications(notifications: ApiNotification[]): WhatsAppThread[] {
  const threads = new Map<string, WhatsAppThread>()
  const newestFirst = [...notifications].sort((a, b) => b.created.localeCompare(a.created))
  for (const n of newestFirst) {
    const key = n.link ?? n.id
    const thread = threads.get(key)
    if (thread) {
      thread.count += 1
      thread.ids.push(n.id)
      if (!n.read) thread.unreadIds.push(n.id)
    } else {
      threads.set(key, {
        key,
        link: n.link,
        sender: n.title,
        preview: n.message,
        latestAt: n.created,
        count: 1,
        ids: [n.id],
        unreadIds: n.read ? [] : [n.id],
      })
    }
  }
  return [...threads.values()]
}
