import { describe, it, expect, vi } from 'vitest'
import { handleConnectGet } from '@/routes/api/staff.$staffId.google-calendar.connect'

import { createRequestClient } from '@/integrations/pocketbase/superuser.server'

vi.mock('@/integrations/pocketbase/superuser.server', () => ({
  createRequestClient: vi.fn(),
}))

vi.mock('@/integrations/google-calendar/server/google-auth.server', () => ({
  packOAuthState: vi.fn().mockReturnValue('mock-state'),
  getAuthUrl: vi.fn().mockReturnValue('https://accounts.google.com/o/oauth2/v2/auth?mock=1'),
}))

describe('handleConnectGet (Google Calendar Connect Auth Guard)', () => {
  it('returns 401 Unauthorized when no valid session cookie is present', async () => {
    vi.mocked(createRequestClient).mockReturnValue({
      authStore: { isValid: false, record: null },
    } as never)

    const req = new Request('http://localhost:3101/api/staff/staff1/google-calendar/connect')
    const res = await handleConnectGet(req, { staffId: 'staff1' })

    expect(res.status).toBe(401)
    expect(await res.text()).toContain('Unauthorized')
  })

  it('returns 403 Forbidden when an artist tries to connect another artist calendar', async () => {
    vi.mocked(createRequestClient).mockReturnValue({
      authStore: {
        isValid: true,
        record: { id: 'staff-artist-1', role: 'artist' },
      },
    } as never)

    const req = new Request('http://localhost:3101/api/staff/staff-artist-2/google-calendar/connect')
    const res = await handleConnectGet(req, { staffId: 'staff-artist-2' })

    expect(res.status).toBe(403)
    expect(await res.text()).toContain('Forbidden')
  })

  it('returns 302 redirect to Google OAuth when artist connects their own calendar', async () => {
    vi.mocked(createRequestClient).mockReturnValue({
      authStore: {
        isValid: true,
        record: { id: 'staff-artist-1', role: 'artist' },
      },
    } as never)

    const req = new Request('http://localhost:3101/api/staff/staff-artist-1/google-calendar/connect')
    const res = await handleConnectGet(req, { staffId: 'staff-artist-1' })

    expect(res.status).toBe(302)
    expect(res.headers.get('Location')).toContain('accounts.google.com')
  })

  it('returns 302 redirect when admin/owner connects calendar for any artist', async () => {
    vi.mocked(createRequestClient).mockReturnValue({
      authStore: {
        isValid: true,
        record: { id: 'staff-admin', role: 'admin' },
      },
    } as never)

    const req = new Request('http://localhost:3101/api/staff/staff-artist-1/google-calendar/connect')
    const res = await handleConnectGet(req, { staffId: 'staff-artist-1' })

    expect(res.status).toBe(302)
    expect(res.headers.get('Location')).toContain('accounts.google.com')
  })
})

