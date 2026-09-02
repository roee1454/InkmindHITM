import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { createFakePocketBase } from '@/test-utils/fakePocketBase'
import type { FakePocketBase } from '@/test-utils/fakePocketBase'
import type { getSuperuserClient as GetSuperuserClient } from '@/integrations/pocketbase/superuser.server'
import type { checkAvailabilityForBot as CheckAvailabilityForBot } from '@/features/calendar/server/bot-appointments'
import type { runWaitlistMatching as RunWaitlistMatching, FreedAppointment } from './waitlist-matcher'

vi.mock('@/integrations/pocketbase/superuser.server', () => ({
  getSuperuserClient: vi.fn(),
}))
vi.mock('@/features/calendar/server/bot-appointments', () => ({
  checkAvailabilityForBot: vi.fn(),
}))

let getSuperuserClient: typeof GetSuperuserClient
let checkAvailabilityForBot: typeof CheckAvailabilityForBot
let runWaitlistMatching: typeof RunWaitlistMatching

beforeAll(async () => {
  ;({ getSuperuserClient } = await import('@/integrations/pocketbase/superuser.server'))
  ;({ checkAvailabilityForBot } = await import('@/features/calendar/server/bot-appointments'))
  ;({ runWaitlistMatching } = await import('./waitlist-matcher'))
})

const FREED: FreedAppointment = { id: 'appt_freed', staff: 'staff1', startTime: '2026-03-10T10:00:00.000Z', durationMinutes: 120 }

function seedBase(su: FakePocketBase) {
  su._seed('customers', [{ id: 'cust1', name: 'Dana', phone: '+972500000000' }])
}

function seedCandidate(
  su: FakePocketBase,
  overrides: Partial<{
    status: string
    offeredAppointment: string
    preferredStaff: string
    notBefore: string
    currentAppointmentStart: string
    currentAppointmentDuration: number
  }> = {},
) {
  su._seed('appointments', [
    ...su._dump('appointments'),
    {
      id: 'appt_current',
      staff: 'staff1',
      start_time: overrides.currentAppointmentStart ?? '2026-03-20T10:00:00.000Z',
      duration_minutes: overrides.currentAppointmentDuration ?? 120,
    },
  ])
  su._seed('waitlist_entries', [
    {
      id: 'entry1',
      customer: 'cust1',
      current_appointment: 'appt_current',
      preferred_staff: overrides.preferredStaff ?? '',
      not_before: overrides.notBefore ?? '',
      offered_appointment: overrides.offeredAppointment ?? '',
      status: overrides.status ?? 'watching',
    },
  ])
}

beforeEach(() => {
  vi.mocked(checkAvailabilityForBot).mockResolvedValue({ available: true, reason: 'available' })
})

async function run(freed: FreedAppointment = FREED) {
  const su = createFakePocketBase()
  seedBase(su)
  vi.mocked(getSuperuserClient).mockResolvedValue(su as never)
  await runWaitlistMatching(freed)
  return su
}

