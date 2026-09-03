import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createFakePocketBase } from '@/test-utils/fakePocketBase'
import type { FakePocketBase } from '@/test-utils/fakePocketBase'
import {
  normalizePhoneForWhatsApp,
  formatAppointmentDateTime,
  hasTriggerBeenSent,
  processReminders3Days,
  processReminders1Day,
  processPostSessionAftercare,
  processHealingFollowUp,
  processStalledConversations,
  runLifecycleTick,
} from './lifecycle-service'
import type PocketBase from 'pocketbase'

describe('lifecycle-service', () => {
  let su: FakePocketBase

  beforeEach(() => {
    su = createFakePocketBase()
    // Suppress console info/warn during test runs
    vi.spyOn(console, 'info').mockImplementation(() => {})
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  describe('utility functions', () => {
    it('normalizes local and international phone numbers for WhatsApp', () => {
      expect(normalizePhoneForWhatsApp('052-811-4746')).toBe('972528114746')
      expect(normalizePhoneForWhatsApp('+972528114746')).toBe('972528114746')
      expect(normalizePhoneForWhatsApp('972528114746')).toBe('972528114746')
      expect(normalizePhoneForWhatsApp('0501234567')).toBe('972501234567')
    })

    it('formats appointment ISO date into local Israel time and Hebrew day', () => {
      // 2026-09-06T09:00:00.000Z is 12:00 IDT (Israel Daylight Time, UTC+3) on a Sunday (ראשון)
      const res = formatAppointmentDateTime('2026-09-06T09:00:00.000Z')
      expect(res.timeStr).toBe('12:00')
      expect(res.dateStr).toContain('06')
      expect(res.dayName).toBe('ראשון')
    })

    it('detects previously sent triggers in both string and object shapes', () => {
      const aptWithStrings = { id: 'apt1', lifecycle_sent: ['reminder_3d', 'reminder_1d'] } as any
      expect(hasTriggerBeenSent(aptWithStrings, 'reminder_3d')).toBe(true)
      expect(hasTriggerBeenSent(aptWithStrings, 'aftercare')).toBe(false)

      const aptWithObjects = {
        id: 'apt2',
        lifecycle_sent: [{ trigger: 'aftercare', sent_at: '2026-09-01T10:00:00Z' }],
      } as any
      expect(hasTriggerBeenSent(aptWithObjects, 'aftercare')).toBe(true)
      expect(hasTriggerBeenSent(aptWithObjects, 'reminder_1d')).toBe(false)
    })
  })

  describe('processReminders3Days', () => {
    it('sends 3-day reminder to confirmed appointments ~72h away and marks trigger sent', async () => {
      const now = new Date('2026-09-01T10:00:00.000Z')
      // Appointment in exactly 72 hours (3 days)
      const startTime = new Date('2026-09-04T10:00:00.000Z').toISOString()

      su._seed('customers', [{ id: 'cust1', name: 'רואי', phone: '0528114746' }])
      su._seed('staff', [{ id: 'staff1', name: 'דור' }])
      su._seed('appointments', [
        {
          id: 'apt1',
          customer: 'cust1',
          staff: 'staff1',
          status: 'confirmed',
          type: 'tattoo',
          start_time: startTime,
          lifecycle_sent: [],
        },
      ])

      const count = await processReminders3Days(su as unknown as PocketBase, now)
      expect(count).toBe(1)

      const updatedApt = su._dump('appointments').find((a) => a.id === 'apt1')
      expect(hasTriggerBeenSent(updatedApt as any, 'reminder_3d')).toBe(true)

      const messages = su._dump('messages')
      expect(messages.length).toBe(1)
      expect(messages[0]!.body).toContain('בעוד 3 ימים')
      expect(messages[0]!.body).toContain('דור')
    })

    it('skips appointments if reminder_3d has already been sent', async () => {
      const now = new Date('2026-09-01T10:00:00.000Z')
      const startTime = new Date('2026-09-04T10:00:00.000Z').toISOString()

      su._seed('customers', [{ id: 'cust1', name: 'רואי', phone: '0528114746' }])
      su._seed('staff', [{ id: 'staff1', name: 'דור' }])
      su._seed('appointments', [
        {
          id: 'apt1',
          customer: 'cust1',
          staff: 'staff1',
          status: 'confirmed',
          type: 'tattoo',
          start_time: startTime,
          lifecycle_sent: ['reminder_3d'],
        },
      ])

      const count = await processReminders3Days(su as unknown as PocketBase, now)
      expect(count).toBe(0)
      expect(su._dump('messages').length).toBe(0)
    })
  })

  describe('processReminders1Day (Template E)', async () => {
    it('sends Template E day-before reminder to confirmed appointments ~24h away', async () => {
      const now = new Date('2026-09-01T10:00:00.000Z')
      // Appointment in exactly 24 hours (1 day)
      const startTime = new Date('2026-09-02T10:00:00.000Z').toISOString()

      su._seed('customers', [{ id: 'cust1', name: 'דנה', phone: '0501112233' }])
      su._seed('staff', [{ id: 'staff1', name: 'גאיה' }])
      su._seed('appointments', [
        {
          id: 'apt1',
          customer: 'cust1',
          staff: 'staff1',
          status: 'confirmed',
          type: 'sketch',
          start_time: startTime,
          lifecycle_sent: [],
        },
      ])

      const count = await processReminders1Day(su as unknown as PocketBase, now)
      expect(count).toBe(1)

      const updatedApt = su._dump('appointments').find((a) => a.id === 'apt1')
      expect(hasTriggerBeenSent(updatedApt as any, 'reminder_1d')).toBe(true)

      const messages = su._dump('messages')
      expect(messages.length).toBe(1)
      expect(messages[0]!.body).toContain('תזכורת! יש לך תור לפגישת סקיצה מחר')
      expect(messages[0]!.body).toContain('גאיה')
      expect(messages[0]!.body).toContain('הדקל 30 שוהם')
      expect(messages[0]!.body).toContain('להימנע מצריכת אלכוהול וסמים')
      expect(messages[0]!.body).toContain('יש לאשר שקיבלתם את ההודעה 👍🏽')
    })
  })

  describe('processPostSessionAftercare (Template F)', () => {
    it('sends Template F review request for completed appointments within 48 hours', async () => {
      const now = new Date('2026-09-02T14:00:00.000Z')
      // Appointment ended 4 hours ago
      const startTime = new Date('2026-09-02T08:00:00.000Z').toISOString()

      su._seed('customers', [{ id: 'cust1', name: 'תומר', phone: '0545556677' }])
      su._seed('staff', [{ id: 'staff1', name: 'דור' }])
      su._seed('appointments', [
        {
          id: 'apt1',
          customer: 'cust1',
          staff: 'staff1',
          status: 'completed',
          type: 'tattoo',
          start_time: startTime,
          duration_minutes: 120,
          lifecycle_sent: [],
        },
      ])

      const count = await processPostSessionAftercare(su as unknown as PocketBase, now)
      expect(count).toBe(1)

      const updatedApt = su._dump('appointments').find((a) => a.id === 'apt1')
      expect(hasTriggerBeenSent(updatedApt as any, 'aftercare')).toBe(true)

      const messages = su._dump('messages')
      expect(messages.length).toBe(1)
      expect(messages[0]!.body).toContain('תודה רבה שבחרת בסטודיו שלנו השבוע ! 💫')
      expect(messages[0]!.body).toContain('https://g.co/kgs/HUr9g2G')
      expect(messages[0]!.body).toContain('easy.co.il')
    })
  })

  describe('processHealingFollowUp', () => {
    it('sends healing follow-up 14–21 days post session for tattoo appointments', async () => {
      const now = new Date('2026-09-20T10:00:00.000Z')
      // Appointment was 16 days ago
      const startTime = new Date('2026-09-04T10:00:00.000Z').toISOString()

      su._seed('customers', [{ id: 'cust1', name: 'עומר', phone: '0523334455' }])
      su._seed('staff', [{ id: 'staff1', name: 'דור' }])
      su._seed('appointments', [
        {
          id: 'apt1',
          customer: 'cust1',
          staff: 'staff1',
          status: 'completed',
          type: 'tattoo',
          start_time: startTime,
          lifecycle_sent: [],
        },
      ])

      const count = await processHealingFollowUp(su as unknown as PocketBase, now)
      expect(count).toBe(1)

      const updatedApt = su._dump('appointments').find((a) => a.id === 'apt1')
      expect(hasTriggerBeenSent(updatedApt as any, 'healing_check')).toBe(true)

      const messages = su._dump('messages')
      expect(messages.length).toBe(1)
      expect(messages[0]!.body).toContain('עברו כשבועיים מאז הקעקוע שלך')
      expect(messages[0]!.body).toContain('תמונה של התוצאה המוחלמת')
    })

    it('skips healing follow-up for sketch consults (type: sketch)', async () => {
      const now = new Date('2026-09-20T10:00:00.000Z')
      const startTime = new Date('2026-09-04T10:00:00.000Z').toISOString()

      su._seed('customers', [{ id: 'cust1', name: 'עומר', phone: '0523334455' }])
      su._seed('staff', [{ id: 'staff1', name: 'דור' }])
      su._seed('appointments', [
        {
          id: 'apt1',
          customer: 'cust1',
          staff: 'staff1',
          status: 'completed',
          type: 'sketch',
          start_time: startTime,
          lifecycle_sent: [],
        },
      ])

      const count = await processHealingFollowUp(su as unknown as PocketBase, now)
      expect(count).toBe(0)
    })
  })

  describe('processStalledConversations', () => {
    it('sends gentle nudge to conversations stalled for >24h', async () => {
      const now = new Date('2026-09-02T12:00:00.000Z')
      const lastMessageAt = new Date('2026-09-01T10:00:00.000Z').toISOString() // 26h ago

      su._seed('customers', [{ id: 'cust1', name: 'שירה', phone: '0509998877' }])
      su._seed('conversations', [
        {
          id: 'conv1',
          customer: 'cust1',
          state: 'COLLECTING_INFO',
          last_message_at: lastMessageAt,
          tattoo_info: {},
          is_escalated: false,
        },
      ])

      const count = await processStalledConversations(su as unknown as PocketBase, now)
      expect(count).toBe(1)

      const updatedConv = su._dump('conversations').find((c) => c.id === 'conv1')
      expect((updatedConv?.tattoo_info as any).stalled_nudge_sent).toBe(true)

      const messages = su._dump('messages')
      expect(messages.length).toBe(1)
      expect(messages[0]!.body).toContain('ראינו שעצרנו באמצע התיאום')
    })

    it('does not send duplicate nudge if already flagged', async () => {
      const now = new Date('2026-09-02T12:00:00.000Z')
      const lastMessageAt = new Date('2026-09-01T10:00:00.000Z').toISOString()

      su._seed('customers', [{ id: 'cust1', name: 'שירה', phone: '0509998877' }])
      su._seed('conversations', [
        {
          id: 'conv1',
          customer: 'cust1',
          state: 'COLLECTING_INFO',
          last_message_at: lastMessageAt,
          tattoo_info: { stalled_nudge_sent: true },
          is_escalated: false,
        },
      ])

      const count = await processStalledConversations(su as unknown as PocketBase, now)
      expect(count).toBe(0)
    })
  })

  describe('runLifecycleTick', () => {
    it('executes all lifecycle processors and returns summary of actions taken', async () => {
      const now = new Date('2026-09-01T10:00:00.000Z')
      const result = await runLifecycleTick(su as unknown as PocketBase, now)
      expect(result).toEqual({
        reminders3d: 0,
        reminders1d: 0,
        aftercare: 0,
        healingChecks: 0,
        stalledNudges: 0,
        total: 0,
      })
    })
  })
})

