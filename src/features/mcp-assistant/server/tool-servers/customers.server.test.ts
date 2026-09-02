import { beforeAll, describe, expect, it, vi } from 'vitest'
import { createFakePocketBase } from '@/test-utils/fakePocketBase'
import type { getSuperuserClient as GetSuperuserClient } from '@/integrations/pocketbase/superuser.server'
import type { commitCustomersAction as CommitCustomersAction } from './customers.server'

vi.mock('@/integrations/pocketbase/superuser.server', () => ({
  getSuperuserClient: vi.fn(),
}))

let getSuperuserClient: typeof GetSuperuserClient
let commitCustomersAction: typeof CommitCustomersAction

beforeAll(async () => {
  ;({ getSuperuserClient } = await import('@/integrations/pocketbase/superuser.server'))
  ;({ commitCustomersAction } = await import('./customers.server'))
})

describe('commitCustomersAction — add_customer_note', () => {
  it('prepends a dated header and preserves existing notes beneath it', async () => {
    const su = createFakePocketBase()
    su._seed('customers', [{ id: 'cust1', notes: 'הערה ישנה' }])
    vi.mocked(getSuperuserClient).mockResolvedValue(su as never)

    await commitCustomersAction('add_customer_note', { customerId: 'cust1', note: 'התקשרה לגבי מועד' })

    const updated = su._dump('customers')[0]!
    expect(updated.notes as string).toContain('התקשרה לגבי מועד')
    expect(updated.notes as string).toContain('הערה ישנה')
    // New note comes first (most recent on top).
    expect((updated.notes as string).indexOf('התקשרה לגבי מועד')).toBeLessThan((updated.notes as string).indexOf('הערה ישנה'))
  })

  it('works when there are no existing notes yet', async () => {
    const su = createFakePocketBase()
    su._seed('customers', [{ id: 'cust1', notes: '' }])
    vi.mocked(getSuperuserClient).mockResolvedValue(su as never)
    await commitCustomersAction('add_customer_note', { customerId: 'cust1', note: 'ראשונה' })
    expect(su._dump('customers')[0]!.notes as string).toContain('ראשונה')
  })

  it('throws for an unknown tool name', async () => {
    await expect(commitCustomersAction('not_a_real_tool', {})).rejects.toThrow('Unknown customers action')
  })
})
