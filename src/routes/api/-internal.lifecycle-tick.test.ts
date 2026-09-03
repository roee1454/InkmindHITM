import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const ORIGINAL_SECRET = process.env.PB_HOOK_SECRET

vi.mock('@/integrations/pocketbase/superuser.server', () => ({
  getSuperuserClient: vi.fn().mockResolvedValue({}),
}))

vi.mock('@/features/lifecycle/server/lifecycle-service', () => ({
  runLifecycleTick: vi.fn().mockResolvedValue({
    reminders3d: 1,
    reminders1d: 2,
    aftercare: 0,
    healingChecks: 0,
    stalledNudges: 0,
    total: 3,
  }),
}))

import { getSuperuserClient } from '@/integrations/pocketbase/superuser.server'
import { runLifecycleTick } from '@/features/lifecycle/server/lifecycle-service'

describe('handleLifecycleTick', () => {
  beforeEach(() => {
    process.env.PB_HOOK_SECRET = 'test-lifecycle-secret'
    vi.mocked(getSuperuserClient).mockResolvedValue({} as any)
    vi.mocked(runLifecycleTick).mockResolvedValue({
      reminders3d: 1,
      reminders1d: 2,
      aftercare: 0,
      healingChecks: 0,
      stalledNudges: 0,
      total: 3,
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
    process.env.PB_HOOK_SECRET = ORIGINAL_SECRET
  })

  it('rejects a request with a missing secret header', async () => {
    const { handleLifecycleTick } = await import('./internal.lifecycle-tick')
    const request = new Request('http://localhost/api/internal/lifecycle-tick', {
      method: 'POST',
    })

    const res = await handleLifecycleTick(request)
    expect(res.status).toBe(403)
  })

  it('rejects a request with the wrong secret header', async () => {
    const { handleLifecycleTick } = await import('./internal.lifecycle-tick')
    const request = new Request('http://localhost/api/internal/lifecycle-tick', {
      method: 'POST',
      headers: { 'x-pb-hook-secret': 'wrong-secret' },
    })

    const res = await handleLifecycleTick(request)
    expect(res.status).toBe(403)
  })

  it('rejects when PB_HOOK_SECRET is not configured server-side', async () => {
    process.env.PB_HOOK_SECRET = ''
    const { handleLifecycleTick } = await import('./internal.lifecycle-tick')
    const request = new Request('http://localhost/api/internal/lifecycle-tick', {
      method: 'POST',
      headers: { 'x-pb-hook-secret': 'anything' },
    })

    const res = await handleLifecycleTick(request)
    expect(res.status).toBe(403)
  })

  it('accepts authenticated request and returns lifecycle execution summary', async () => {
    const { handleLifecycleTick } = await import('./internal.lifecycle-tick')
    const request = new Request('http://localhost/api/internal/lifecycle-tick', {
      method: 'POST',
      headers: { 'x-pb-hook-secret': 'test-lifecycle-secret' },
    })

    const res = await handleLifecycleTick(request)
    expect(res.status).toBe(200)

    const data = await res.json()
    expect(data.ok).toBe(true)
    expect(data.result.total).toBe(3)
    expect(data.result.reminders3d).toBe(1)
    expect(data.result.reminders1d).toBe(2)
  })
})

