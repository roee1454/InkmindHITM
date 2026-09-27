import { Skeleton } from '@/components/ui/skeleton'

/** Stands in for the board while the pipeline loads — the same five lanes, so nothing jumps. */
export function ProjectsSkeleton() {
  return (
    <div dir="rtl" className="flex h-full min-h-0 gap-3 overflow-hidden p-4 font-assistant">
      {[4, 2, 3, 1, 2].map((cards, lane) => (
        <div key={lane} className="flex min-w-60 flex-1 flex-col gap-2 rounded-xl bg-muted/40 p-2">
          <Skeleton className="m-1 h-4 w-20" />
          {Array.from({ length: cards }).map((_, i) => (
            <div key={i} className="flex flex-col gap-2 rounded-lg border border-border bg-card p-3">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-3 w-1/2" />
              <Skeleton className="h-3 w-3/4" />
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}

export default ProjectsSkeleton
