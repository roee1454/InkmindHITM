import { beforeAll, describe, expect, it, vi } from 'vitest'
import { createFakePocketBase } from '@/test-utils/fakePocketBase'
import type { getSuperuserClient as GetSuperuserClient } from '@/integrations/pocketbase/superuser.server'
import type { buildAnalyticsTools as BuildAnalyticsTools } from './analytics.server'

vi.mock('@/integrations/pocketbase/superuser.server', () => ({
  getSuperuserClient: vi.fn(),
}))

let getSuperuserClient: typeof GetSuperuserClient
let buildAnalyticsTools: typeof BuildAnalyticsTools

beforeAll(async () => {
  ;({ getSuperuserClient } = await import('@/integrations/pocketbase/superuser.server'))
  ;({ buildAnalyticsTools } = await import('./analytics.server'))
})

async function callGetBusinessSummary(su: ReturnType<typeof createFakePocketBase>, fromDate: string, toDate: string) {
  vi.mocked(getSuperuserClient).mockResolvedValue(su as never)
  const tools = buildAnalyticsTools()
  // `tool()` from the `ai` package wraps `execute` — call it directly with the raw input shape.
  return (tools.get_business_summary as unknown as { execute: (input: unknown) => Promise<{ data: unknown }> }).execute({
    fromDate,
    toDate,
  })
}

describe('get_business_summary', () => {
  it('sums only paid deposits toward revenue, and counts by status', async () => {
    const su = createFakePocketBase()
    su._seed('appointments', [
      { id: 'a1', start_time: '2026-03-05T10:00:00.000Z', status: 'completed', deposit_paid: true, deposit_amount: 200 },
      { id: 'a2', start_time: '2026-03-06T10:00:00.000Z', status: 'completed', deposit_paid: false, deposit_amount: 300 },
      { id: 'a3', start_time: '2026-03-07T10:00:00.000Z', status: 'no_show', deposit_paid: true, deposit_amount: 150 },
      { id: 'a4', start_time: '2026-03-08T10:00:00.000Z', status: 'cancelled' },
    ])
    const result = (await callGetBusinessSummary(su, '2026-03-01', '2026-03-31')) as {
      data: { totalAppointments: number; countsByStatus: Record<string, number>; depositRevenueIls: number; noShowRatePercent: number }
    }
    expect(result.data.totalAppointments).toBe(4)
    expect(result.data.countsByStatus).toMatchObject({ completed: 2, no_show: 1, cancelled: 1 })
    // Only a1 (200) and a3 (150) had deposit_paid: true.
    expect(result.data.depositRevenueIls).toBe(350)
    // 1 no_show out of (2 completed + 1 no_show) = 33%.
    expect(result.data.noShowRatePercent).toBe(33)
  })

  it('handles an empty range without dividing by zero', async () => {
    const su = createFakePocketBase()
    const result = (await callGetBusinessSummary(su, '2026-03-01', '2026-03-31')) as {
      data: { totalAppointments: number; noShowRatePercent: number }
    }
    expect(result.data.totalAppointments).toBe(0)
    expect(result.data.noShowRatePercent).toBe(0)
  })
})
