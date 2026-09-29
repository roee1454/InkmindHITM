import { describe, expect, it } from 'vitest'
import { lifecycleCounts, matchesCustomerSearch, sortCustomers, summarizeCustomerProjects, workOf } from '@/features/customers/utils/customer-list'
import type { Customer } from '@/features/customers/types'
import type { PipelineProject } from '@/features/projects/types'

const customer = (id: string, fields: Partial<Customer> = {}): Customer => ({
  id,
  name: id,
  phone: '0501234567',
  email: null,
  source: null,
  isVip: false,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
  lifecycle: 'client',
  ...fields,
})

const project = (customerId: string, fields: Partial<PipelineProject>): PipelineProject =>
  ({ customerId, sessionsDone: 0, lastSessionAt: null, nextAppointmentAt: null, due: 0, ...fields }) as PipelineProject

describe('summarizeCustomerProjects', () => {
  it('adds up a customer across their projects: sessions and balance, latest session, soonest next', () => {
    const work = summarizeCustomerProjects([
      project('a', { sessionsDone: 2, lastSessionAt: '2026-05-01', nextAppointmentAt: '2026-10-09', due: 300 }),
      project('a', { sessionsDone: 1, lastSessionAt: '2026-08-01', nextAppointmentAt: '2026-10-02', due: 200 }),
    ])
    expect(workOf(work, 'a')).toEqual({ sessionsDone: 3, lastSessionAt: '2026-08-01', nextAppointmentAt: '2026-10-02', due: 500 })
    expect(workOf(work, 'nobody')).toEqual({ sessionsDone: 0, lastSessionAt: null, nextAppointmentAt: null, due: 0 })
  })
})

describe('sortCustomers', () => {
  const customers = [customer('b', { name: 'בני', updatedAt: '2026-02-01' }), customer('a', { name: 'אבי', updatedAt: '2026-03-01' }), customer('n', { name: null, updatedAt: '2026-04-01' })]
  const work = summarizeCustomerProjects([project('b', { due: 900 })])

  it('orders by recency, by name (nameless last), or by what is owed', () => {
    expect(sortCustomers(customers, work, 'recent').map((c) => c.id)).toEqual(['n', 'a', 'b'])
    expect(sortCustomers(customers, work, 'name').map((c) => c.id)).toEqual(['a', 'b', 'n'])
    expect(sortCustomers(customers, work, 'owes').map((c) => c.id)).toEqual(['b', 'n', 'a'])
  })
})

describe('search and counts', () => {
  it('matches name, phone or email', () => {
    expect(matchesCustomerSearch(customer('x', { name: 'נועה' }), 'נוע')).toBe(true)
    expect(matchesCustomerSearch(customer('x', { email: 'A@B.com' }), 'a@b')).toBe(true)
    expect(matchesCustomerSearch(customer('x'), '')).toBe(true)
    expect(matchesCustomerSearch(customer('x', { name: 'נועה' }), 'דני')).toBe(false)
  })

  it('counts customers per stage', () => {
    const counts = lifecycleCounts([customer('a'), customer('b'), customer('c', { lifecycle: 'lead' })])
    expect(counts.get('client')).toBe(2)
    expect(counts.get('lead')).toBe(1)
    expect(counts.get('dormant')).toBeUndefined()
  })
})
