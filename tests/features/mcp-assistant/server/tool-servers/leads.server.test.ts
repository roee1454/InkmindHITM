import { beforeAll, describe, expect, it, vi } from 'vitest'
import type { getSuperuserClient as GetSuperuserClient } from '@/integrations/pocketbase/superuser.server'
import type { listLeads as ListLeads } from '@/features/leads/server/leads'
import type { buildLeadsTools as BuildLeadsTools } from '@/features/mcp-assistant/server/tool-servers/leads.server'
import type { McpToolContext } from '@/features/mcp-assistant/server/tool-servers/shared'

vi.mock('@/integrations/pocketbase/superuser.server', () => ({
  getSuperuserClient: vi.fn(),
}))
vi.mock('@/features/leads/server/leads', () => ({
  listLeads: vi.fn(),
  moveLead: vi.fn(),
}))
vi.mock('@/features/leads/utils/permissions', () => ({
  canEditLead: vi.fn().mockReturnValue(true),
}))

let getSuperuserClient: typeof GetSuperuserClient
let listLeads: typeof ListLeads
let buildLeadsTools: typeof BuildLeadsTools

beforeAll(async () => {
  ;({ getSuperuserClient } = await import('@/integrations/pocketbase/superuser.server'))
  ;({ listLeads } = await import('@/features/leads/server/leads'))
  ;({ buildLeadsTools } = await import('@/features/mcp-assistant/server/tool-servers/leads.server'))
})

const LEADS = [
  { id: 'cust1', conversationId: null, name: 'רועי כהן', phone: '+972500000001', stage: 'NEW' as const, source: null, assignedStaffId: null, createdAt: '', updatedAt: '' },
  { id: 'cust2', conversationId: null, name: 'דנה לוי', phone: '+972500000002', stage: 'AWAITING_APPOINTMENT' as const, source: null, assignedStaffId: null, createdAt: '', updatedAt: '' },
  { id: 'cust3', conversationId: null, name: 'נועה', phone: '+972599999999', stage: 'NEW' as const, source: null, assignedStaffId: null, createdAt: '', updatedAt: '' },
]

async function callSearchLeads(input: { query?: string; stage?: 'NEW' | 'WANTS_TO_BOOK' | 'COLLECTING_INFO' | 'WAITLIST' | 'AWAIT_PRICE_OFFER' | 'AWAIT_HEALTH_NOTICE' | 'AWAIT_PAYMENT' | 'AWAIT_FINAL_CONFIRMATION' | 'AWAITING_APPOINTMENT' | 'AWAIT_NPS_SCORE' | 'COMPLETED' }) {
  vi.mocked(listLeads).mockResolvedValue(LEADS)
  vi.mocked(getSuperuserClient).mockResolvedValue(undefined as never)
  const ctx = { su: undefined, staff: undefined, proposals: [] } as unknown as McpToolContext
  const tools = buildLeadsTools(ctx)
  return (tools.search_leads as unknown as { execute: (input: unknown) => Promise<{ data: unknown[] }> }).execute(input)
}

describe('search_leads', () => {
  it('returns everyone when no query is given', async () => {
    const result = await callSearchLeads({})
    expect(result.data).toHaveLength(3)
  })

  it('resolves a partial/typo name (fuzzy match) instead of returning nothing', async () => {
    const result = (await callSearchLeads({ query: 'רוע' })) as { data: Array<{ name: string }> }
    expect(result.data).toHaveLength(1)
    expect(result.data[0]).toMatchObject({ name: 'רועי כהן' })
  })

  it('also matches by phone substring even when the name does not match at all', async () => {
    const result = (await callSearchLeads({ query: '9999' })) as { data: Array<{ name: string }> }
    expect(result.data).toHaveLength(1)
    expect(result.data[0]).toMatchObject({ name: 'נועה' })
  })

  it('filters by stage', async () => {
    const result = (await callSearchLeads({ stage: 'AWAITING_APPOINTMENT' })) as { data: Array<{ name: string }> }
    expect(result.data).toHaveLength(1)
    expect(result.data[0]).toMatchObject({ name: 'דנה לוי' })
  })
})
