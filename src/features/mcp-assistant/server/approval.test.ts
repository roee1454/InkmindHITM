import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { createFakePocketBase } from '@/test-utils/fakePocketBase'
import type { getSuperuserClient as GetSuperuserClient } from '@/integrations/pocketbase/superuser.server'
import type { dispatchCommit as DispatchCommit } from './approval'

vi.mock('@/integrations/pocketbase/superuser.server', () => ({
  getSuperuserClient: vi.fn(),
}))
vi.mock('@/features/calendar/server/bot-appointments', () => ({
  checkAvailabilityForBot: vi.fn().mockResolvedValue({ available: true, reason: 'available' }),
  getArtistScheduleForBot: vi.fn(),
  getActiveAppointmentForBot: vi.fn(),
}))
vi.mock('@/integrations/whatsapp-cloud-api/settings.server', () => ({
  getWhatsAppSettings: vi.fn().mockResolvedValue({ phoneNumberId: 'PNID', accessToken: 'T' }),
}))
vi.mock('@/features/leads/server/leads', () => ({
  listLeads: vi.fn(),
  moveLead: vi.fn(),
}))
vi.mock('@/features/leads/lib/permissions', () => ({
  canEditLead: vi.fn().mockReturnValue(true),
}))

let getSuperuserClient: typeof GetSuperuserClient
let dispatchCommit: typeof DispatchCommit
let WRITE_TOOL_NAMES: Set<string>

beforeAll(async () => {
  ;({ getSuperuserClient } = await import('@/integrations/pocketbase/superuser.server'))
  ;({ dispatchCommit, WRITE_TOOL_NAMES } = await import('./approval'))
})

// One merged args object covering every field any commit function destructures — extra keys are
// harmless since each function only reads what it needs. This test only checks *routing*
// (does every registered tool reach a real handler, never the "no handler" fallthrough); each
// tool's actual mutation correctness has its own dedicated test file (calendar/customers/
// waitlist/analytics `*.server.test.ts`).
const ARGS = {
  appointmentId: 'appt1',
  newDate: '2026-03-15',
  newTimeSlot: '11:00',
  customerId: 'cust1',
  staffId: 'staff1',
  date: '2026-03-15',
  timeSlot: '11:00',
  durationMinutes: 120,
  status: 'pending',
  stage: 'intake',
  text: 'שלום',
  note: 'הערה',
  waitlistEntryId: 'entry1',
  freedAppointmentId: 'appt1',
  preferredStaffId: undefined,
  notBefore: undefined,
}

describe('dispatchCommit routing', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('routes every registered write tool to a real commit handler, never the fallback', async () => {
    const su = createFakePocketBase()
    su._seed('appointments', [
      { id: 'appt1', staff: 'staff1', customer: 'cust1', status: 'pending', start_time: '2026-03-10T10:00:00.000Z', duration_minutes: 120 },
    ])
    su._seed('customers', [{ id: 'cust1', name: 'Dana', phone: '+972500000000', notes: '' }])
    su._seed('waitlist_entries', [{ id: 'entry1', customer: 'cust1', offered_appointment: 'appt1', status: 'watching' }])
    vi.mocked(getSuperuserClient).mockResolvedValue(su as never)
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ messages: [{ id: 'wamid.1' }] }), { status: 200 })))

    expect(WRITE_TOOL_NAMES.size).toBeGreaterThan(0)
    for (const toolName of WRITE_TOOL_NAMES) {
      try {
        await dispatchCommit(toolName, ARGS)
      } catch (error) {
        expect((error as Error).message, `tool "${toolName}" hit the fallback`).not.toContain('No commit handler registered')
      }
    }
  })

  it('throws the fallback error for a genuinely unregistered tool name', () => {
    // `dispatchCommit` isn't `async` — the fallback `throw` for an unknown tool name happens
    // synchronously, not as a rejected promise, so this asserts on the call itself, not `.rejects`.
    expect(() => dispatchCommit('not_a_real_tool_xyz', {})).toThrow('No commit handler registered')
  })
})
