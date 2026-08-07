import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const ORIGINAL_SECRET = process.env.PB_HOOK_SECRET

vi.mock('@/integrations/google-calendar/server/google-sync', () => ({
  syncAppointmentToGoogle: vi.fn(),
  deleteSyncedAppointmentFromGoogle: vi.fn(),
}))

describe('handleAppointmentSync', () => {
  beforeEach(() => {
    process.env.PB_HOOK_SECRET = 'test-hook-secret'
  })

  afterEach(() => {
    vi.resetAllMocks()
    process.env.PB_HOOK_SECRET = ORIGINAL_SECRET
  })

  it('rejects a request with a missing secret header', async () => {
    const { handleAppointmentSync } = await import('./internal.appointment-sync')
    const request = new Request('http://localhost/api/internal/appointment-sync', {
      method: 'POST',
      body: JSON.stringify({ event: 'create', appointmentId: 'abc' }),
    })

    const res = await handleAppointmentSync(request)
    expect(res.status).toBe(403)
  })

  it('rejects a request with the wrong secret header', async () => {
    const { handleAppointmentSync } = await import('./internal.appointment-sync')
    const request = new Request('http://localhost/api/internal/appointment-sync', {
      method: 'POST',
      headers: { 'x-pb-hook-secret': 'wrong-secret' },
      body: JSON.stringify({ event: 'create', appointmentId: 'abc' }),
    })

    const res = await handleAppointmentSync(request)
    expect(res.status).toBe(403)
  })

  it('rejects when PB_HOOK_SECRET is not configured server-side', async () => {
    process.env.PB_HOOK_SECRET = ''
    const { handleAppointmentSync } = await import('./internal.appointment-sync')
    const request = new Request('http://localhost/api/internal/appointment-sync', {
      method: 'POST',
      headers: { 'x-pb-hook-secret': 'anything' },
      body: JSON.stringify({ event: 'create', appointmentId: 'abc' }),
    })

    const res = await handleAppointmentSync(request)
    expect(res.status).toBe(403)
  })

  it('accepts a correctly-authenticated create event and syncs the appointment', async () => {
    const { syncAppointmentToGoogle } = await import('@/integrations/google-calendar/server/google-sync')
    const { handleAppointmentSync } = await import('./internal.appointment-sync')
    const request = new Request('http://localhost/api/internal/appointment-sync', {
      method: 'POST',
      headers: { 'x-pb-hook-secret': 'test-hook-secret' },
      body: JSON.stringify({ event: 'create', appointmentId: 'appt1' }),
    })

    const res = await handleAppointmentSync(request)
    expect(res.status).toBe(200)
    expect(syncAppointmentToGoogle).toHaveBeenCalledWith('appt1')
  })

  it('accepts a correctly-authenticated update event and syncs the appointment', async () => {
    const { syncAppointmentToGoogle } = await import('@/integrations/google-calendar/server/google-sync')
    const { handleAppointmentSync } = await import('./internal.appointment-sync')
    const request = new Request('http://localhost/api/internal/appointment-sync', {
      method: 'POST',
      headers: { 'x-pb-hook-secret': 'test-hook-secret' },
      body: JSON.stringify({ event: 'update', appointmentId: 'appt2' }),
    })

    const res = await handleAppointmentSync(request)
    expect(res.status).toBe(200)
    expect(syncAppointmentToGoogle).toHaveBeenCalledWith('appt2')
  })

  it('accepts a correctly-authenticated delete event and cleans up the Google event', async () => {
    const { deleteSyncedAppointmentFromGoogle } = await import(
      '@/integrations/google-calendar/server/google-sync'
    )
    const { handleAppointmentSync } = await import('./internal.appointment-sync')
    const request = new Request('http://localhost/api/internal/appointment-sync', {
      method: 'POST',
      headers: { 'x-pb-hook-secret': 'test-hook-secret' },
      body: JSON.stringify({
        event: 'delete',
        record: { staff: 'staff1', google_event_id: 'evt1' },
      }),
    })

    const res = await handleAppointmentSync(request)
    expect(res.status).toBe(200)
    expect(deleteSyncedAppointmentFromGoogle).toHaveBeenCalledWith(
      expect.objectContaining({ staff: 'staff1', google_event_id: 'evt1' }),
    )
  })

  it('rejects malformed JSON with a 400', async () => {
    const { handleAppointmentSync } = await import('./internal.appointment-sync')
    const request = new Request('http://localhost/api/internal/appointment-sync', {
      method: 'POST',
      headers: { 'x-pb-hook-secret': 'test-hook-secret' },
      body: 'not json',
    })

    const res = await handleAppointmentSync(request)
    expect(res.status).toBe(400)
  })
})
