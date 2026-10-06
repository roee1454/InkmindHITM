import { describe, expect, it } from 'vitest'
import { buildPipeline, daysInStage } from '@/features/projects/utils/pipeline'
import type { PipelineInput } from '@/features/projects/utils/pipeline'

const now = new Date('2026-09-25T12:00:00Z')
const admin = { id: 'owner1', role: 'owner' }

function input(overrides: Partial<PipelineInput> = {}): PipelineInput {
  return {
    projects: [
      { id: 'p1', customer: 'c1', title: 'שרוול', stage: 'in_progress', stageChangedAt: '2026-09-20T10:00:00Z', primaryStaff: 'artist1', quoteMin: 4500, quoteMax: 6000, estimatedSessions: 3, lostReason: null, lostNote: null },
      { id: 'p2', customer: 'c2', title: 'ורד', stage: 'lost', stageChangedAt: '2026-09-01T10:00:00Z', primaryStaff: null, quoteMin: null, quoteMax: null, estimatedSessions: null, lostReason: 'price', lostNote: 'יקר' },
    ],
    customers: [
      { id: 'c1', name: 'דנה', phone: '+972521111111', source: 'instagram', updatedAt: '2026-09-20T10:00:00Z' },
      { id: 'c2', name: 'יוסי', phone: '+972522222222', source: null, updatedAt: '2026-09-02T10:00:00Z' },
      { id: 'c3', name: null, phone: '+972523333333', source: 'whatsapp', updatedAt: '2026-09-24T10:00:00Z' },
    ],
    conversations: [
      { id: 'conv1', customer: 'c1', assignedStaff: 'artist1' },
      { id: 'conv3', customer: 'c3', assignedStaff: 'artist2' },
    ],
    appointments: [
      { id: 'a1', project: 'p1', staff: 'artist1', kind: 'session', status: 'completed', startTime: '2026-09-10T10:00:00Z', finalPrice: 2000, chargeWaived: false },
      { id: 'a2', project: 'p1', staff: 'artist1', kind: 'session', status: 'confirmed', startTime: '2026-10-20T10:00:00Z', finalPrice: null, chargeWaived: false },
      { id: 'a3', project: 'p1', staff: 'artist1', kind: 'session', status: 'confirmed', startTime: '2026-10-05T10:00:00Z', finalPrice: null, chargeWaived: false },
    ],
    payments: [{ id: 'pay1', project: 'p1', appointmentId: 'a1', kind: 'deposit', method: 'bit', amount: 500, status: 'verified', receivedAt: null }],
    staffNames: { artist1: 'נועה' },
    ...overrides,
  }
}

describe('buildPipeline', () => {
  it('describes each project: customer, stage, artist, next appointment and balance', () => {
    const { projects } = buildPipeline(input(), admin, now)

    expect(projects[0]).toEqual({
      projectId: 'p1',
      title: 'שרוול',
      stage: 'in_progress',
      stageChangedAt: '2026-09-20T10:00:00Z',
      customerId: 'c1',
      customerName: 'דנה',
      customerPhone: '+972521111111',
      source: 'instagram',
      conversationId: 'conv1',
      staffId: 'artist1',
      staffName: 'נועה',
      quoteMin: 4500,
      quoteMax: 6000,
      nextAppointmentAt: '2026-10-05T10:00:00Z',
      sessionsDone: 1,
      estimatedSessions: 3,
      lastSessionAt: '2026-09-10T10:00:00Z',
      lostReason: null,
      lostNote: null,
      due: 1500,
      credit: 0,
    })
    expect(projects[1]).toMatchObject({ projectId: 'p2', stage: 'lost', lostReason: 'price', conversationId: null, nextAppointmentAt: null })
  })

  it('lists customers who never asked to book separately', () => {
    expect(buildPipeline(input(), admin, now).leadsWithoutProject).toEqual([
      { customerId: 'c3', name: null, phone: '+972523333333', source: 'whatsapp', conversationId: 'conv3', updatedAt: '2026-09-24T10:00:00Z' },
    ])
  })

  it('shows an artist their own, unassigned and appointment-linked projects only', () => {
    const artist2 = buildPipeline(input(), { id: 'artist2', role: 'staff' }, now)
    expect(artist2.projects.map((p) => p.projectId)).toEqual(['p2'])
    expect(artist2.leadsWithoutProject.map((l) => l.customerId)).toEqual(['c3'])

    const artist3 = buildPipeline(input(), { id: 'artist3', role: 'staff' }, now)
    expect(artist3.leadsWithoutProject).toEqual([])
  })

  it('falls back to the artist of the next appointment and ignores unknown values', () => {
    const { projects } = buildPipeline(
      input({
        projects: [{ id: 'p1', customer: 'c1', title: '', stage: 'bogus', stageChangedAt: null, primaryStaff: null, quoteMin: null, quoteMax: null, estimatedSessions: null, lostReason: 'weird', lostNote: null }],
      }),
      admin,
      now,
    )
    expect(projects[0]).toMatchObject({ stage: 'inquiry', staffId: 'artist1', lostReason: null })
  })

  it('skips projects whose customer is gone', () => {
    expect(buildPipeline(input({ customers: [] }), admin, now).projects).toEqual([])
  })
})

describe('daysInStage', () => {
  it('counts whole days, never negative, and knows when it cannot tell', () => {
    expect(daysInStage('2026-09-20T13:00:00Z', now)).toBe(4)
    expect(daysInStage('2026-09-30T10:00:00Z', now)).toBe(0)
    expect(daysInStage(null, now)).toBeNull()
    expect(daysInStage('not a date', now)).toBeNull()
  })
})

describe('project formatting', async () => {
  const { formatQuote, formatShortSlot } = await import('@/features/projects/utils/format')

  it('formats a quote range, a single price, or nothing', () => {
    expect(formatQuote(null, null)).toBeNull()
    expect(formatQuote(1500, 1500)).toBe(formatQuote(1500, null))
    expect(formatQuote(4500, 6000)).toMatch(/4,500.*6,000/)
  })

  it('isolates a range left-to-right so it reads low→high inside Hebrew text', () => {
    const range = formatQuote(4500, 6000)!
    expect(range.startsWith('⁦')).toBe(true)
    expect(range.endsWith('⁩')).toBe(true)
    // A single price needs no isolate — there's nothing to reorder.
    expect(formatQuote(1500, 1500)).not.toContain('⁦')
  })

  it('formats a slot compactly and tolerates bad input', () => {
    expect(formatShortSlot('2026-10-05T11:00:00')).toBe('ב׳ 5.10 · 11:00')
    expect(formatShortSlot('nope')).toBe('')
  })
})
