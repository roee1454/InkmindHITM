import { phoneMatchesQuery } from '@/lib/phone'
import type { PipelineProject } from '@/features/projects/types'
import type { Customer } from '../types'
import type { CustomerLifecycle } from './lifecycle'

/** What the list says about a customer's work, from the same projects the board and the card read. */
export interface CustomerWork {
  sessionsDone: number
  lastSessionAt: string | null
  nextAppointmentAt: string | null
  due: number
}

const NO_WORK: CustomerWork = { sessionsDone: 0, lastSessionAt: null, nextAppointmentAt: null, due: 0 }

const later = (a: string | null, b: string | null) => (a && b ? (a > b ? a : b) : (a ?? b))
const sooner = (a: string | null, b: string | null) => (a && b ? (a < b ? a : b) : (a ?? b))

export function summarizeCustomerProjects(projects: PipelineProject[]): Map<string, CustomerWork> {
  const byCustomer = new Map<string, CustomerWork>()
  for (const p of projects) {
    const work = byCustomer.get(p.customerId) ?? NO_WORK
    byCustomer.set(p.customerId, {
      sessionsDone: work.sessionsDone + p.sessionsDone,
      lastSessionAt: later(work.lastSessionAt, p.lastSessionAt),
      nextAppointmentAt: sooner(work.nextAppointmentAt, p.nextAppointmentAt),
      due: work.due + p.due,
    })
  }
  return byCustomer
}

export const workOf = (byCustomer: Map<string, CustomerWork>, customerId: string): CustomerWork => byCustomer.get(customerId) ?? NO_WORK

export type CustomerSort = 'recent' | 'name' | 'owes'

export const CUSTOMER_SORT_LABELS: Record<CustomerSort, string> = {
  recent: 'עודכנו לאחרונה',
  name: 'שם',
  owes: 'יתרה פתוחה',
}

export function matchesCustomerSearch(customer: Customer, query: string): boolean {
  const term = query.trim().toLowerCase()
  if (!term) return true
  return Boolean(customer.name?.toLowerCase().includes(term) || phoneMatchesQuery(customer.phone, term) || customer.email?.toLowerCase().includes(term))
}

export function sortCustomers(customers: Customer[], byCustomer: Map<string, CustomerWork>, sort: CustomerSort): Customer[] {
  const sorted = [...customers]
  if (sort === 'name') return sorted.sort((a, b) => (a.name || '￿').localeCompare(b.name || '￿', 'he'))
  if (sort === 'owes') return sorted.sort((a, b) => workOf(byCustomer, b.id).due - workOf(byCustomer, a.id).due || b.updatedAt.localeCompare(a.updatedAt))
  return sorted.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
}

export function lifecycleCounts(customers: Customer[]): Map<CustomerLifecycle, number> {
  const counts = new Map<CustomerLifecycle, number>()
  for (const c of customers) counts.set(c.lifecycle, (counts.get(c.lifecycle) ?? 0) + 1)
  return counts
}
