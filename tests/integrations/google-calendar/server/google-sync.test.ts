import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  filterGoogleBusyIntervalsForDay,
  getGoogleCalendarBusyIntervals,
  getAuthorizedGoogleClient,
} from '@/integrations/google-calendar/server/google-auth.server'
import {
  syncAppointmentToGoogle,
  syncAllConfirmedAppointmentsForStaff,
} from '@/integrations/google-calendar/server/google-sync.server'

// Mock PocketBase superuser
const mockGetOne = vi.fn((..._args: any[]): any => Promise.resolve(null))
const mockGetFirstListItem = vi.fn((..._args: any[]): any => Promise.resolve(null))
const mockGetFullList = vi.fn((..._args: any[]): any => Promise.resolve([]))
const mockCreate = vi.fn((..._args: any[]): any => Promise.resolve({}))
const mockUpdate = vi.fn((..._args: any[]): any => Promise.resolve({}))
const mockDelete = vi.fn((..._args: any[]): any => Promise.resolve({}))

vi.mock('@/integrations/pocketbase/superuser.server', () => ({
  getSuperuserClient: vi.fn(async () => ({
    collection: (name: string) => {
      switch (name) {
        case 'appointments':
          return {
            getOne: mockGetOne,
            getFirstListItem: mockGetFirstListItem,
            getFullList: mockGetFullList,
            create: mockCreate,
            update: mockUpdate,
            delete: mockDelete,
          }
        case 'credentials':
          return {
            getFirstListItem: mockGetFirstListItem,
            update: mockUpdate,
            create: mockCreate,
            delete: mockDelete,
          }
        case 'staff':
          return {
            getOne: vi.fn(async (id) => ({ id, name: 'יוסי המקעקע' })),
          }
        default:
          return {
            getOne: mockGetOne,
            getFirstListItem: mockGetFirstListItem,
            getFullList: mockGetFullList,
            create: mockCreate,
            update: mockUpdate,
          }
      }
    },
  })),
}))

// Mock notifications
const mockAddSystemNotification = vi.fn((..._args: any[]): any => Promise.resolve({ id: 'notif-1' }))
vi.mock('@/features/notifications/server/notifications', () => ({
  addSystemNotification: (arg: any) => mockAddSystemNotification(arg),
}))

