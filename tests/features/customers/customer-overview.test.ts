import { describe, expect, it } from 'vitest'
import { buildCustomerOverview } from '@/features/customers/utils/customer-overview'
import type { OverviewPayment } from '@/features/customers/utils/customer-overview'
import type { PipelineProject } from '@/features/projects/types'

function project(id: string, title: string, money: Partial<Pick<PipelineProject, 'due' | 'credit'>> = {}): PipelineProject {
  return {
    projectId: id, title, stage: 'in_progress', stageChangedAt: null, customerId: 'c1', customerName: 'דנה', customerPhone: '+972521111111',
    source: null, conversationId: null, staffId: null, staffName: null, quoteMin: null, quoteMax: null, nextAppointmentAt: null,
    sessionsDone: 0, estimatedSessions: null, lastSessionAt: null, lostReason: null, lostNote: null, due: 0, credit: 0, ...money,
  }
}

function payment(id: string, projectId: string, extra: Partial<OverviewPayment> = {}): OverviewPayment {
  return { id, project: projectId, appointmentId: null, kind: 'payment', method: 'cash', amount: 100, status: 'verified', receivedAt: null, createdAt: '2026-09-01T10:00:00Z', ...extra }
}

describe('buildCustomerOverview', () => {
  it('lists payments newest first, each with the piece it paid for', () => {
    const overview = buildCustomerOverview(
      [project('p1', 'שרוול'), project('p2', '')],
      [
        payment('old', 'p1', { createdAt: '2026-08-01T10:00:00Z' }),
        payment('received', 'p2', { receivedAt: '2026-09-10T10:00:00Z', createdAt: '2026-07-01T10:00:00Z' }),
        payment('new', 'p1', { createdAt: '2026-09-05T10:00:00Z' }),
      ],
      'conv1',
    )
    expect(overview.payments.map((p) => [p.id, p.projectTitle])).toEqual([
      ['received', 'ללא כותרת'],
      ['new', 'שרוול'],
      ['old', 'שרוול'],
    ])
    expect(overview.conversationId).toBe('conv1')
  })

  it('totals what was paid net of refunds, counting only verified money', () => {
    const { totals } = buildCustomerOverview(
      [project('p1', 'שרוול', { due: 300, credit: 0 }), project('p2', 'ורד', { due: 0, credit: 150 })],
      [
        payment('a', 'p1', { amount: 500, kind: 'deposit' }),
        payment('b', 'p1', { amount: 200, kind: 'refund' }),
        payment('c', 'p1', { amount: 900, status: 'pending_verification' }),
        payment('d', 'p2', { amount: 400, status: 'rejected' }),
      ],
      null,
    )
    expect(totals).toEqual({ paid: 300, due: 300, credit: 150, awaitingVerification: 1 })
  })

  it('drops payments on projects the viewer cannot see', () => {
    const overview = buildCustomerOverview([project('p1', 'שרוול')], [payment('mine', 'p1'), payment('colleague', 'hidden', { amount: 5000 })], null)
    expect(overview.payments.map((p) => p.id)).toEqual(['mine'])
    expect(overview.totals.paid).toBe(100)
  })
})
