import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { createFakePocketBase } from '@/test-utils/fakePocketBase'
import type { getSuperuserClient as GetSuperuserClient } from '@/integrations/pocketbase/superuser.server'
import type { checkAvailabilityForBot as CheckAvailabilityForBot } from '@/features/calendar/server/bot-appointments.server'
import type {
  commitCalendarAction as CommitCalendarAction,
  buildCalendarTools as BuildCalendarTools,
} from '@/features/mcp-assistant/server/tool-servers/calendar.server'
import type { handleCloseSession as HandleCloseSession } from '@/features/payments/server/close-session.server'

vi.mock('@/integrations/pocketbase/superuser.server', () => ({
  getSuperuserClient: vi.fn(),
}))
vi.mock('@/features/calendar/server/bot-appointments.server', () => ({
  checkAvailabilityForBot: vi.fn(),
  getArtistScheduleForBot: vi.fn(),
}))
vi.mock('@/features/payments/server/close-session.server', () => ({
  handleCloseSession: vi.fn(),
}))

let getSuperuserClient: typeof GetSuperuserClient
let checkAvailabilityForBot: typeof CheckAvailabilityForBot
let commitCalendarAction: typeof CommitCalendarAction
let buildCalendarTools: typeof BuildCalendarTools
let handleCloseSession: typeof HandleCloseSession

beforeAll(async () => {
  ;({ getSuperuserClient } = await import('@/integrations/pocketbase/superuser.server'))
  ;({ checkAvailabilityForBot } = await import('@/features/calendar/server/bot-appointments.server'))
  ;({ commitCalendarAction, buildCalendarTools } = await import(
    '@/features/mcp-assistant/server/tool-servers/calendar.server'
  ))
  ;({ handleCloseSession } = await import('@/features/payments/server/close-session.server'))
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

  it('rejects completing a session directly without close_session', async () => {
    const su = createFakePocketBase()
    su._seed('appointments', [{ id: 'appt1', status: 'confirmed', kind: 'session' }])
    vi.mocked(getSuperuserClient).mockResolvedValue(su as never)
    await expect(
      commitCalendarAction('mark_appointment_status', { appointmentId: 'appt1', status: 'completed' }),
    ).rejects.toThrow('לא ניתן לסמן סשן קעקוע כהושלם בעדכון סטטוס רגיל')
  })

  it('allows completing a consultation directly', async () => {
    const su = createFakePocketBase()
    su._seed('appointments', [{ id: 'appt1', status: 'confirmed', kind: 'consultation' }])
    vi.mocked(getSuperuserClient).mockResolvedValue(su as never)
    await commitCalendarAction('mark_appointment_status', { appointmentId: 'appt1', status: 'completed' })
    expect(su._dump('appointments')[0]).toMatchObject({ status: 'completed' })
  })
})

describe('commitCalendarAction — close_session', () => {
  it('calls handleCloseSession with actor and args', async () => {
    const su = createFakePocketBase()
    vi.mocked(getSuperuserClient).mockResolvedValue(su as never)
    vi.mocked(handleCloseSession).mockResolvedValue({
      projectId: 'proj1',
      title: 'דרקון',
      appointments: [],
      payments: [],
      balance: { billed: 1500, paid: 1200, refunded: 0, due: 300, credit: 0 },
      quoteMin: null,
      quoteMax: null,
      estimatedSessions: null,
      depositApplication: 'first_session',
    })

    const res = await commitCalendarAction('close_session', {
      appointmentId: 'appt1',
      finalPrice: 1500,
      payments: [{ method: 'cash', amount: 1200 }],
    })

    expect(handleCloseSession).toHaveBeenCalledWith(
      {
        appointmentId: 'appt1',
        finalPrice: 1500,
        chargeWaived: false,
        payments: [{ method: 'cash', amount: 1200 }],
        completesProject: false,
      },
      { su, actor: { id: 'mcp_assistant', role: 'admin' } },
    )
    expect(res).toContain('300')
  })
})

describe('buildCalendarTools — close_session', () => {
  const createCtx = () => ({
    su: createFakePocketBase() as any,
    staff: { id: 'staff1', name: 'Alon', role: 'admin' } as any,
    conversationId: 'conv1',
    messageId: 'msg1',
    proposals: [] as any[],
  })

  it('fails if neither finalPrice nor chargeWaived is provided', async () => {
    const su = createFakePocketBase()
    su._seed('appointments', [
      { id: 'appt1', status: 'confirmed', kind: 'session', start_time: '2026-03-10T10:00:00.000Z' },
    ])
    vi.mocked(getSuperuserClient).mockResolvedValue(su as never)

    const ctx = createCtx()
    const tools = buildCalendarTools(ctx)
    const res = (await (tools.close_session as any).execute({
      appointmentId: 'appt1',
    })) as { status: string; message: string }

    expect(res.status).toBe('error')
    expect(res.message).toContain('יש לציין מחיר סופי לתור או לסמן ללא חיוב')
  })

  it('generates a valid diff for closing a session', async () => {
    const su = createFakePocketBase()
    su._seed('appointments', [
      {
        id: 'appt1',
        status: 'confirmed',
        kind: 'session',
        start_time: '2026-03-10T10:00:00.000Z',
        customer: 'cust1',
        project: 'proj1',
      },
    ])
    su._seed('customers', [{ id: 'cust1', name: 'רועי כהן' }])
    su._seed('projects', [{ id: 'proj1', title: 'דרקון' }])
    vi.mocked(getSuperuserClient).mockResolvedValue(su as never)

    const ctx = createCtx()
    const tools = buildCalendarTools(ctx)
    const res = (await (tools.close_session as any).execute({
      appointmentId: 'appt1',
      finalPrice: 1500,
      payments: [{ method: 'cash', amount: 1500 }],
    })) as { status: string }

    expect(res.status).toBe('pending_approval')
    expect(ctx.proposals).toHaveLength(1)
    expect(ctx.proposals[0].diff.summary).toContain('סגירת סשן — רועי כהן')
    expect(ctx.proposals[0].diff.rows[1]).toMatchObject({ label: 'מחיר סופי', after: '₪1500' })
  })
})
