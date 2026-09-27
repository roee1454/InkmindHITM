import { Skeleton } from '@/components/ui/skeleton'

function StatSkeleton() {
  return (
    <div className="flex flex-col gap-1.5 bg-card px-4 py-3.5 sm:px-5 sm:py-4">
      <Skeleton className="h-3.5 w-16" />
      <Skeleton className="h-8 w-12" />
    </div>
  )
}

function DashboardCardSkeleton() {
  return (
    <div className="card-native flex h-65 flex-col overflow-hidden sm:h-84">
      <div className="flex items-center justify-between gap-3 px-5 pt-4 pb-3">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-8" />
      </div>
      <div className="min-h-0 flex-1 divide-y divide-border/60 overflow-hidden">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="row-native">
            <Skeleton className="size-[42px] shrink-0 rounded-full" />
            <div className="min-w-0 flex-1 space-y-1.5">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-3 w-1/3" />
            </div>
            <Skeleton className="h-6 w-16 shrink-0 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  )
}

/** Stands in for `MetricsSummary` + `RecentLeadsCard` + `CloseAppointmentsCard` while
 *  `['dashboardData']` is loading — same grid structure as `DashboardHome` so nothing jumps. */
export function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-[18px] lg:gap-6">
      <div className="grid grid-cols-3 gap-px overflow-hidden rounded-xl border border-border bg-border">
        <StatSkeleton />
        <StatSkeleton />
        <StatSkeleton />
      </div>
      <div className="grid grid-cols-1 gap-[18px] lg:grid-cols-2 lg:gap-6">
        <DashboardCardSkeleton />
        <DashboardCardSkeleton />
      </div>
    </div>
  )
}

export default DashboardSkeleton
