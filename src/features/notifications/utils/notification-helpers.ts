import type { ApiNotification, NotificationGroup, NotificationType } from '../types'

/**
 * Pure helper to format an ISO date string into 24h Hebrew time (HH:MM).
 */
export function formatNotificationTime(isoString: string): string {
  const d = new Date(isoString)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })
}

/**
 * Pure helper returning CSS classes for notification category icon chip.
 */
export function getNotificationIconChipClass(type: NotificationType): string {
  switch (type) {
    case 'success':
      return 'bg-success/12 text-success'
    case 'error':
      return 'bg-destructive/10 text-destructive'
    case 'warning':
      return 'bg-warning/12 text-warning'
    case 'info':
    default:
      return 'bg-primary/10 text-primary'
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

