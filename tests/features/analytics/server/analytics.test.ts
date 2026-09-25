import { beforeAll, describe, expect, it, vi } from 'vitest'
import { createFakePocketBase } from '@/test-utils/fakePocketBase'
import type { getSuperuserClient as GetSuperuserClient } from '@/integrations/pocketbase/superuser.server'
import type { requireAuth as RequireAuth } from '@/features/settings/server/helpers.server'

vi.mock('@/integrations/pocketbase/superuser.server', () => ({
  getSuperuserClient: vi.fn(),
}))

vi.mock('@/features/settings/server/helpers.server', () => ({
  requireAuth: vi.fn(),
}))

let getSuperuserClient: typeof GetSuperuserClient
let requireAuth: typeof RequireAuth
let handleGetStudioAnalytics: typeof import('@/features/analytics/server/analytics-core.server').handleGetStudioAnalytics

beforeAll(async () => {
  ;({ getSuperuserClient } = await import('@/integrations/pocketbase/superuser.server'))
  ;({ requireAuth } = await import('@/features/settings/server/helpers.server'))
  ;({ handleGetStudioAnalytics } = await import('@/features/analytics/server/analytics-core.server'))
})

describe('getStudioAnalytics (Comprehensive Analytics)', () => {
  it('aggregates leads, sources, bookings, revenue, funnel, artists, styles, and health', async () => {
    const su = createFakePocketBase()

    // Seed staff
    su._seed('staff', [
      { id: 's1', name: 'Alon Tattoo', role: 'staff', active: true },
      { id: 's2', name: 'Maya Art', role: 'staff', active: true },
    ])

    // Seed customers with various sources
    su._seed('customers', [
      { id: 'c1', name: 'Alice', phone: '0501111111', source: 'instagram', created: '2026-03-10T10:00:00.000Z' },
      { id: 'c2', name: 'Bob', phone: '0502222222', source: 'instagram', created: '2026-03-12T10:00:00.000Z' },
      { id: 'c3', name: 'Charlie', phone: '0503333333', source: 'tiktok', created: '2026-03-15T10:00:00.000Z' },
      { id: 'c4', name: 'Dana', phone: '0504444444', source: 'referral', created: '2026-03-18T10:00:00.000Z' },
      { id: 'c5', name: 'Eli', phone: '0505555555', source: 'website', created: '2026-03-20T10:00:00.000Z' },
    ])

    // Seed conversations with states and assigned staff
    su._seed('conversations', [
      { id: 'cv1', customer: 'c1', assigned_staff: 's1', state: 'AWAITING_APPOINTMENT', status: 'bot_active', created: '2026-03-10T10:00:00.000Z' },
      { id: 'cv2', customer: 'c2', assigned_staff: 's1', state: 'AWAIT_PRICE_OFFER', status: 'bot_active', created: '2026-03-12T10:00:00.000Z' },
      { id: 'cv3', customer: 'c3', assigned_staff: 's2', state: 'COLLECTING_INFO', status: 'bot_active', created: '2026-03-15T10:00:00.000Z' },
      { id: 'cv4', customer: 'c4', assigned_staff: 's2', state: 'COMPLETED', status: 'bot_active', created: '2026-03-18T10:00:00.000Z' },
      { id: 'cv5', customer: 'c5', assigned_staff: '', state: 'NEW', status: 'bot_active', created: '2026-03-20T10:00:00.000Z' },
    ])

    // Seed appointments
    su._seed('appointments', [
      // c1: confirmed appointment, deposit paid 200, total price 800
      {
        id: 'a1',
        customer: 'c1',
        staff: 's1',
        status: 'confirmed',
        type: 'tattoo',
        tattoo_description: 'קעקוע אריה מיקרו-ריאליזם',
        slot_confirmed: true,
        deposit_paid: true,
        deposit_amount: 200,
        price_amount: 800,
        start_time: '2026-03-25T14:00:00.000Z',
        created: '2026-03-10T12:00:00.000Z',
      },
      // c4: completed appointment, deposit paid 150, total 600
      {
        id: 'a2',
        customer: 'c4',
        staff: 's2',
        status: 'completed',
        type: 'tattoo',
        tattoo_description: 'סנונית אולד סקול',
        slot_confirmed: true,
        deposit_paid: true,
        deposit_amount: 150,
        price_amount: 600,
        start_time: '2026-03-22T10:00:00.000Z',
        created: '2026-03-18T14:00:00.000Z',
      },
    ])

    vi.mocked(requireAuth).mockResolvedValue({
      staff: { id: 's1', name: 'Admin Staff', role: 'admin' },
    } as never)
    vi.mocked(getSuperuserClient).mockResolvedValue(su as never)

    const result = await handleGetStudioAnalytics({
      data: { timeRange: 'all' },
    })

    // 1. Total Leads
    expect(result.totalLeads).toBe(5)

    // 2. Booked Appointments (c1 and c4)
    expect(result.totalBookedCustomers).toBe(2)

    // 3. Overall Conversion Rate (2 / 5 = 40%)
    expect(result.overallConversionRate).toBe(40)

    // 4. Attributed Revenue (c1 deposit 200 + c4 completed price 600 = 800 ILS)
    expect(result.totalRevenueIls).toBe(800)

    // 5. Source breakdown & conversion rate
    const igBreakdown = result.sourceBreakdown.find((s) => s.source === 'instagram')
    expect(igBreakdown).toBeDefined()
    expect(igBreakdown?.count).toBe(2)
    expect(igBreakdown?.bookedCount).toBe(1)
    expect(igBreakdown?.conversionRate).toBe(50) // 1 / 2 = 50%

    // 6. Funnel & Drop-off stages
    expect(result.funnel).toHaveLength(4)
    expect(result.funnel[0]?.id).toBe('leads')
    expect(result.funnel[0]?.count).toBe(5)
    // Quotes count: c1 (AWAITING), c2 (AWAIT_PRICE), c4 (COMPLETED) = 3
    expect(result.funnel[1]?.id).toBe('quote')
    expect(result.funnel[1]?.count).toBe(3)
    // Dropoff before quote: 5 - 3 = 2
    expect(result.funnel[0]?.dropoffCount).toBe(2)

    // 7. Artists breakdown
    expect(result.artists.length).toBeGreaterThanOrEqual(2)
    const alon = result.artists.find((a) => a.staffId === 's1')
    expect(alon).toBeDefined()
    expect(alon?.bookedCount).toBe(1)
    expect(alon?.revenueIls).toBe(200)

    // 8. Popular styles
    expect(result.popularStyles.length).toBeGreaterThan(0)
    const realism = result.popularStyles.find((st) => st.styleKey === 'realism')
    expect(realism).toBeDefined()
    expect(realism?.count).toBe(1)

    // 9. Studio health stats
    expect(result.health.cancellationRate).toBe(0)
    expect(result.health.tattooAppointmentsCount).toBe(2)
    expect(result.health.avgTimeToBookHours).toBeGreaterThanOrEqual(0)
  })

  it('correctly handles empty data without division by zero', async () => {
    const su = createFakePocketBase()
    su._seed('customers', [])
    su._seed('appointments', [])
    su._seed('conversations', [])
    su._seed('staff', [])

    vi.mocked(requireAuth).mockResolvedValue({
      staff: { id: 's1', name: 'Admin Staff', role: 'admin' },
    } as never)
    vi.mocked(getSuperuserClient).mockResolvedValue(su as never)

    const result = await handleGetStudioAnalytics({
      data: { timeRange: 'all' },
    })

    expect(result.totalLeads).toBe(0)
    expect(result.totalBookedCustomers).toBe(0)
    expect(result.overallConversionRate).toBe(0)
    expect(result.totalRevenueIls).toBe(0)
    expect(result.funnel[0]?.count).toBe(0)
    expect(result.health.cancellationRate).toBe(0)
  })
})
