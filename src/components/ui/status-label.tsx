import { cn } from '@/lib/utils'

/** DESIGN.md's four status roles, plus the two reserved for money and failures. */
export type StatusRole = 'new' | 'wait' | 'done' | 'dead' | 'warning' | 'danger'

const DOT: Record<StatusRole, string> = {
  new: 'border border-status-new',
  wait: 'bg-accent-ink',
  done: 'bg-status-done',
  dead: 'bg-status-dead',
  warning: 'bg-warning',
  danger: 'bg-destructive',
}

/**
 * A state in words: a small dot in the role's colour and the label in ordinary text. Not a pill —
 * the colour sits in the dot only, so a list of them reads as text, and there is no chip to nest
 * inside a row.
 */
export function StatusLabel({ role, children, className }: { role: StatusRole; children: string; className?: string }) {
  return (
    <span className={cn('inline-flex shrink-0 items-center gap-1.5 text-xs font-semibold text-foreground/85', className)}>
      <span aria-hidden className={cn('size-2 shrink-0 rounded-full', DOT[role])} />
      {children}
    </span>
  )
}

export { StatusLabel as IMStatusLabel }
