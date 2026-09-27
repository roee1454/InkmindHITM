import { cn } from '#/lib/utils.ts'

export interface Stat {
  label: string
  value: string | number
  /** One short line of what the number counts; omit when the label already says it. */
  hint?: string
}

interface StatStripProps {
  stats: Stat[]
  className?: string
}

/**
 * A row of headline numbers in one container, separated by hairlines (track-b B6.9). It replaces
 * the grid of identical bordered tiles — one card per number — which DESIGN.md bans by name: the
 * numbers belong to one summary, so they share one surface.
 *
 * The 1px `gap` over a `bg-border` container draws the dividers, so they stay right whether the
 * strip lays out as one row or wraps to two on a phone.
 */
export function StatStrip({ stats, className }: StatStripProps) {
  return (
    <div
      dir="rtl"
      className={cn(
        'grid gap-px overflow-hidden rounded-xl border border-border bg-border font-assistant',
        stats.length === 4 ? 'grid-cols-2 lg:grid-cols-4' : 'grid-cols-3',
        className,
      )}
    >
      {stats.map((stat) => (
        <div key={stat.label} className="flex flex-col gap-1 bg-card px-4 py-3.5 sm:px-5 sm:py-4">
          <span className="text-xs font-bold text-muted-foreground">{stat.label}</span>
          <span className="text-2xl font-extrabold tracking-tight text-foreground tabular-nums sm:text-3xl">{stat.value}</span>
          {stat.hint && <span className="text-2xs font-medium text-muted-foreground">{stat.hint}</span>}
        </div>
      ))}
    </div>
  )
}
