import { describe, expect, it } from 'vitest'
import { summarizeProject } from '@/features/projects/utils/panel'
import type { ProjectDetails } from '@/features/projects/types'
import type { ProjectFinance } from '@/features/payments/types'

const now = new Date('2026-09-28T12:00:00')

function details(overrides: Partial<ProjectDetails> = {}): ProjectDetails {
  return {
    id: 'p1', title: 'שרוול', stage: 'in_progress', stageChangedAt: null, lostReason: null, lostNote: null, quoteMin: null, quoteMax: null,
    estimatedSessions: 3, customer: { id: 'c1', name: 'דנה', phone: '' }, canManage: true, otherProjects: [], reschedules: [],
    timeline: [
      { id: 's2', kind: 'session', status: 'confirmed', date: '2026-10-05', timeSlot: '11:00', projectPosition: null },
      { id: 's1', kind: 'session', status: 'completed', date: '2026-09-10', timeSlot: '11:00', projectPosition: null },
      { id: 'c', kind: 'consultation', status: 'completed', date: '2026-08-01', timeSlot: '16:00', projectPosition: null },
      { id: 's3', kind: 'session', status: 'pending', date: '2026-10-20', timeSlot: '11:00', projectPosition: null },
      { id: 'x', kind: 'session', status: 'cancelled', date: '2026-10-01', timeSlot: '11:00', projectPosition: null },
    ],
    ...overrides,
  }
}

describe('summarizeProject', () => {
  it('orders appointments oldest first and marks the first upcoming live one as next', () => {
    const summary = summarizeProject(details(), undefined, now)
    expect(summary.appointments.map((a) => a.id)).toEqual(['c', 's1', 'x', 's2', 's3'])
    expect(summary.next?.id).toBe('s2')
    expect(summary.appointments.filter((a) => a.isNext).map((a) => a.id)).toEqual(['s2'])
  })

  it('counts completed sessions only — a consultation is not a session', () => {
    expect(summarizeProject(details(), undefined, now).sessionsDone).toBe(1)
  })

  it('folds in what each session was charged and its latest reschedule', () => {
    const finance = {
      appointments: [{ id: 's1', kind: 'session', status: 'completed', startTime: '', finalPrice: 1800, chargeWaived: false }],
    } as unknown as ProjectFinance
    const summary = summarizeProject(
      details({
        reschedules: [
          { appointmentId: 's2', fromStart: '2026-10-03T11:00:00', toStart: '2026-10-05T11:00:00', actor: 'customer', at: '2026-09-27' },
          { appointmentId: 's2', fromStart: '2026-10-01T11:00:00', toStart: '2026-10-03T11:00:00', actor: 'staff', at: '2026-09-20' },
        ],
      }),
      finance,
      now,
    )
    const byId = new Map(summary.appointments.map((a) => [a.id, a]))
    expect(byId.get('s1')?.finalPrice).toBe(1800)
    expect(byId.get('s2')?.movedFrom).toEqual({ start: '2026-10-03T11:00:00', actor: 'customer' })
    expect(byId.get('s3')?.movedFrom).toBeNull()
  })

  it('has no next appointment once everything is in the past', () => {
    expect(summarizeProject(details(), undefined, new Date('2027-01-01')).next).toBeNull()
  })
})
