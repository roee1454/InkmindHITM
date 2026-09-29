import type { ReactNode } from 'react'
import { ChevronLeft } from '@/components/ui/icon'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

interface HomeSectionProps {
  title: string
  /** A plain count after the title: "3". */
  count?: number
  children: ReactNode
  className?: string
}

/** One block of the home screen: a title, and a card of rows under it. */
export function HomeSection({ title, count, children, className }: HomeSectionProps) {
  return (
    <section aria-label={title} className={cn('flex min-w-0 flex-col gap-2.5', className)}>
      <h2 className="flex items-baseline gap-2 px-1 text-base font-extrabold text-foreground">
        {title}
        {count !== undefined && count > 0 && <span className="text-sm font-bold text-muted-foreground tabular-nums">{count}</span>}
      </h2>
      <div className="card-native overflow-hidden">{children}</div>
    </section>
  )
}

interface HomeRowProps {
  onClick: () => void
  title: string
  detail: ReactNode
  /** Leads the row: a time, an attention dot. */
  lead?: ReactNode
  /** Trails the row: a status word, a time. */
  trail?: ReactNode
}

/** A row that goes straight to the thing it names — the conversation, the project, the appointment. */
export function HomeRow({ onClick, title, detail, lead, trail }: HomeRowProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full cursor-pointer items-center gap-3 border-t border-border/70 px-4 py-3 text-start transition-colors duration-150 first:border-t-0 hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:outline-none sm:px-5"
    >
      {lead}
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate text-sm font-bold text-foreground">{title}</span>
        <span className="truncate text-sm text-muted-foreground">{detail}</span>
      </span>
      {trail}
      <ChevronLeft size={16} className="shrink-0 text-muted-foreground" />
    </button>
  )
}

/** A quiet link row closing a capped list: "עוד 4 שיחות". */
export function HomeMoreRow({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full cursor-pointer border-t border-border/70 px-4 py-2.5 text-start text-sm font-semibold text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground sm:px-5"
    >
      {label}
    </button>
  )
}

export function HomeRowsSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-4 px-4 py-4 sm:px-5" aria-hidden>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex flex-col gap-2">
          <Skeleton className="h-4 w-2/5" />
          <Skeleton className="h-3.5 w-3/5" />
        </div>
      ))}
    </div>
  )
}

/** What an empty block says: the fact, then what will show up here. */
export function HomeEmpty({ title, hint }: { title: string; hint: string }) {
  return (
    <div className="flex flex-col gap-1 px-4 py-6 sm:px-5">
      <p className="text-sm font-bold text-foreground">{title}</p>
      <p className="text-sm text-muted-foreground">{hint}</p>
    </div>
  )
}
