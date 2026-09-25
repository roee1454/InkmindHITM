import { describe, expect, it } from 'vitest'
import type { ApiNotification } from '@/features/notifications/types'
import {
  formatNotificationTime,
  getNotificationIconChipClass,
  groupNotificationsByDate,
} from '@/features/notifications/utils/notification-helpers'

describe('notification-helpers', () => {
  describe('formatNotificationTime', () => {
    it('formats valid ISO string to 2-digit hour:minute', () => {
      const formatted = formatNotificationTime('2026-09-21T10:30:00Z')
      expect(formatted).toMatch(/^\d{2}:\d{2}$/)
    })

    it('returns empty string for invalid date string', () => {
      expect(formatNotificationTime('invalid-date')).toBe('')
    })
  })

  describe('getNotificationIconChipClass', () => {
    it('returns correct CSS classes for each notification type', () => {
      expect(getNotificationIconChipClass('success')).toBe('bg-success/12 text-success')
      expect(getNotificationIconChipClass('error')).toBe('bg-destructive/10 text-destructive')
      expect(getNotificationIconChipClass('warning')).toBe('bg-warning/12 text-warning')
      expect(getNotificationIconChipClass('info')).toBe('bg-primary/10 text-primary')
    })
  })

  describe('groupNotificationsByDate', () => {
    const fixedNow = new Date('2026-09-21T12:00:00')

    const createNotification = (id: string, created: string): ApiNotification => ({
      id,
      title: `Notification ${id}`,
      message: 'Test message',
      type: 'info',
      read: false,
      created,
    })

    it('returns empty array when there are no notifications', () => {
      expect(groupNotificationsByDate([], fixedNow)).toEqual([])
    })

    it('groups notifications into today, yesterday, this week, and earlier', () => {
      const notifications: ApiNotification[] = [
        createNotification('1', '2026-09-21T09:00:00'), // Today
        createNotification('2', '2026-09-21T11:30:00'), // Today
        createNotification('3', '2026-09-20T15:00:00'), // Yesterday
        createNotification('4', '2026-09-18T10:00:00'), // This week (3 days ago)
        createNotification('5', '2026-09-10T08:00:00'), // Earlier (> 7 days ago)
      ]

      const groups = groupNotificationsByDate(notifications, fixedNow)

      expect(groups).toHaveLength(4)
      expect(groups[0]?.label).toBe('היום')
      expect(groups[0]?.items.map((i) => i.id)).toEqual(['1', '2'])

      expect(groups[1]?.label).toBe('אתמול')
      expect(groups[1]?.items.map((i) => i.id)).toEqual(['3'])

      expect(groups[2]?.label).toBe('השבוע')
      expect(groups[2]?.items.map((i) => i.id)).toEqual(['4'])

      expect(groups[3]?.label).toBe('קודם לכן')
      expect(groups[3]?.items.map((i) => i.id)).toEqual(['5'])
    })

    it('filters out empty groups if notifications belong to only some buckets', () => {
      const notifications: ApiNotification[] = [
        createNotification('1', '2026-09-21T09:00:00'), // Today
        createNotification('2', '2026-09-10T08:00:00'), // Earlier
      ]

      const groups = groupNotificationsByDate(notifications, fixedNow)

      expect(groups).toHaveLength(2)
      expect(groups.map((g) => g.label)).toEqual(['היום', 'קודם לכן'])
    })
  })
})

