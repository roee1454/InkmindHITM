import { Skeleton } from '@/components/ui/skeleton'
import { COLUMNS } from '../types'

const CARD_HEIGHTS = ['h-24', 'h-28', 'h-20']

export function LeadsBoardSkeleton() {
  return (
    <div className="scrollbar-none flex flex-1 snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-4 lg:snap-none lg:gap-4 lg:px-0">
      {COLUMNS.map((col) => (
        <div
          key={col.stage}
          // Must match LeadColumn's width or the skeleton→content swap visibly jumps.
          className="flex h-full w-[calc(100%-22px)] shrink-0 snap-center flex-col rounded-[20px] border border-border/80 bg-muted/40 lg:w-[236px]"
        >
          <div className="flex items-center justify-between gap-2 border-b border-border/60 p-3">
            <Skeleton className="h-6 w-20 rounded-full" />
            <Skeleton className="h-4 w-4 rounded-full" />
          </div>
          <div className="flex-1 space-y-2.5 p-3">
            {CARD_HEIGHTS.map((height, i) => (
              <Skeleton key={i} className={`w-full rounded-2xl ${height}`} />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
