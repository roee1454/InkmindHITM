import type { LedgerPayment } from '@/features/payments/types'
import type { PipelineProject } from '@/features/projects/types'
import type { CustomerOverview, CustomerPaymentRow } from '../types'

export interface OverviewPayment extends LedgerPayment {
  project: string
  createdAt: string
}

function paymentDate(payment: Pick<CustomerPaymentRow, 'receivedAt' | 'createdAt'>): string {
  return payment.receivedAt ?? payment.createdAt
}

/**
 * Shapes the customer card from the customer's projects (already permission-filtered by
 * buildPipeline) and their payments. A payment on a project the viewer can't see is dropped with
 * it, so an artist never learns what a colleague's piece cost.
 */
export function buildCustomerOverview(
  projects: PipelineProject[],
  payments: OverviewPayment[],
  conversationId: string | null,
): CustomerOverview {
  const titles = new Map(projects.map((p) => [p.projectId, p.title]))

  const rows: CustomerPaymentRow[] = payments
    .filter((p) => titles.has(p.project))
    .map(({ project, ...payment }) => ({ ...payment, projectId: project, projectTitle: titles.get(project) || 'ללא כותרת' }))
    .sort((a, b) => paymentDate(b).localeCompare(paymentDate(a)))

  const verified = rows.filter((p) => p.status === 'verified')
  const paid = verified.reduce((sum, p) => sum + (p.kind === 'refund' ? -p.amount : p.amount), 0)

  return {
    conversationId,
    projects,
    payments: rows,
    totals: {
      paid,
      due: projects.reduce((sum, p) => sum + p.due, 0),
      credit: projects.reduce((sum, p) => sum + p.credit, 0),
      awaitingVerification: rows.filter((p) => p.status === 'pending_verification').length,
    },
  }
}