describe('Cluster 4: Google Calendar Sync & OAuth Engine', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Bug 24: Google Busy Intervals Filtering (filterGoogleBusyIntervalsForDay)', () => {
    it('converts standard timed events into minutes from midnight', () => {
      const events = [
        {
          id: 'ev-1',
          summary: 'Doctor Appointment',
          start: { dateTime: '2026-04-15T14:00:00+03:00' },
          end: { dateTime: '2026-04-15T15:30:00+03:00' },
        },
      ]

      const intervals = filterGoogleBusyIntervalsForDay(events, '2026-04-15')
      expect(intervals).toHaveLength(1)
      expect(intervals[0]).toEqual({ start: 14 * 60, end: 15 * 60 + 30 })
    })

    it('ignores transparent (free) events', () => {
      const events = [
        {
          id: 'ev-free',
          summary: 'Reminder',
          transparency: 'transparent',
          start: { dateTime: '2026-04-15T10:00:00+03:00' },
          end: { dateTime: '2026-04-15T11:00:00+03:00' },
        },
      ]

      const intervals = filterGoogleBusyIntervalsForDay(events, '2026-04-15')
      expect(intervals).toHaveLength(0)
    })

    it('ignores cancelled events', () => {
      const events = [
        {
          id: 'ev-cancelled',
          summary: 'Cancelled meeting',
          status: 'cancelled',
          start: { dateTime: '2026-04-15T12:00:00+03:00' },
          end: { dateTime: '2026-04-15T13:00:00+03:00' },
        },
      ]

      const intervals = filterGoogleBusyIntervalsForDay(events, '2026-04-15')
      expect(intervals).toHaveLength(0)
    })

    it('ignores Inkmind synced events matching excludeEventIds to prevent duplicate busy slots', () => {
      const events = [
        {
          id: 'inkmind-google-id',
          summary: 'Tattoo Session',
          start: { dateTime: '2026-04-15T16:00:00+03:00' },
          end: { dateTime: '2026-04-15T18:00:00+03:00' },
        },
      ]

      const exclude = new Set(['inkmind-google-id'])
      const intervals = filterGoogleBusyIntervalsForDay(events, '2026-04-15', exclude)
      expect(intervals).toHaveLength(0)
    })

    it('marks entire day (0 to 1440) for all-day events', () => {
      const events = [
        {
          id: 'all-day-1',
          summary: 'Studio Vacation',
          start: { date: '2026-04-15' },
          end: { date: '2026-04-16' },
        },
      ]

      const intervals = filterGoogleBusyIntervalsForDay(events, '2026-04-15')
      expect(intervals).toHaveLength(1)
      expect(intervals[0]).toEqual({ start: 0, end: 1440 })
    })

    it('ignores events occurring on a different date', () => {
      const events = [
        {
          id: 'ev-tomorrow',
          summary: 'Tomorrow meeting',
          start: { dateTime: '2026-04-16T14:00:00+03:00' },
          end: { dateTime: '2026-04-16T15:00:00+03:00' },
        },
      ]

      const intervals = filterGoogleBusyIntervalsForDay(events, '2026-04-15')
      expect(intervals).toHaveLength(0)
    })
  })

  describe('Bug 24: Graceful Fallback', () => {
    it('returns empty array if staff member has no Google connection or error occurs', async () => {
      mockGetFirstListItem.mockResolvedValueOnce(null) // No credentials
      const intervals = await getGoogleCalendarBusyIntervals('unconnected-staff', '2026-04-15')
      expect(intervals).toEqual([])
    })
  })

  describe('Bug 27: Sync Failure Handling & Staff Notification', () => {
    it('sets google_sync_status to push_failed and sends system notification when sync fails', async () => {
      // Mock appointment found in PocketBase
      mockGetOne.mockResolvedValueOnce({
        id: 'appt-123',
        staff: 'staff-456',
        status: 'confirmed',
        deposit_paid: true,
        start_time: '2026-04-15T12:00:00.000Z',
        duration_minutes: 120,
        customer_name_override: 'ישראל ישראלי',
        expand: { customer: { name: 'ישראל ישראלי', phone: '0501234567' } },
      })

      // Mock no credentials found -> causes sync to fail
      mockGetFirstListItem.mockResolvedValueOnce(null)

      await syncAppointmentToGoogle('appt-123')

      // Verifies push_failed status was written to DB
      expect(mockUpdate).toHaveBeenCalledWith(
        'appt-123',
        expect.objectContaining({ google_sync_status: 'push_failed' }),
      )

      // Verifies notification was triggered for staff
      expect(mockAddSystemNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'warning',
          title: 'שגיאת סנכרון ליומן גוגל',
          link: '/dashboard/calendar',
        }),
      )
    })
  })

  describe('Bug 29: Full Resync on Reconnect', () => {
    it('syncs all upcoming confirmed appointments regardless of whether google_event_id was set', async () => {
      mockGetFullList.mockResolvedValueOnce([
        { id: 'appt-1', google_event_id: 'old-google-id', status: 'confirmed' },
        { id: 'appt-2', google_event_id: '', status: 'confirmed' },
      ])

      // When syncAppointmentToGoogle is called for each:
      mockGetOne.mockResolvedValue({
        id: 'appt-x',
        staff: 'staff-456',
        status: 'confirmed',
        deposit_paid: true,
        start_time: new Date().toISOString(),
      })
      mockGetFirstListItem.mockResolvedValue(null) // disconnected, just to observe calls

      await syncAllConfirmedAppointmentsForStaff('staff-456')

      // Verifies BOTH appointments were processed (not just the one without google_event_id)
      expect(mockGetOne).toHaveBeenCalledTimes(2)
    })
  })

  describe('Bug 28: Token Refresh Race Condition Prevention (Mutex Single-Flight)', () => {
    it('coalesces concurrent getAuthorizedGoogleClient calls onto a single refresh', async () => {
      // Mock credentials record with an expired token
      const expiredCreds = {
        id: 'cred-1',
        staff: 'staff-mutex-test',
        provider: 'google_calendar',
        refresh_token: 'valid-refresh-token',
        access_token: 'expired-access-token',
        token_expires_at: new Date(Date.now() - 100000).toISOString(),
        google_calendar_id: 'primary',
      }

      mockGetFirstListItem.mockResolvedValue(expiredCreds)

      // Spy on OAuth2Client prototype refreshAccessToken
      const { OAuth2Client } = await import('google-auth-library')
      let refreshCallCount = 0
      const originalRefresh = OAuth2Client.prototype.refreshAccessToken

      OAuth2Client.prototype.refreshAccessToken = vi.fn(async () => {
        refreshCallCount++
        // Simulate network latency of 30ms
        await new Promise((r) => setTimeout(r, 30))
        return {
          credentials: {
            access_token: 'fresh-token-123',
            expiry_date: Date.now() + 3600000,
          },
        } as any
      })

      try {
        // Fire 5 concurrent requests for the same staff member
        const results = await Promise.all([
          getAuthorizedGoogleClient('staff-mutex-test'),
          getAuthorizedGoogleClient('staff-mutex-test'),
          getAuthorizedGoogleClient('staff-mutex-test'),
          getAuthorizedGoogleClient('staff-mutex-test'),
          getAuthorizedGoogleClient('staff-mutex-test'),
        ])

        // All 5 must receive an authorized client
        expect(results).toHaveLength(5)
        for (const res of results) {
          expect(res.calendarId).toBe('primary')
        }

        // Critically: refreshAccessToken MUST only be called ONCE (not 5 times!)
        expect(refreshCallCount).toBe(1)
      } finally {
        OAuth2Client.prototype.refreshAccessToken = originalRefresh
      }
    })
  })
})

