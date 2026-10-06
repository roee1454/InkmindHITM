import { describe, expect, it } from 'vitest'
import { deriveCustomerLifecycle } from '@/features/customers/utils/lifecycle'
import type { LifecycleProject } from '@/features/customers/utils/lifecycle'

const now = new Date('2026-09-25T12:00:00Z')
const project = (overrides: Partial<LifecycleProject> = {}): LifecycleProject => ({
  stage: 'inquiry',
  createdAt: '2026-09-01T10:00:00Z',
  sessionDates: [],
  ...overrides,
})
const derive = (projects: LifecycleProject[]) => deriveCustomerLifecycle(projects, now, 12)

describe('deriveCustomerLifecycle', () => {
  it('calls someone with no projects, or only inquiries, a lead', () => {
    expect(derive([])).toBe('lead')
    expect(derive([project(), project({ stage: 'lost' })])).toBe('lead')
  })

  it('calls a customer with something concrete in motion a prospect', () => {
    for (const stage of ['consultation_scheduled', 'consultation_done', 'quoted', 'booked'] as const) {
      expect(derive([project({ stage })])).toBe('prospect')
    }
  })

  it('makes a customer a client from their first session', () => {
    expect(derive([project({ stage: 'in_progress', sessionDates: ['2026-09-10T10:00:00Z'] })])).toBe('client')
    expect(derive([project({ stage: 'completed', sessionDates: ['2026-05-10T10:00:00Z'] })])).toBe('client')
  })

  it('recognises a client who came back, whether they booked yet or only asked', () => {
    const done = project({ stage: 'completed', createdAt: '2026-01-01T10:00:00Z', sessionDates: ['2026-02-01T10:00:00Z'] })
    expect(derive([done, project({ stage: 'inquiry', createdAt: '2026-09-20T10:00:00Z' })])).toBe('returning')
    expect(derive([done, project({ stage: 'completed', createdAt: '2026-05-01T10:00:00Z', sessionDates: ['2026-06-01T10:00:00Z'] })])).toBe('returning')
  })

  it('does not count an old inquiry from before the first session, or a lost one, as coming back', () => {
    const done = project({ stage: 'completed', createdAt: '2026-03-01T10:00:00Z', sessionDates: ['2026-04-01T10:00:00Z'] })
    expect(derive([done, project({ stage: 'lost', createdAt: '2026-01-01T10:00:00Z' })])).toBe('client')
    expect(derive([done, project({ stage: 'lost', createdAt: '2026-08-01T10:00:00Z' })])).toBe('client')
  })

  it('calls a client with nothing open and no session for a year dormant', () => {
    const longAgo = project({ stage: 'completed', createdAt: '2025-01-01T10:00:00Z', sessionDates: ['2025-08-01T10:00:00Z'] })
    expect(derive([longAgo])).toBe('dormant')
    expect(deriveCustomerLifecycle([longAgo], now, 18)).toBe('client')
    // Asking again wakes them up.
    expect(derive([longAgo, project({ createdAt: '2026-09-20T10:00:00Z' })])).toBe('returning')
  })
})
