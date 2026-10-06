import { cn } from "@/lib/utils"

/** The four status roles, plus the two reserved for "needs attention soon" and failures. */
export type IMStatusRole = "new" | "wait" | "done" | "dead" | "warning" | "danger"

const DOT: Record<IMStatusRole, string> = {
  new: "border-[1.5px] border-status-new",
  wait: "bg-status-wait",
  done: "bg-status-done",
  dead: "bg-status-dead",
  warning: "bg-warning",
  danger: "bg-destructive",
}

export interface IMStatusLabelProps {
  role: IMStatusRole
  /** One to three words. */
  children: string
  className?: string
}

/**
 * A state in words: a small dot in the role's colour and the label in ordinary text. Not a pill —
 * the colour sits in the dot only, so a column of them reads as text and there is no chip to nest
 * inside a row. Use IMBadge where the state is the headline.
 */
export function IMStatusLabel({ role, children, className }: IMStatusLabelProps) {
  return (
    <span
      data-slot="status-label"
      data-role={role}
      className={cn("inline-flex shrink-0 items-center gap-1.5 text-xs font-semibold whitespace-nowrap text-foreground/85", className)}
    >
      <span aria-hidden className={cn("size-2 shrink-0 rounded-full", DOT[role])} />
      {children}
    </span>
  )
}
