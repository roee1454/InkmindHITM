import { describe, expect, it } from 'vitest'
import type { ApiNotification } from '@/features/notifications/types'
import {
  formatNotificationTime,
  getNotificationToneClass,
  groupNotificationsByDate,
} from '@/features/notifications/utils/notification-helpers'

describe('notification-helpers', () => {
  describe('formatNotificationTime', () => {
    const now = new Date('2026-09-28T18:00:00')

    it('shows only the time for today', () => {
      expect(formatNotificationTime('2026-09-28T09:05:00', now)).toMatch(/^09:05$/)
    })

    it('adds the weekday within the week, and the date before that', () => {
      expect(formatNotificationTime('2026-09-25T09:05:00', now)).toBe('ו׳ 09:05')
      expect(formatNotificationTime('2026-09-10T09:05:00', now)).toBe('10.9')
      expect(formatNotificationTime('2025-12-31T09:05:00', now)).toBe('31.12.25')
    })

    it('returns empty string for invalid date string', () => {
      expect(formatNotificationTime('invalid-date')).toBe('')
    })
  })

  describe('getNotificationToneClass', () => {
    it('colours the icon by status role', () => {
      expect(getNotificationToneClass('success')).toBe('text-status-done')
      expect(getNotificationToneClass('error')).toBe('text-destructive')
      expect(getNotificationToneClass('warning')).toBe('text-warning')
      expect(getNotificationToneClass('info')).toBe('text-muted-foreground')
    })
  })

  describe('groupNotificationsByDate', () => {
    const fixedNow = new Date('2026-09-21T12:00:00')

    const createNotification = (id: string, created: string): ApiNotification => ({
      id,
      title: `Notification ${id}`,
      message: 'Test message',
      type: 'info',
      kind: 'system',
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


describe('groupWhatsAppNotifications', async () => {
  const { groupWhatsAppNotifications, toNotificationKind } = await import('@/features/notifications/utils/notification-helpers')
  const message = (id: string, chat: string, created: string, read = false): ApiNotification => ({
    id, title: `לקוח ${chat}`, message: `הודעה ${id}`, type: 'info', kind: 'whatsapp_message', read, link: `/dashboard/conversations?chatId=${chat}`, created,
  })

  it('folds a conversation into one row with its latest message and unread count', () => {
    const threads = groupWhatsAppNotifications([
      message('1', 'a', '2026-09-28T10:00:00Z', true),
      message('2', 'b', '2026-09-28T11:00:00Z'),
      message('3', 'a', '2026-09-28T12:00:00Z'),
      message('4', 'a', '2026-09-28T12:30:00Z'),
    ])
    expect(threads.map((t) => [t.sender, t.preview, t.count, t.unreadIds.length])).toEqual([
      ['לקוח a', 'הודעה 4', 3, 2],
      ['לקוח b', 'הודעה 2', 1, 1],
    ])
    expect(threads[0]?.ids.sort()).toEqual(['1', '3', '4'])
  })

  it('treats rows from before the kind field as system notifications', () => {
    expect(toNotificationKind(undefined)).toBe('system')
    expect(toNotificationKind('')).toBe('system')
    expect(toNotificationKind('whatsapp_message')).toBe('whatsapp_message')
  })
})
