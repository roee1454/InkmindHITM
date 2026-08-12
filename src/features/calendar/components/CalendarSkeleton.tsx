import { Skeleton } from '@/components/ui/skeleton'

/** Stands in for `CalendarGrid` while appointments are loading — same outer card shape (header
 *  bar + grid body) so the skeleton→content swap doesn't jump. */
export function CalendarSkeleton() {
  return (
    <div className="overflow-hidden rounded-3xl border border-border/80 bg-card shadow-sm font-assistant">
      <div className="flex items-center justify-between gap-2 border-b border-border/60 px-3 py-3 lg:px-4">
        <Skeleton className="size-11 rounded-2xl" />
        <Skeleton className="h-5 w-32" />
        <Skeleton className="size-11 rounded-2xl" />
      </div>
      <div className="grid grid-cols-7 gap-2 p-3 lg:p-4">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="flex flex-col gap-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-16 w-full rounded-xl" />
            <Skeleton className="h-16 w-full rounded-xl" />
          </div>
        ))}
      </div>
    </div>
  )
}

export default CalendarSkeleton
