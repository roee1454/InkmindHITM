import { Skeleton } from '@/components/ui/skeleton'

function StatTileSkeleton() {
  return (
    <div className="stat-native lg:p-[22px]">
      <Skeleton className="size-[34px] shrink-0 rounded-[12px] lg:size-10" />
      <div className="flex flex-col gap-1.5">
        <Skeleton className="h-6 w-10 lg:h-9" />
        <Skeleton className="h-3 w-14" />
      </div>
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
