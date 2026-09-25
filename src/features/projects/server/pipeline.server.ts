import type PocketBase from 'pocketbase'
import type { RecordModel } from 'pocketbase'
import { toLedgerAppointment, toLedgerPayment } from '@/features/payments/server/project-finance.server'
import { buildPipeline } from '../utils/pipeline'
import type { PipelineViewer } from '../utils/pipeline'
import type { PipelineData } from '../types'

function text(value: unknown): string | null {
  return typeof value === 'string' && value ? value : null
}

function positive(value: unknown): number | null {
  return typeof value === 'number' && value > 0 ? value : null
}

/** Loads everything the leads board shows; the shaping and permissions live in buildPipeline. */
export async function loadPipeline(su: PocketBase, viewer: PipelineViewer, now: Date): Promise<PipelineData> {
  const [projects, customers, conversations, appointments, payments, staff] = await Promise.all([
    su.collection('projects').getFullList(),
    su.collection('customers').getFullList({ fields: 'id,name,phone,source,updated' }),
    su.collection('conversations').getFullList({ fields: 'id,customer,assigned_staff' }),
    su.collection('appointments').getFullList({ filter: "project != ''" }),
    su.collection('payments').getFullList(),
    su.collection('staff').getFullList({ fields: 'id,name' }),
  ])

  return buildPipeline(
    {
      projects: projects.map((p: RecordModel) => ({
        id: p.id,
        customer: p.customer as string,
        title: (p.title as string) || '',
        stage: (p.stage as string) || '',
        stageChangedAt: text(p.stage_changed_at),
        primaryStaff: text(p.primary_staff),
        quoteMin: positive(p.quote_min),
        quoteMax: positive(p.quote_max),
        lostReason: text(p.lost_reason),
        lostNote: text(p.lost_note),
      })),
      customers: customers.map((c) => ({ id: c.id, name: text(c.name), phone: (c.phone as string) || '', source: text(c.source), updatedAt: c.updated as string })),
      conversations: conversations.map((c) => ({ id: c.id, customer: c.customer as string, assignedStaff: text(c.assigned_staff) })),
      appointments: appointments.map((a) => ({ ...toLedgerAppointment(a), project: a.project as string, staff: text(a.staff) })),
      payments: payments.map((p) => ({ ...toLedgerPayment(p), project: p.project as string })),
      staffNames: Object.fromEntries(staff.map((s) => [s.id, (s.name as string) || ''])),
    },
    viewer,
    now,
  )
}
