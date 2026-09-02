import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { createFakePocketBase } from '@/test-utils/fakePocketBase'
import type { getSuperuserClient as GetSuperuserClient } from '@/integrations/pocketbase/superuser.server'
import type { checkAvailabilityForBot as CheckAvailabilityForBot } from '@/features/calendar/server/bot-appointments'
import type { commitCalendarAction as CommitCalendarAction } from './calendar.server'

vi.mock('@/integrations/pocketbase/superuser.server', () => ({
  getSuperuserClient: vi.fn(),
}))
vi.mock('@/features/calendar/server/bot-appointments', () => ({
  checkAvailabilityForBot: vi.fn(),
  getArtistScheduleForBot: vi.fn(),
}))

let getSuperuserClient: typeof GetSuperuserClient
let checkAvailabilityForBot: typeof CheckAvailabilityForBot
let commitCalendarAction: typeof CommitCalendarAction

beforeAll(async () => {
  ;({ getSuperuserClient } = await import('@/integrations/pocketbase/superuser.server'))
  ;({ checkAvailabilityForBot } = await import('@/features/calendar/server/bot-appointments'))
  ;({ commitCalendarAction } = await import('./calendar.server'))
})

beforeEach(() => {
  vi.mocked(checkAvailabilityForBot).mockResolvedValue({ available: true, reason: 'available' })
})

describe('commitCalendarAction — create_appointment', () => {
  it('re-validates availability and rejects if the slot is no longer free', async () => {
    const su = createFakePocketBase()
    vi.mocked(getSuperuserClient).mockResolvedValue(su as never)
    vi.mocked(checkAvailabilityForBot).mockResolvedValue({ available: false, reason: 'slot_taken' })
    await expect(
      commitCalendarAction('create_appointment', {
        customerId: 'cust1',
        staffId: 'staff1',
        date: '2026-03-10',
        timeSlot: '10:00',
        durationMinutes: 120,
        status: 'pending',
      }),
    ).rejects.toThrow('אינה זמינה')
    expect(su._dump('appointments')).toHaveLength(0)
  })

  it('inserts the appointment with no dead studio field and the right shape', async () => {
    const su = createFakePocketBase()
    vi.mocked(getSuperuserClient).mockResolvedValue(su as never)
    await commitCalendarAction('create_appointment', {
      customerId: 'cust1',
      staffId: 'staff1',
      date: '2026-03-10',
      timeSlot: '10:00',
      durationMinutes: 120,
      tattooDescription: 'sleeve',
      status: 'confirmed',
    })
    const created = su._dump('appointments')[0]!
    expect(created).toMatchObject({
      customer: 'cust1',
      staff: 'staff1',
      duration_minutes: 120,
      status: 'confirmed',
      tattoo_description: 'sleeve',
      slot_confirmed: true,
      source: 'staff_manual',
    })
    expect(created).not.toHaveProperty('studio')
  })

  it('rejects an outside-working-hours slot without allowException', async () => {
    const su = createFakePocketBase()
    vi.mocked(getSuperuserClient).mockResolvedValue(su as never)
    vi.mocked(checkAvailabilityForBot).mockResolvedValue({ available: false, reason: 'outside_working_hours' })
    await expect(
      commitCalendarAction('create_appointment', {
        customerId: 'cust1',
        staffId: 'staff1',
        date: '2026-03-13', // a Friday
        timeSlot: '10:00',
        durationMinutes: 120,
        status: 'pending',
      }),
    ).rejects.toThrow('אינה זמינה')
    expect(su._dump('appointments')).toHaveLength(0)
  })

  it('books an outside-working-hours slot as a flagged exception when allowException is true', async () => {
    const su = createFakePocketBase()
    vi.mocked(getSuperuserClient).mockResolvedValue(su as never)
    vi.mocked(checkAvailabilityForBot).mockResolvedValue({ available: false, reason: 'outside_working_hours' })
    await commitCalendarAction('create_appointment', {
      customerId: 'cust1',
      staffId: 'staff1',
      date: '2026-03-13',
      timeSlot: '10:00',
      durationMinutes: 120,
      status: 'pending',
      allowException: true,
    })
    expect(su._dump('appointments')[0]).toMatchObject({ is_exception: true })
  })

  it('still rejects a genuinely taken slot even with allowException — an exception cannot un-book someone else', async () => {
    const su = createFakePocketBase()
    vi.mocked(getSuperuserClient).mockResolvedValue(su as never)
    vi.mocked(checkAvailabilityForBot).mockResolvedValue({ available: false, reason: 'slot_taken' })
    await expect(
      commitCalendarAction('create_appointment', {
        customerId: 'cust1',
        staffId: 'staff1',
        date: '2026-03-10',
        timeSlot: '10:00',
        durationMinutes: 120,
        status: 'pending',
        allowException: true,
      }),
    ).rejects.toThrow('אינה זמינה')
    expect(su._dump('appointments')).toHaveLength(0)
  })
})

describe('commitCalendarAction — reschedule_appointment', () => {
  it('books an outside-working-hours slot as a flagged exception when allowException is true', async () => {
    const su = createFakePocketBase()
    su._seed('appointments', [{ id: 'appt1', staff: 'staff1', duration_minutes: 120, start_time: '2026-03-10T10:00:00.000Z' }])
    vi.mocked(getSuperuserClient).mockResolvedValue(su as never)
    vi.mocked(checkAvailabilityForBot).mockResolvedValue({ available: false, reason: 'studio_closed' })
    await commitCalendarAction('reschedule_appointment', {
      appointmentId: 'appt1',
      newDate: '2026-03-13',
      newTimeSlot: '10:00',
      allowException: true,
    })
    expect(su._dump('appointments')[0]).toMatchObject({ is_exception: true })
  })

  it('rejects without allowException', async () => {
    const su = createFakePocketBase()
    su._seed('appointments', [{ id: 'appt1', staff: 'staff1', duration_minutes: 120, start_time: '2026-03-10T10:00:00.000Z' }])
    vi.mocked(getSuperuserClient).mockResolvedValue(su as never)
    vi.mocked(checkAvailabilityForBot).mockResolvedValue({ available: false, reason: 'studio_closed' })
    await expect(
      commitCalendarAction('reschedule_appointment', { appointmentId: 'appt1', newDate: '2026-03-13', newTimeSlot: '10:00' }),
    ).rejects.toThrow('אינה זמינה')
  })
})

describe('commitCalendarAction — mark_appointment_status', () => {
  it('updates the appointment status', async () => {
    const su = createFakePocketBase()
    su._seed('appointments', [{ id: 'appt1', status: 'confirmed' }])
    vi.mocked(getSuperuserClient).mockResolvedValue(su as never)
    await commitCalendarAction('mark_appointment_status', { appointmentId: 'appt1', status: 'no_show' })
    expect(su._dump('appointments')[0]).toMatchObject({ status: 'no_show' })
  })
})
