import { describe, expect, it, vi } from 'vitest'
import { isHealthDeclarationValid, HEALTH_DECLARATION_VALIDITY_DAYS } from '@/features/health-declaration/server/health-service'
import { buildDynamicSystemPrompt } from '@/integrations/ai/prompts'
import { processPastConfirmedAppointments } from '@/features/lifecycle/server/lifecycle-service'
import type PocketBase from 'pocketbase'
import { addSystemNotification } from '@/features/notifications/server/notifications'

vi.mock('@/features/notifications/server/notifications', () => ({
  addSystemNotification: vi.fn().mockResolvedValue(undefined),
}))

describe('Returning Customer Architecture & Health Validity', () => {
  describe('isHealthDeclarationValid (Dynamic Expiry)', () => {
    it('HEALTH_DECLARATION_VALIDITY_DAYS is strictly 180 days', () => {
      expect(HEALTH_DECLARATION_VALIDITY_DAYS).toBe(180)
    })

    it('returns true when signed 30 days ago with default 6-month validity', () => {
      const now = new Date('2026-09-18T12:00:00.000Z')
      const signedDate = new Date('2026-08-18T12:00:00.000Z').toISOString()
      expect(isHealthDeclarationValid(signedDate, now)).toBe(true)
    })

    it('returns true when signed exactly 180 days ago with 6-month validity', () => {
      const now = new Date('2026-09-18T12:00:00.000Z')
      const signedDate = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000).toISOString()
      expect(isHealthDeclarationValid(signedDate, now)).toBe(true)
      expect(isHealthDeclarationValid(signedDate, 6, now)).toBe(true)
    })

    it('returns false when signed 181 days ago with 6-month validity', () => {
      const now = new Date('2026-09-18T12:00:00.000Z')
      const signedDate = new Date(now.getTime() - 181 * 24 * 60 * 60 * 1000).toISOString()
      expect(isHealthDeclarationValid(signedDate, now)).toBe(false)
      expect(isHealthDeclarationValid(signedDate, 6, now)).toBe(false)
    })

    it('supports 3-month validity', () => {
      const now = new Date('2026-09-18T12:00:00.000Z')
      const signed80DaysAgo = new Date(now.getTime() - 80 * 24 * 60 * 60 * 1000).toISOString()
      const signed100DaysAgo = new Date(now.getTime() - 100 * 24 * 60 * 60 * 1000).toISOString()
      expect(isHealthDeclarationValid(signed80DaysAgo, 3, now)).toBe(true)
      expect(isHealthDeclarationValid(signed100DaysAgo, 3, now)).toBe(false)
    })

    it('supports 12-month validity (1 year)', () => {
      const now = new Date('2026-09-18T12:00:00.000Z')
      const signed300DaysAgo = new Date(now.getTime() - 300 * 24 * 60 * 60 * 1000).toISOString()
      const signed370DaysAgo = new Date(now.getTime() - 370 * 24 * 60 * 60 * 1000).toISOString()
      expect(isHealthDeclarationValid(signed300DaysAgo, 12, now)).toBe(true)
      expect(isHealthDeclarationValid(signed370DaysAgo, 12, now)).toBe(false)
    })

    it('supports per-appointment validity (0 = always requires renewal for new appointment)', () => {
      const now = new Date('2026-09-18T12:00:00.000Z')
      const signed1DayAgo = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString()
      expect(isHealthDeclarationValid(signed1DayAgo, 0, now)).toBe(false)
    })

    it('supports never-expires validity (-1 = always valid if signed)', () => {
      const now = new Date('2026-09-18T12:00:00.000Z')
      const signed1000DaysAgo = new Date(now.getTime() - 1000 * 24 * 60 * 60 * 1000).toISOString()
      expect(isHealthDeclarationValid(signed1000DaysAgo, -1, now)).toBe(true)
    })

    it('returns false when date is null, undefined, or invalid', () => {
      expect(isHealthDeclarationValid(null)).toBe(false)
      expect(isHealthDeclarationValid(undefined)).toBe(false)
      expect(isHealthDeclarationValid('invalid-date')).toBe(false)
    })
  })

  describe('buildDynamicSystemPrompt for Returning Customers', () => {
    it('injects returning customer profile with professional persona and past artist/tattoo info', () => {
      const prompt = buildDynamicSystemPrompt({
        customerName: 'רועי',
        returningCustomerInfo: {
          pastAppointmentsCount: 3,
          lastArtistName: 'איתי',
          lastTattooDescription: 'דרקון יפני',
        },
        healthDeclarationSigned: true,
        healthDeclarationDate: '2026-08-01',
      })

      expect(prompt).toContain('[כרטיס לקוח]')
      expect(prompt).toContain('שם הלקוח: רועי')
      expect(prompt).toContain('לקוח חוזר: ביצע בעבר 3 תורים בסטודיו אצל איתי ("דרקון יפני")')
      expect(prompt).toContain('אל תשאל מה שמו')
      expect(prompt).toContain('ללא סימני קריאה וללא אימוגים')
      expect(prompt).toContain('הצהרת בריאות: חתומה ומאושרת במערכת (נחתמה בתאריך 2026-08-01) ובתוקף')
      expect(prompt).toContain('אין צורך לבקש ממנו למלא את הטופס שוב')
    })

    it('instructs renewal with customized expiration text when health declaration is expired', () => {
      const promptDefault = buildDynamicSystemPrompt({
        customerName: 'רועי',
        returningCustomerInfo: {
          pastAppointmentsCount: 1,
          lastArtistName: 'דור',
          lastTattooDescription: 'פרפר מינימליסטי',
        },
        healthDeclarationSigned: false,
        healthDeclarationDate: '2025-10-01',
        healthDeclarationValidityMonths: 6,
      })

      expect(promptDefault).toContain('הצהרת בריאות: נחתמה בעבר בתאריך 2025-10-01, אך תוקפה פג (מדיניות הסטודיו דורשת חידוש — תקפה לחצי שנה)')
      expect(promptDefault).toContain('יש לציין בקצרה שההצהרה צריכה חידוש בקישור שיישלח')

      const promptPerAppointment = buildDynamicSystemPrompt({
        customerName: 'רועי',
        healthDeclarationSigned: false,
        healthDeclarationDate: '2026-09-01',
        healthDeclarationValidityMonths: 0,
      })
      expect(promptPerAppointment).toContain('תקפה לתור אחד בלבד')

      const promptQuarter = buildDynamicSystemPrompt({
        customerName: 'רועי',
        healthDeclarationSigned: false,
        healthDeclarationDate: '2026-01-01',
        healthDeclarationValidityMonths: 3,
      })
      expect(promptQuarter).toContain('תקפה ל-3 חודשים')
    })
  })

  describe('processPastConfirmedAppointments in Lifecycle Service', () => {
    const now = new Date('2026-09-18T12:00:00.000Z')
    const pastStartTime = new Date('2026-09-15T10:00:00.000Z').toISOString() // 3 days ago

    function mockStudio(appointment: Record<string, unknown>) {
      const appointmentUpdates: Record<string, unknown>[] = []
      const conversationUpdates: Record<string, unknown>[] = []
      const conversation = { id: 'conv_1', customer: 'cust_1', state: 'AWAITING_APPOINTMENT' }
      const su = {
        filter: (template: string) => template,
        collection: (name: string) => {
          if (name === 'appointments') {
            return {
              getFullList: vi.fn().mockResolvedValue([appointment]),
              getList: vi.fn().mockResolvedValue({ totalItems: 0, items: [] }),
              update: vi.fn().mockImplementation((id: string, data: Record<string, unknown>) => {
                appointmentUpdates.push(data)
                return Promise.resolve({ id, ...data })
              }),
            }
          }
          if (name === 'conversations') {
            return {
              getList: vi.fn().mockResolvedValue({ totalItems: 1, items: [conversation] }),
              getOne: vi.fn().mockResolvedValue(conversation),
              update: vi.fn().mockImplementation((id: string, data: Record<string, unknown>) => {
                conversationUpdates.push(data)
                return Promise.resolve({ id, ...data })
              }),
            }
          }
          return {
            getFullList: vi.fn().mockResolvedValue([]),
            getList: vi.fn().mockResolvedValue({ totalItems: 0, items: [] }),
            getOne: vi.fn().mockResolvedValue({}),
            update: vi.fn().mockResolvedValue({}),
            create: vi.fn().mockResolvedValue({}),
          }
        },
      }
      return { su: su as unknown as PocketBase, appointmentUpdates, conversationUpdates }
    }

    it('auto-completes a past consultation and hands the conversation back to booking', async () => {
      const { su, appointmentUpdates, conversationUpdates } = mockStudio({
        id: 'apt_consult',
        customer: 'cust_1',
        status: 'confirmed',
        kind: 'consultation',
        type: 'sketch',
        start_time: pastStartTime,
      })

      const count = await processPastConfirmedAppointments(su, now)

      expect(count).toBe(1)
      expect(appointmentUpdates).toEqual([{ status: 'completed', status_actor: 'system', status_reason: 'auto_complete_24h' }])
      expect(conversationUpdates[0]).toMatchObject({ state: 'WANTS_TO_BOOK', status: 'bot_active' })
    })

    it('leaves a past tattoo session open for staff to close (the daily digest lists it) and still moves the conversation on', async () => {
      const { su, appointmentUpdates, conversationUpdates } = mockStudio({
        id: 'apt_session',
        customer: 'cust_1',
        status: 'confirmed',
        kind: 'session',
        type: 'tattoo',
        start_time: pastStartTime,
        expand: { customer: { name: 'דנה' } },
      })

      const count = await processPastConfirmedAppointments(su, now)

      expect(count).toBe(1)
      // No per-session reminder any more: processStaffDigest lists every unclosed session once a day.
      expect(addSystemNotification).not.toHaveBeenCalled()
      expect(appointmentUpdates).toEqual([])
      // The bot must stop treating the session as upcoming even before staff close it.
      expect(conversationUpdates[0]).toMatchObject({ state: 'COMPLETED', active_project: '' })
    })
  })
})

