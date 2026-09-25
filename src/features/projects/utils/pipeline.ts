import { computeProjectBalance } from '@/features/payments/utils/balance'
import type { LedgerAppointment, LedgerPayment } from '@/features/payments/types'
import { LOST_REASONS } from '../types'
import type { LeadWithoutProject, LostReason, PipelineData, PipelineProject } from '../types'
import { projectStageOf } from './labels'

export interface PipelineInput {
  projects: {
    id: string
    customer: string
    title: string
    stage: string
    stageChangedAt: string | null
    primaryStaff: string | null
    quoteMin: number | null
    quoteMax: number | null
    lostReason: string | null
    lostNote: string | null
  }[]
  customers: { id: string; name: string | null; phone: string; source: string | null; updatedAt: string }[]
  conversations: { id: string; customer: string; assignedStaff: string | null }[]
  /** Ledger view plus what the pipeline needs to place and permission an appointment. */
  appointments: (LedgerAppointment & { project: string; staff: string | null })[]
  payments: (LedgerPayment & { project: string })[]
  staffNames: Record<string, string>
}

export interface PipelineViewer {
  id: string
  role: string
}

function groupBy<T>(items: T[], key: (item: T) => string): Map<string, T[]> {
  const groups = new Map<string, T[]>()
  for (const item of items) {
    const list = groups.get(key(item)) ?? []
    list.push(item)
    groups.set(key(item), list)
  }
  return groups
}

function lostReasonOf(value: string | null): LostReason | null {
  return LOST_REASONS.find((reason) => reason === value) ?? null
}

/**
 * The leads board: every project with where it stands, who it's with, what's next and what's owed,
 * plus the customers who never asked to book. Artists see projects that are theirs, unassigned, or
 * that have an appointment with them; owners and admins see everything.
 */
export function buildPipeline(input: PipelineInput, viewer: PipelineViewer, now: Date): PipelineData {
  const isAdmin = viewer.role === 'owner' || viewer.role === 'admin'
  const customers = new Map(input.customers.map((c) => [c.id, c]))
  const conversationByCustomer = new Map(input.conversations.map((c) => [c.customer, c]))
  const appointmentsByProject = groupBy(input.appointments, (a) => a.project)
  const paymentsByProject = groupBy(input.payments, (p) => p.project)
  const nowMs = now.getTime()

  const projects: PipelineProject[] = []
  for (const project of input.projects) {
    const customer = customers.get(project.customer)
    if (!customer) continue
    const appointments = appointmentsByProject.get(project.id) ?? []
    const visible =
      isAdmin || !project.primaryStaff || project.primaryStaff === viewer.id || appointments.some((a) => a.staff === viewer.id)
    if (!visible) continue

    const next = appointments
      .filter((a) => (a.status === 'pending' || a.status === 'confirmed') && new Date(a.startTime).getTime() > nowMs)
      .sort((a, b) => a.startTime.localeCompare(b.startTime))[0]
    const staffId = project.primaryStaff ?? next?.staff ?? null
    const balance = computeProjectBalance(appointments, paymentsByProject.get(project.id) ?? [])

    projects.push({
      projectId: project.id,
      title: project.title,
      stage: projectStageOf(project.stage),
      stageChangedAt: project.stageChangedAt,
      customerId: customer.id,
      customerName: customer.name,
      customerPhone: customer.phone,
      source: customer.source,
      conversationId: conversationByCustomer.get(customer.id)?.id ?? null,
      staffId,
      staffName: staffId ? (input.staffNames[staffId] ?? null) : null,
      quoteMin: project.quoteMin,
      quoteMax: project.quoteMax,
      nextAppointmentAt: next?.startTime ?? null,
      lostReason: lostReasonOf(project.lostReason),
      lostNote: project.lostNote,
      due: balance.due,
      credit: balance.credit,
    })
  }
  projects.sort((a, b) => (b.stageChangedAt ?? '').localeCompare(a.stageChangedAt ?? ''))

  const withProject = new Set(input.projects.map((p) => p.customer))
  const leadsWithoutProject: LeadWithoutProject[] = input.customers
    .filter((c) => !withProject.has(c.id))
    .filter((c) => {
      if (isAdmin) return true
      const assigned = conversationByCustomer.get(c.id)?.assignedStaff ?? null
      return !assigned || assigned === viewer.id
    })
    .map((c) => ({ customerId: c.id, name: c.name, phone: c.phone, source: c.source, conversationId: conversationByCustomer.get(c.id)?.id ?? null, updatedAt: c.updatedAt }))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))

  return { projects, leadsWithoutProject }
}

/** Whole days a project has been in its current stage; null when unknown. */
export function daysInStage(stageChangedAt: string | null, now: Date): number | null {
  if (!stageChangedAt) return null
  const changed = new Date(stageChangedAt).getTime()
  if (Number.isNaN(changed)) return null
  return Math.max(0, Math.floor((now.getTime() - changed) / 86_400_000))
}
