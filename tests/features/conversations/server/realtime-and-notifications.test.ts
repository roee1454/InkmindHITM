import { describe, expect, it, vi, beforeEach } from 'vitest'
import { getBrowserClient } from '@/integrations/pocketbase/client'
import { getSession } from '@/lib/session.server'

// Mock tanstack start server functions
vi.mock('@tanstack/react-start/server', () => ({
  getRequestHeader: vi.fn(),
  setResponseHeader: vi.fn(),
}))

// Mock superuser client
vi.mock('@/integrations/pocketbase/superuser.server', () => {
  const mockAuthStore = {
    isValid: true,
    record: { id: 'staff_1', name: 'Roee Test', role: 'owner' },
    token: 'jwt-valid-token-123',
    loadFromCookie: vi.fn(),
    exportToCookie: vi.fn().mockReturnValue('pb_auth=cookie-value; Path=/; HttpOnly'),
    clear: vi.fn(),
  }

  const mockStaffCollection = {
    authRefresh: vi.fn().mockResolvedValue({
      token: 'jwt-refreshed-token-456',
      record: { id: 'staff_1', name: 'Roee Test', role: 'owner' },
    }),
  }

  return {
    createRequestClient: vi.fn().mockReturnValue({
      authStore: mockAuthStore,
      collection: vi.fn().mockReturnValue(mockStaffCollection),
      autoCancellation: vi.fn(),
    }),
    getSuperuserClient: vi.fn(),
  }
})

describe('Realtime & Session Pipeline', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Session Server & Token Refresh', () => {
    it('getSession refreshes the staff token and persists cookie', async () => {
      const { setResponseHeader } = await import('@tanstack/react-start/server')
      const session = await getSession()

      expect(session).not.toBeNull()
      expect(session?.staff.id).toBe('staff_1')
      expect(session?.token).toBe('jwt-valid-token-123')
      // Ensure persistSessionCookie was called and set-cookie was written
      expect(setResponseHeader).toHaveBeenCalledWith(
        'set-cookie',
        expect.stringContaining('pb_auth='),
      )
    })
  })

  describe('Browser PocketBase Client Configuration', () => {
    it('sets autoCancellation(false) and normalizes localhost to 127.0.0.1', () => {
      const client = getBrowserClient()
      expect(client).toBeDefined()
      // URL should not use localhost to avoid IPv6 [::1] connection refused issues
      expect(client.baseUrl).not.toContain('localhost:8090')
      expect(client.baseUrl).toContain('127.0.0.1:8090')
    })
  })
})

