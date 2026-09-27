import { Skeleton } from '@/components/ui/skeleton'

/** Stands in for the grid while appointments load — the same hour gutter plus seven day columns,
 *  so the skeleton→content swap doesn't jump (track-b B6.8: full-bleed, no outer card). */
export function CalendarSkeleton() {
  return (
    <div dir="rtl" className="min-h-0 flex-1 overflow-hidden font-assistant">
      <div className="flex border-b border-border">
        <div className="w-14 shrink-0" />
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="flex-1 border-s border-border px-2 py-2">
            <Skeleton className="h-5 w-16 rounded-lg" />
          </div>
        ))}
      </div>

      <div className="flex">
        <div className="w-14 shrink-0">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="flex h-16 items-start justify-center border-b border-border pt-1">
              <Skeleton className="h-3 w-8" />
            </div>
          ))}
        </div>

        {Array.from({ length: 7 }).map((_, day) => (
          <div key={day} className="flex-1 border-s border-border">
            {Array.from({ length: 9 }).map((__, hour) => (
              <div key={hour} className="h-16 border-b border-border p-1">
                {(day + hour) % 4 === 0 && <Skeleton className="h-full w-full rounded-lg" />}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

export default CalendarSkeleton
