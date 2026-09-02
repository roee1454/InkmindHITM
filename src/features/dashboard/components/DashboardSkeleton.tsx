import { Skeleton } from '@/components/ui/skeleton'

function StatTileSkeleton() {
  return (
    <div className="flex flex-col justify-center gap-1.5 rounded-2xl border border-border/80 bg-card p-3.5 shadow-2xs sm:p-5 lg:rounded-3xl lg:p-6">
      <Skeleton className="h-7 w-12 sm:h-9 sm:w-16 lg:h-10 lg:w-20" />
      <Skeleton className="h-3.5 w-16 sm:h-4 sm:w-24" />
    </div>
  )
}

function DashboardCardSkeleton() {
  return (
    <div className="card-native flex flex-col">
      <div className="flex items-center justify-between gap-3 px-5 pt-4 pb-3">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-8" />
      </div>
      {[0, 1, 2].map((i) => (
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
  )
}

/** Stands in for `MetricsSummary` + `RecentLeadsCard` + `CloseAppointmentsCard` while
 *  `['dashboardData']` is loading — same grid structure as `DashboardHome` so nothing jumps. */
export function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-[18px] lg:gap-6">
      <div className="grid grid-cols-3 gap-3 lg:gap-4">
        <StatTileSkeleton />
        <StatTileSkeleton />
        <StatTileSkeleton />
      </div>
      <div className="grid grid-cols-1 gap-[18px] lg:grid-cols-2 lg:gap-6">
        <DashboardCardSkeleton />
        <DashboardCardSkeleton />
      </div>
    </div>
  )
}

export default DashboardSkeleton
