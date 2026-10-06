import { beforeAll, describe, expect, it, vi } from 'vitest'
import { createFakePocketBase } from '@/test-utils/fakePocketBase'
import type { getSuperuserClient as GetSuperuserClient } from '@/integrations/pocketbase/superuser.server'
import type { buildPaymentsTools as BuildPaymentsTools } from '@/features/mcp-assistant/server/tool-servers/payments.server'

vi.mock('@/integrations/pocketbase/superuser.server', () => ({
  getSuperuserClient: vi.fn(),
}))

let getSuperuserClient: typeof GetSuperuserClient
let buildPaymentsTools: typeof BuildPaymentsTools

beforeAll(async () => {
  ;({ getSuperuserClient } = await import('@/integrations/pocketbase/superuser.server'))
  ;({ buildPaymentsTools } = await import('@/features/mcp-assistant/server/tool-servers/payments.server'))
})

describe('payments.server read tools (payments ledger)', () => {
  it('list_payments reads from payments ledger when records exist and calculates totals', async () => {
    const su = createFakePocketBase()
    su._seed('customers', [{ id: 'cust1', name: 'אבי לוי' }])
    su._seed('projects', [{ id: 'proj1', customer: 'cust1', title: 'שרוול יפני' }])
    su._seed('payments', [
      {
        id: 'pay1',
        project: 'proj1',
        kind: 'deposit',
        method: 'bit',
        amount: 300,
        status: 'verified',
        received_at: '2026-03-05T10:00:00.000Z',
      },
      {
        id: 'pay2',
        project: 'proj1',
        kind: 'payment',
        method: 'cash',
        amount: 1000,
        status: 'verified',
        received_at: '2026-03-05T14:00:00.000Z',
      },
      {
        id: 'pay3',
        project: 'proj1',
        kind: 'refund',
        method: 'bit',
        amount: 100,
        status: 'verified',
        received_at: '2026-03-06T10:00:00.000Z',
      },
    ])
    vi.mocked(getSuperuserClient).mockResolvedValue(su as never)

    const tools = buildPaymentsTools()
    const result = await (tools.list_payments.execute as Function)({})

    expect(result.status).toBe('success')
    expect(result.data.items).toHaveLength(3)
    expect(result.data.summary.totalCollected).toBe(1300) // 300 deposit + 1000 payment
    expect(result.data.summary.totalRefunded).toBe(100) // 100 refund
    expect(result.data.summary.netTotal).toBe(1200)
    expect(result.data.items[0].method).toBe('bit')
  })

  it('list_unpaid_deposits returns appointments without paid deposit', async () => {
    const su = createFakePocketBase()
    su._seed('customers', [{ id: 'cust1', name: 'רוני' }])
    su._seed('appointments', [
      {
        id: 'apt1',
        customer: 'cust1',
        start_time: '2026-03-10T12:00:00Z',
        duration_minutes: 180,
        deposit_paid: false,
        deposit_amount: 350,
        status: 'confirmed',
      },
      {
        id: 'apt2',
        customer: 'cust1',
        start_time: '2026-03-11T12:00:00Z',
        duration_minutes: 180,
        deposit_paid: true,
        deposit_amount: 350,
        status: 'confirmed',
      },
    ])
    vi.mocked(getSuperuserClient).mockResolvedValue(su as never)

    const tools = buildPaymentsTools()
    const result = await (tools.list_unpaid_deposits.execute as Function)({})

    expect(result.status).toBe('success')
    expect(result.data).toHaveLength(1)
    expect(result.data[0].appointmentId).toBe('apt1')
    expect(result.data[0].depositAmount).toBe(350)
  })
})
