import React from 'react'
import { Button } from '@/components/ui/button'
import { CUSTOMER_LIFECYCLE_LABELS } from '../utils/lifecycle'
import type { CustomerLifecycle } from '../utils/lifecycle'

export type LifecycleFilter = CustomerLifecycle | 'all'

const FILTERS: LifecycleFilter[] = ['all', 'lead', 'prospect', 'client', 'returning', 'dormant']

interface CustomersSummaryProps {
  totalCustomers: number
  filter: LifecycleFilter
  onFilterChange: (filter: LifecycleFilter) => void
}

/** Count of the visible customers and a filter by where they stand with the studio. */
export const CustomersSummary: React.FC<CustomersSummaryProps> = ({ totalCustomers, filter, onFilterChange }) => {
  return (
    <div className="flex flex-col gap-2 px-1 font-assistant sm:flex-row sm:items-center sm:gap-3" dir="rtl">
      <span className="shrink-0 text-sm font-extrabold text-muted-foreground">{totalCustomers} לקוחות</span>
      <div className="flex gap-1.5 overflow-x-auto scrollbar-none" role="group" aria-label="סינון לפי שלב">
        {FILTERS.map((option) => (
          <Button
            key={option}
            type="button"
            size="sm"
            variant={filter === option ? 'default' : 'outline'}
            aria-pressed={filter === option}
            className="h-8 rounded-full px-3 text-xs"
            onClick={() => onFilterChange(option)}
          >
            {option === 'all' ? 'הכול' : CUSTOMER_LIFECYCLE_LABELS[option]}
          </Button>
        ))}
      </div>
    </div>
  )
}

export default CustomersSummary
