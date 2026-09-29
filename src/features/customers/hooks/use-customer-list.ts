import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import { listPipeline } from '@/features/projects/server/pipeline'
import { customersQueryOptions } from '../utils/customers-query'
import { lifecycleCounts, matchesCustomerSearch, sortCustomers, summarizeCustomerProjects, workOf } from '../utils/customer-list'
import type { CustomerSort } from '../utils/customer-list'
import type { LifecycleFilter } from '../components/CustomersToolbar'
import { useCustomersUiStore } from '../store/customersUiStore'

export const CUSTOMERS_PER_PAGE = 12

/** The customers list as the page shows it: filtered, sorted, paged, each with what the board says about their work. */
export function useCustomerList() {
  const { searchQuery, currentPage, setCurrentPage } = useCustomersUiStore()
  const [filter, setFilter] = useState<LifecycleFilter>('all')
  const [sort, setSort] = useState<CustomerSort>('recent')

  const customers = useQuery(customersQueryOptions())
  const pipeline = useQuery({ queryKey: queryKeys.pipeline, queryFn: () => listPipeline(), staleTime: 30_000 })

  const all = customers.data
  const work = useMemo(() => summarizeCustomerProjects(pipeline.data?.projects ?? []), [pipeline.data])
  const searched = useMemo(() => (all ?? []).filter((c) => matchesCustomerSearch(c, searchQuery)), [all, searchQuery])
  const counts = useMemo(() => lifecycleCounts(searched), [searched])
  const visible = useMemo(
    () => sortCustomers(searched.filter((c) => filter === 'all' || c.lifecycle === filter), work, sort),
    [searched, filter, sort, work],
  )

  const totalPages = Math.max(1, Math.ceil(visible.length / CUSTOMERS_PER_PAGE))
  const page = Math.min(currentPage, totalPages)

  return {
    customers: all ?? [],
    isLoading: customers.isLoading,
    error: customers.error,
    rows: visible.slice((page - 1) * CUSTOMERS_PER_PAGE, page * CUSTOMERS_PER_PAGE).map((customer) => ({ customer, work: workOf(work, customer.id) })),
    matching: visible.length,
    searchedTotal: searched.length,
    counts,
    filter,
    setFilter: (next: LifecycleFilter) => {
      setFilter(next)
      setCurrentPage(1)
    },
    sort,
    setSort: (next: CustomerSort) => {
      setSort(next)
      setCurrentPage(1)
    },
    page,
    totalPages,
    setPage: setCurrentPage,
    searchQuery,
  }
}
