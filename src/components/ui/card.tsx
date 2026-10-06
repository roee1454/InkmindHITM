import * as React from "react"
import { Slot } from "radix-ui"

import { IMText, IMTitle } from "@/components/ui/typography"
import type { IMHeadingShortcutProps, IMTextProps } from "@/components/ui/typography"
import { cn } from "@/lib/utils"

type IMCardVariant = "default" | "flush"

export interface IMCardProps extends React.ComponentProps<"div"> {
  /** `flush` — the card is a list: its content drops the padding and stacks IMListRows. */
  variant?: IMCardVariant
}

/**
 * The one raised surface. A card never sits inside a card: inside one, group with spacing, a
 * `border` hairline or a `surface-2` block.
 */
export function IMCard({ className, variant = "default", ...props }: IMCardProps) {
  return (
    <div
      data-slot="card"
      data-variant={variant}
      className={cn(
        "group/card flex flex-col rounded-xl border border-border bg-card text-card-foreground shadow-xs",
        className
      )}
      {...props}
    />
  )
}

/** Title and description in the first column; an IMCardAction, when present, at the inline end. */
export function IMCardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        "grid auto-rows-min items-start gap-x-3 gap-y-0.5 px-4 pt-5 has-data-[slot=card-action]:grid-cols-[minmax(0,1fr)_auto] lg:px-6",
        className
      )}
      {...props}
    />
  )
}

/** IMTitle (17/700), an `<h2>` by default; `as` sets the outline level. */
export function IMCardTitle(props: IMHeadingShortcutProps) {
  return <IMTitle data-slot="card-title" {...props} />
}

/** The `body-sm` role, muted. */
export function IMCardDescription(props: Omit<IMTextProps, "variant" | "numeric">) {
  return <IMText data-slot="card-description" variant="body-sm" tone="muted" {...props} />
}

export function IMCardAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-action"
      className={cn("col-start-2 row-span-2 row-start-1 self-start justify-self-end", className)}
      {...props}
    />
  )
}

export function IMCardContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-content"
      className={cn(
        "flex flex-col gap-3 px-4 pt-4 pb-6 first:pt-6 lg:px-6",
        "group-data-[variant=flush]/card:gap-0 group-data-[variant=flush]/card:px-0 group-data-[variant=flush]/card:pt-2 group-data-[variant=flush]/card:pb-0 group-data-[variant=flush]/card:first:pt-0",
        className
      )}
      {...props}
    />
  )
}

/** Actions at the inline end, under a hairline. One primary at most. */
export function IMCardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn("flex items-center justify-end gap-2 border-t border-border px-4 py-3.5 lg:px-6", className)}
      {...props}
    />
  )
}

export interface IMListRowProps extends React.ComponentProps<"div"> {
  /** Render the single child (a `<button>` or router `<Link>`) as the row; it gets the pressed state. */
  asChild?: boolean
}

/**
 * One row of a list, usually inside an `IMCard variant="flush"`: leading media, a `min-w-0 flex-1`
 * text column, trailing meta. Rows are separated by hairlines; the first has none.
 */
export function IMListRow({ className, asChild = false, ...props }: IMListRowProps) {
  const Comp = asChild ? Slot.Root : "div"
  return (
    <Comp
      data-slot="list-row"
      className={cn(
        "flex w-full items-center gap-3 border-t border-border/60 px-4 py-3 text-start first:border-t-0",
        asChild &&
          "cursor-pointer select-none outline-none transition-colors duration-100 hover:bg-surface-2/60 focus-visible:bg-surface-2 active:bg-surface-2",
        className
      )}
      {...props}
    />
  )
}