describe('runWaitlistMatching', () => {
  it('no-ops when there are no watching candidates', async () => {
    const su = await run()
    expect(su._dump('mcp_conversations')).toHaveLength(0)
  })

  it('no-ops for an unassigned freed appointment (v1 simplification)', async () => {
    const su = createFakePocketBase()
    seedBase(su)
    seedCandidate(su)
    vi.mocked(getSuperuserClient).mockResolvedValue(su as never)
    await runWaitlistMatching({ ...FREED, staff: null })
    expect(su._dump('mcp_conversations')).toHaveLength(0)
  })

  it('creates a conversation + message + pending action for one matching candidate', async () => {
    const su = createFakePocketBase()
    seedBase(su)
    seedCandidate(su)
    vi.mocked(getSuperuserClient).mockResolvedValue(su as never)
    await runWaitlistMatching(FREED)

    expect(su._dump('mcp_conversations')).toHaveLength(1)
    expect(su._dump('mcp_messages')).toHaveLength(1)
    const actions = su._dump('mcp_actions')
    expect(actions).toHaveLength(1)
    expect(actions[0]).toMatchObject({ tool_name: 'offer_waitlist_slot', status: 'pending' })
    // Marks the entry as having an offer in flight, for idempotency (see next test).
    expect(su._dump('waitlist_entries')[0]).toMatchObject({ offered_appointment: 'appt_freed' })
  })

  it('excludes a candidate whose current appointment is not actually earlier than the freed slot', async () => {
    const su = createFakePocketBase()
    seedBase(su)
    seedCandidate(su, { currentAppointmentStart: '2026-03-01T10:00:00.000Z' }) // earlier than FREED already
    vi.mocked(getSuperuserClient).mockResolvedValue(su as never)
    await runWaitlistMatching(FREED)
    expect(su._dump('mcp_conversations')).toHaveLength(0)
  })

  it('excludes a candidate whose not_before is after the freed slot', async () => {
    const su = createFakePocketBase()
    seedBase(su)
    seedCandidate(su, { notBefore: '2026-04-01T00:00:00.000Z' })
    vi.mocked(getSuperuserClient).mockResolvedValue(su as never)
    await runWaitlistMatching(FREED)
    expect(su._dump('mcp_conversations')).toHaveLength(0)
  })

  it('excludes a candidate whose session duration exceeds the freed slot', async () => {
    const su = createFakePocketBase()
    seedBase(su)
    seedCandidate(su, { currentAppointmentDuration: 180 }) // freed slot is only 120 min
    vi.mocked(getSuperuserClient).mockResolvedValue(su as never)
    await runWaitlistMatching(FREED)
    expect(su._dump('mcp_conversations')).toHaveLength(0)
  })

  it('excludes a candidate that already has an offer in flight (idempotency)', async () => {
    const su = createFakePocketBase()
    seedBase(su)
    seedCandidate(su, { offeredAppointment: 'some_other_appt' })
    vi.mocked(getSuperuserClient).mockResolvedValue(su as never)
    await runWaitlistMatching(FREED)
    expect(su._dump('mcp_conversations')).toHaveLength(0)
  })

  it('excludes a candidate preferring a different staff member', async () => {
    const su = createFakePocketBase()
    seedBase(su)
    seedCandidate(su, { preferredStaff: 'staff2' })
    vi.mocked(getSuperuserClient).mockResolvedValue(su as never)
    await runWaitlistMatching(FREED)
    expect(su._dump('mcp_conversations')).toHaveLength(0)
  })

  it('no-ops if the slot got taken again before matching completes', async () => {
    const su = createFakePocketBase()
    seedBase(su)
    seedCandidate(su)
    vi.mocked(getSuperuserClient).mockResolvedValue(su as never)
    vi.mocked(checkAvailabilityForBot).mockResolvedValue({ available: false, reason: 'slot_taken' })
    await runWaitlistMatching(FREED)
    expect(su._dump('mcp_conversations')).toHaveLength(0)
  })

  it('picks the candidate whose original appointment is soonest when several match', async () => {
    const su = createFakePocketBase()
    seedBase(su)
    su._seed('customers', [
      { id: 'cust1', name: 'Dana' },
      { id: 'cust2', name: 'Noa' },
    ])
    su._seed('appointments', [
      { id: 'appt_current_late', staff: 'staff1', start_time: '2026-03-25T10:00:00.000Z', duration_minutes: 120 },
      { id: 'appt_current_soon', staff: 'staff1', start_time: '2026-03-15T10:00:00.000Z', duration_minutes: 120 },
    ])
    su._seed('waitlist_entries', [
      { id: 'entry_late', customer: 'cust1', current_appointment: 'appt_current_late', preferred_staff: '', not_before: '', offered_appointment: '', status: 'watching' },
      { id: 'entry_soon', customer: 'cust2', current_appointment: 'appt_current_soon', preferred_staff: '', not_before: '', offered_appointment: '', status: 'watching' },
    ])
    vi.mocked(getSuperuserClient).mockResolvedValue(su as never)
    await runWaitlistMatching(FREED)

    const actions = su._dump('mcp_actions')
    expect(actions).toHaveLength(1)
    expect(actions[0]).toMatchObject({ args: { waitlistEntryId: 'entry_soon' } })
  })
})
