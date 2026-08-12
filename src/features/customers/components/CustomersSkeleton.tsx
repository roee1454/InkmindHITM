import { Skeleton } from '@/components/ui/skeleton'

/** Stands in for the customer list (`.card-native` of `CustomerCard` rows) while loading. */
export function CustomersSkeleton() {
  return (
    <div className="card-native overflow-hidden">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="row-native">
          <Skeleton className="size-[42px] shrink-0 rounded-full" />
          <div className="min-w-0 flex-1 space-y-1.5">
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-3 w-1/3" />
          </div>
          <Skeleton className="size-[18px] shrink-0 rounded" />
        </div>
      ))}
    </div>
  )
}

export default CustomersSkeleton
