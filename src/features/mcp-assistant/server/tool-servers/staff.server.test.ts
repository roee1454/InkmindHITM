import { beforeAll, describe, expect, it, vi } from 'vitest'
import { createFakePocketBase } from '@/test-utils/fakePocketBase'
import type { getSuperuserClient as GetSuperuserClient } from '@/integrations/pocketbase/superuser.server'
import type { buildStaffTools as BuildStaffTools } from './staff.server'

vi.mock('@/integrations/pocketbase/superuser.server', () => ({
  getSuperuserClient: vi.fn(),
}))

let getSuperuserClient: typeof GetSuperuserClient
let buildStaffTools: typeof BuildStaffTools

beforeAll(async () => {
  ;({ getSuperuserClient } = await import('@/integrations/pocketbase/superuser.server'))
  ;({ buildStaffTools } = await import('./staff.server'))
})

async function callListStaff(query?: string) {
  const su = createFakePocketBase()
  su._seed('staff', [
    { id: 'staff1', name: 'רועי', role: 'owner', active: true },
    { id: 'staff2', name: 'דנה', role: 'staff', active: true },
    { id: 'staff3', name: 'נועה', role: 'staff', active: false },
  ])
  vi.mocked(getSuperuserClient).mockResolvedValue(su as never)
  const tools = buildStaffTools()
  return (tools.list_staff as unknown as { execute: (input: unknown) => Promise<{ data: unknown }> }).execute({
    query,
  })
}

// Regression guard for the bug where the assistant had no way to resolve a staff member's name
// to a `staffId`, and instead asked the owner directly for a PocketBase record id they have no
// way of knowing — mirrors the WhatsApp customer bot's `suggest_artists` anti-hallucination gate.
describe('list_staff', () => {
  it('returns every staff member with a resolvable staffId when no query is given', async () => {
    const result = (await callListStaff()) as { data: Array<{ staffId: string; name: string }> }
    expect(result.data).toHaveLength(3)
    expect(result.data.map((r) => r.staffId)).toEqual(['staff1', 'staff2', 'staff3'])
  })

  it('filters by name substring, case-insensitively', async () => {
    const result = (await callListStaff('דנה')) as { data: Array<{ name: string }> }
    expect(result.data).toHaveLength(1)
    expect(result.data[0]).toMatchObject({ name: 'דנה' })
  })

  it('still resolves the right person from a partial/typo name (fuzzy match)', async () => {
    // Dropped letter ("רוי" instead of "רועי") — the exact kind of imperfect input that used to
    // return zero results with a plain substring check.
    const result = (await callListStaff('רוי')) as { data: Array<{ name: string }> }
    expect(result.data).toHaveLength(1)
    expect(result.data[0]).toMatchObject({ name: 'רועי' })
  })

  it('returns no results for a name that matches nobody', async () => {
    const result = (await callListStaff('xyz123')) as { data: unknown[] }
    expect(result.data).toHaveLength(0)
  })

  it('surfaces the active flag and a Hebrew role label', async () => {
    const result = (await callListStaff()) as { data: Array<{ role: string; roleLabel: string; active: boolean }> }
    expect(result.data[0]).toMatchObject({ role: 'owner', roleLabel: 'בעלים', active: true })
    expect(result.data[2]).toMatchObject({ active: false })
  })
})
