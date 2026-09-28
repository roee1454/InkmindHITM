import type PocketBase from 'pocketbase'
import { toLedgerPayment } from '@/features/payments/server/project-finance.server'
import { toPipelineInputAppointment, toPipelineInputProject, toStaffNames } from '@/features/projects/server/pipeline.server'
import { buildPipeline } from '@/features/projects/utils/pipeline'
import type { PipelineViewer } from '@/features/projects/utils/pipeline'
import { buildCustomerOverview } from '../utils/customer-overview'
import type { CustomerOverview } from '../types'

/**
 * One customer's slice of the pipeline plus their payments. It reuses buildPipeline on purpose:
 * the card's project rows are then the same rows the projects board shows — stage, balance,
 * session count and the artist-visibility rule included — instead of a second copy of that logic.
 */
export async function loadCustomerOverview(
  su: PocketBase,
  viewer: PipelineViewer,
  customerId: string,
  now: Date,
): Promise<CustomerOverview> {
  const byCustomer = su.filter('customer = {:c}', { c: customerId })
  const [customer, projects, conversations, appointments, payments, staff] = await Promise.all([
    su.collection('customers').getOne(customerId, { fields: 'id,name,phone,source,updated' }),
    su.collection('projects').getFullList({ filter: byCustomer }),
    su.collection('conversations').getFullList({ filter: byCustomer, fields: 'id,customer,assigned_staff', sort: '-updated' }),
    su.collection('appointments').getFullList({ filter: su.filter('project.customer = {:c}', { c: customerId }) }),
    su.collection('payments').getFullList({ filter: su.filter('project.customer = {:c}', { c: customerId }) }),
    su.collection('staff').getFullList({ fields: 'id,name' }),
  ])

  const latest = conversations[0]
  const ledgerPayments = payments.map((p) => ({ ...toLedgerPayment(p), project: p.project as string, createdAt: p.created as string }))

  const { projects: rows } = buildPipeline(
    {
      projects: projects.map(toPipelineInputProject),
      customers: [{ id: customer.id, name: (customer.name as string) || null, phone: (customer.phone as string) || '', source: (customer.source as string) || null, updatedAt: customer.updated as string }],
      // The latest conversation only: buildPipeline keeps one per customer, and the card links to the live one.
      conversations: latest ? [{ id: latest.id, customer: customerId, assignedStaff: (latest.assigned_staff as string) || null }] : [],
      appointments: appointments.map(toPipelineInputAppointment),
      payments: ledgerPayments,
      staffNames: toStaffNames(staff),
    },
    viewer,
    now,
  )

  return buildCustomerOverview(rows, ledgerPayments, latest?.id ?? null)
}
