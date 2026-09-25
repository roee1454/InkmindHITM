import type PocketBase from 'pocketbase'
import type { RecordModel } from 'pocketbase'
import type { AppointmentKind, AppointmentStatus } from '@/features/calendar/types'
import { computeProjectBalance } from '../utils/balance'
import type { LedgerAppointment, LedgerPayment, PaymentKind, PaymentMethod, PaymentStatus, ProjectFinance } from '../types'

function toKind(record: RecordModel): AppointmentKind {
  const kind = record.kind as string
  if (kind === 'consultation' || kind === 'session' || kind === 'touch_up') return kind
  return record.type === 'sketch' ? 'consultation' : 'session'
}

export function toLedgerAppointment(record: RecordModel): LedgerAppointment {
  return {
    id: record.id,
    kind: toKind(record),
    status: (record.status as AppointmentStatus) || 'pending',
    startTime: record.start_time as string,
    finalPrice: typeof record.final_price === 'number' && record.final_price > 0 ? record.final_price : null,
    chargeWaived: Boolean(record.charge_waived),
  }
}

export function toLedgerPayment(record: RecordModel): LedgerPayment {
  return {
    id: record.id,
    appointmentId: (record.appointment as string) || null,
    kind: record.kind as PaymentKind,
    method: record.method as PaymentMethod,
    amount: Number(record.amount) || 0,
    status: record.status as PaymentStatus,
    receivedAt: (record.received_at as string) || null,
  }
}

export async function loadProjectFinance(su: PocketBase, projectId: string): Promise<ProjectFinance> {
  const [project, appointments, payments] = await Promise.all([
    su.collection('projects').getOne(projectId),
    su.collection('appointments').getFullList({ filter: su.filter('project = {:p}', { p: projectId }), sort: 'start_time' }),
    su.collection('payments').getFullList({ filter: su.filter('project = {:p}', { p: projectId }), sort: 'created' }),
  ])
  const ledgerAppointments = appointments.map(toLedgerAppointment)
  const ledgerPayments = payments.map(toLedgerPayment)
  return {
    projectId,
    title: (project.title as string) || '',
    appointments: ledgerAppointments,
    payments: ledgerPayments,
    balance: computeProjectBalance(ledgerAppointments, ledgerPayments),
  }
}
