import { SearchInput } from '@/components/ui/search-input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { CUSTOMER_LIFECYCLE_LABELS } from '../utils/lifecycle'
import type { CustomerLifecycle } from '../utils/lifecycle'
import { CUSTOMER_SORT_LABELS } from '../utils/customer-list'
import type { CustomerSort } from '../utils/customer-list'

export type LifecycleFilter = CustomerLifecycle | 'all'

const ORDER: CustomerLifecycle[] = ['lead', 'prospect', 'client', 'returning', 'dormant']

interface CustomersToolbarProps {
  search: string
  onSearchChange: (query: string) => void
  filter: LifecycleFilter
  onFilterChange: (filter: LifecycleFilter) => void
  counts: Map<CustomerLifecycle, number>
  total: number
  sort: CustomerSort
  onSortChange: (sort: CustomerSort) => void
}

/** Search, where the customer stands (with how many are there — empty stages don't show), and the order. */
export function CustomersToolbar({ search, onSearchChange, filter, onFilterChange, counts, total, sort, onSortChange }: CustomersToolbarProps) {
  const segments: { id: LifecycleFilter; label: string; count: number }[] = [
    { id: 'all', label: 'הכל', count: total },
    ...ORDER.filter((id) => (counts.get(id) ?? 0) > 0 || id === filter).map((id) => ({ id, label: CUSTOMER_LIFECYCLE_LABELS[id], count: counts.get(id) ?? 0 })),
  ]

  return (
    <div className="flex flex-col gap-3" dir="rtl">
      <div className="flex items-center gap-2">
        <SearchInput containerClassName="min-w-0 flex-1" size="sm" variant="card" placeholder="חיפוש שם, טלפון או אימייל" value={search} onChange={onSearchChange} />
        <Select value={sort} onValueChange={(value) => onSortChange(value as CustomerSort)}>
          <SelectTrigger size="sm" aria-label="מיון" className="w-40 shrink-0 data-[size=sm]:h-10">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(CUSTOMER_SORT_LABELS).map(([id, label]) => (
              <SelectItem key={id} value={id}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div role="group" aria-label="סינון לפי שלב" className="flex gap-1 self-start overflow-x-auto rounded-xl bg-muted p-1 scrollbar-none max-w-full">
        {segments.map((segment) => (
          <button
            key={segment.id}
            type="button"
            aria-pressed={filter === segment.id}
            onClick={() => onFilterChange(segment.id)}
            className={cn(
              'flex h-8 shrink-0 cursor-pointer items-center gap-1.5 rounded-lg px-3 text-sm font-semibold transition-colors duration-150 select-none',
              filter === segment.id ? 'bg-background text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {segment.label}
            <span className="text-xs tabular-nums text-muted-foreground">{segment.count}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
