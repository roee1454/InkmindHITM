import { Link } from '@tanstack/react-router'
import { Skeleton } from '@/components/ui/skeleton'
import type { StageCount } from '../utils/home'

/**
 * Where the work stands, left to right through the funnel: the same counts as the leads page and
 * the projects board, each one a way into it. One strip, hairline-divided — not a tile per number.
 */
export function PipelineStrip({ stages, isLoading }: { stages: StageCount[]; isLoading: boolean }) {
  return (
    <section aria-label="איפה העבודה עומדת" className="flex flex-col gap-2.5">
      <h2 className="px-1 text-base font-extrabold text-foreground">איפה העבודה עומדת</h2>
      <div className="grid grid-cols-3 gap-px overflow-hidden rounded-xl border border-border bg-border lg:grid-cols-6">
        {isLoading
          ? Array.from({ length: 6 }, (_, i) => (
              <div key={i} className="flex flex-col gap-2 bg-card px-4 py-3.5">
                <Skeleton className="h-3.5 w-14" />
                <Skeleton className="h-7 w-8" />
              </div>
            ))
          : stages.map((stage) => (
              <Link
                key={stage.id}
                to={stage.to}
                className="flex flex-col gap-1 bg-card px-4 py-3.5 transition-colors duration-150 hover:bg-muted/60 focus-visible:bg-muted/60 focus-visible:outline-none"
              >
                <span className="text-xs font-bold text-muted-foreground">{stage.label}</span>
                <span className="text-2xl font-extrabold tracking-tight text-foreground tabular-nums">{stage.count}</span>
              </Link>
            ))}
      </div>
    </section>
  )
}
