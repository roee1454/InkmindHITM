import { describe, it, expect, vi, beforeEach } from 'vitest'

import { cleanupStaffGoogleCalendarEvents } from '@/integrations/google-calendar/server/google-sync.server'
import { disconnectGoogleCalendar } from '@/integrations/google-calendar/server/google-auth.server'
import { handleDisconnectStaffGoogleCalendar } from '@/features/calendar/server/appointments.server'

vi.mock('@/integrations/google-calendar/server/google-sync.server', () => ({
  cleanupStaffGoogleCalendarEvents: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@/integrations/google-calendar/server/google-auth.server', () => ({
  disconnectGoogleCalendar: vi.fn().mockResolvedValue(undefined),
}))

describe('handleDisconnectStaffGoogleCalendar (Bug 26 permission gate)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('throws an error if a regular staff member attempts to disconnect another staff member calendar', async () => {
    const session = {
      staff: { id: 'artist-1', role: 'artist' },
    }

    await expect(
      handleDisconnectStaffGoogleCalendar('artist-2', session as any)
    ).rejects.toThrow('אין הרשאה לנתק יומן של עובד אחר.')

    expect(cleanupStaffGoogleCalendarEvents).not.toHaveBeenCalled()
    expect(disconnectGoogleCalendar).not.toHaveBeenCalled()
  })

  it('allows an artist to disconnect their own calendar', async () => {
    const session = {
      staff: { id: 'artist-1', role: 'artist' },
    }

    const res = await handleDisconnectStaffGoogleCalendar('artist-1', session)

    expect(res).toEqual({ ok: true })
    expect(cleanupStaffGoogleCalendarEvents).toHaveBeenCalledWith('artist-1')
    expect(disconnectGoogleCalendar).toHaveBeenCalledWith('artist-1')
  })

  it('allows an admin or owner to disconnect any staff member calendar', async () => {
    const session = {
      staff: { id: 'admin-user', role: 'admin' },
    }

    const res = await handleDisconnectStaffGoogleCalendar('artist-2', session)

    expect(res).toEqual({ ok: true })
    expect(cleanupStaffGoogleCalendarEvents).toHaveBeenCalledWith('artist-2')
    expect(disconnectGoogleCalendar).toHaveBeenCalledWith('artist-2')
  })
})

