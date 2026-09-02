import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { createFakePocketBase } from '@/test-utils/fakePocketBase'
import type { getSuperuserClient as GetSuperuserClient } from '@/integrations/pocketbase/superuser.server'
import type { getActiveAppointmentForBot as GetActiveAppointmentForBot } from '@/features/calendar/server/bot-appointments'
import type { getWhatsAppSettings as GetWhatsAppSettings } from '@/integrations/whatsapp-cloud-api/settings.server'
import { ERROR_REENGAGEMENT_REQUIRED, WhatsAppApiError } from '@/integrations/whatsapp-cloud-api/client'
import type { commitWaitlistAction as CommitWaitlistAction } from './waitlist.server'

vi.mock('@/integrations/pocketbase/superuser.server', () => ({
  getSuperuserClient: vi.fn(),
}))
vi.mock('@/features/calendar/server/bot-appointments', () => ({
  getActiveAppointmentForBot: vi.fn(),
  checkAvailabilityForBot: vi.fn(),
}))
vi.mock('@/integrations/whatsapp-cloud-api/settings.server', () => ({
  getWhatsAppSettings: vi.fn(),
}))

let getSuperuserClient: typeof GetSuperuserClient
let getActiveAppointmentForBot: typeof GetActiveAppointmentForBot
let getWhatsAppSettings: typeof GetWhatsAppSettings
let commitWaitlistAction: typeof CommitWaitlistAction

beforeAll(async () => {
  ;({ getSuperuserClient } = await import('@/integrations/pocketbase/superuser.server'))
  ;({ getActiveAppointmentForBot } = await import('@/features/calendar/server/bot-appointments'))
  ;({ getWhatsAppSettings } = await import('@/integrations/whatsapp-cloud-api/settings.server'))
  ;({ commitWaitlistAction } = await import('./waitlist.server'))
})

describe('commitWaitlistAction', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('add_to_waitlist requires an active appointment', async () => {
    const su = createFakePocketBase()
    vi.mocked(getSuperuserClient).mockResolvedValue(su as never)
    vi.mocked(getActiveAppointmentForBot).mockResolvedValue(null)
    await expect(commitWaitlistAction('add_to_waitlist', { customerId: 'cust1' })).rejects.toThrow(
      'אין תור פעיל',
    )
  })

  it('add_to_waitlist creates a watching entry when the customer has an active appointment', async () => {
    const su = createFakePocketBase()
    vi.mocked(getSuperuserClient).mockResolvedValue(su as never)
    vi.mocked(getActiveAppointmentForBot).mockResolvedValue({ id: 'appt1' } as never)
    await commitWaitlistAction('add_to_waitlist', { customerId: 'cust1' })
    expect(su._dump('waitlist_entries')).toMatchObject([
      { customer: 'cust1', current_appointment: 'appt1', status: 'watching', source: 'staff_manual' },
    ])
  })

  it('remove_from_waitlist cancels the entry and clears any in-flight offer', async () => {
    const su = createFakePocketBase()
    su._seed('waitlist_entries', [{ id: 'entry1', status: 'offered', offered_appointment: 'appt_freed' }])
    vi.mocked(getSuperuserClient).mockResolvedValue(su as never)
    await commitWaitlistAction('remove_from_waitlist', { waitlistEntryId: 'entry1' })
    expect(su._dump('waitlist_entries')[0]).toMatchObject({ status: 'cancelled', offered_appointment: null })
  })

  describe('offer_waitlist_slot', () => {
    beforeEach(() => {
      vi.mocked(getWhatsAppSettings).mockResolvedValue({ phoneNumberId: 'PNID', accessToken: 'T' } as never)
    })

    function seed() {
      const su = createFakePocketBase()
      su._seed('customers', [{ id: 'cust1', name: 'Dana', phone: '+972500000000' }])
      su._seed('appointments', [{ id: 'appt_freed', start_time: '2026-03-10T10:00:00.000Z', duration_minutes: 120 }])
      su._seed('waitlist_entries', [
        { id: 'entry1', customer: 'cust1', offered_appointment: 'appt_freed', status: 'watching' },
      ])
      vi.mocked(getSuperuserClient).mockResolvedValue(su as never)
      return su
    }

    it('sends the WhatsApp question and marks the entry offered', async () => {
      const su = seed()
      vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ messages: [{ id: 'wamid.1' }] }), { status: 200 })))
      await commitWaitlistAction('offer_waitlist_slot', { waitlistEntryId: 'entry1', freedAppointmentId: 'appt_freed' })
      expect(su._dump('waitlist_entries')[0]).toMatchObject({ status: 'offered' })
    })

    it('surfaces a friendly Hebrew message when the customer is outside the 24h WhatsApp window', async () => {
      seed()
      vi.stubGlobal(
        'fetch',
        vi.fn(async () =>
          new Response(
            JSON.stringify({ error: { message: 'Re-engagement', code: ERROR_REENGAGEMENT_REQUIRED, type: 'OAuthException' } }),
            { status: 400 },
          ),
        ),
      )
      await expect(
        commitWaitlistAction('offer_waitlist_slot', { waitlistEntryId: 'entry1', freedAppointmentId: 'appt_freed' }),
      ).rejects.toThrow('חלון 24 השעות')
    })

    it('re-throws non-24h-window WhatsApp errors as-is', async () => {
      seed()
      vi.stubGlobal('fetch', vi.fn(async () => new Response('nope', { status: 500 })))
      await expect(
        commitWaitlistAction('offer_waitlist_slot', { waitlistEntryId: 'entry1', freedAppointmentId: 'appt_freed' }),
      ).rejects.toBeInstanceOf(WhatsAppApiError)
    })
  })

  it('throws for an unknown tool name', async () => {
    const su = createFakePocketBase()
    vi.mocked(getSuperuserClient).mockResolvedValue(su as never)
    await expect(commitWaitlistAction('not_a_real_tool', {})).rejects.toThrow('Unknown waitlist action')
  })
})
