import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createFakePocketBase } from '@/test-utils/fakePocketBase'
import type { FakePocketBase } from '@/test-utils/fakePocketBase'
import {
  normalizePhoneForWhatsApp,
  formatAppointmentDateTime,
  processReminders3Days,
  processReminders1Day,
  processStalledConversations,
  runLifecycleTick,
} from '@/features/lifecycle/server/lifecycle-service'
import type PocketBase from 'pocketbase'

vi.mock('@/integrations/whatsapp-cloud-api/settings.server', () => ({
  getWhatsAppSettings: vi.fn().mockResolvedValue(null),
}))

// The actual WhatsApp send + "mark trigger sent" bookkeeping now happens inside the BullMQ
// conversation-turn worker (src/lib/queue/conversation-turn-worker.ts), not synchronously in
// these process* functions — they only enqueue. Mocking this avoids a real Redis connection
// during unit tests and lets these tests assert what actually happens here: the right job gets
// enqueued with the right onSuccess bookkeeping descriptor.
const enqueueLifecycleMessage = vi.fn().mockResolvedValue(undefined)
vi.mock('@/lib/queue/conversation-turn-queue', () => ({
  enqueueLifecycleMessage: (...args: unknown[]) => enqueueLifecycleMessage(...args),
}))

describe('lifecycle-service', () => {
  let su: FakePocketBase

  beforeEach(() => {
    su = createFakePocketBase()
    enqueueLifecycleMessage.mockClear()
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

      // Sending + marking the trigger sent now happens in the queue worker, not here —
      // this only verifies the tick correctly identified the appointment and enqueued it.
      expect(enqueueLifecycleMessage).toHaveBeenCalledTimes(1)
      const job = enqueueLifecycleMessage.mock.calls[0]![0]
      expect(job.triggerName).toBe('reminder_3d')
      expect(job.messageBody).toContain('בעוד 3 ימים')
      expect(job.messageBody).toContain('דור')
      expect(job.onSuccess).toEqual({ kind: 'appointment_trigger', appointmentId: 'apt1', trigger: 'reminder_3d' })
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

      expect(enqueueLifecycleMessage).toHaveBeenCalledTimes(1)
      const job = enqueueLifecycleMessage.mock.calls[0]![0]
      expect(job.triggerName).toBe('reminder_1d')
      expect(job.messageBody).toContain('תזכורת! יש לך תור לפגישת סקיצה מחר')
      expect(job.messageBody).toContain('גאיה')
      expect(job.messageBody).toContain('שוהם מרקט קומה מינוס אחת')
      expect(job.messageBody).toContain('להימנע מצריכת אלכוהול וסמים')
      expect(job.messageBody).toContain('יש לאשר שקיבלתם את ההודעה 👍🏽')
      expect(job.onSuccess).toEqual({ kind: 'appointment_trigger', appointmentId: 'apt1', trigger: 'reminder_1d' })
    })
  })

  describe('processStalledConversations', () => {
    it('sends gentle nudge to conversations stalled for >20h (within 24h Meta window)', async () => {
      const now = new Date('2026-09-02T12:00:00.000Z')
      const lastMessageAt = new Date('2026-09-01T15:00:00.000Z').toISOString() // 21h ago

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

      expect(enqueueLifecycleMessage).toHaveBeenCalledTimes(1)
      const job = enqueueLifecycleMessage.mock.calls[0]![0]
      expect(job.triggerName).toBe('stalled_nudge')
      expect(job.messageBody).toContain('ראינו שעצרנו באמצע התיאום')
      expect(job.onSuccess).toEqual({ kind: 'stalled_nudge', conversationId: 'conv1' })
    })

    it('does not send duplicate nudge if already flagged', async () => {
      const now = new Date('2026-09-02T12:00:00.000Z')
      const lastMessageAt = new Date('2026-09-01T15:00:00.000Z').toISOString() // 21h ago

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
        healingChecks: 0,
        stalledNudges: 0,
        projectFeedback: 0,
        consultationFollowups: 0,
        projectsLost: 0,
        pastCompleted: 0,
        stalePendingCancelled: 0,
        staffDigest: 0,
        reconciled: 0,
        total: 0,
      })
    })
  })
})

