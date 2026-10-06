import * as React from "react"

import { cn } from "@/lib/utils"

export interface IMChipProps extends React.ComponentProps<"button"> {
  /** The chip's on/off state (`aria-pressed`): a chosen preset, an active filter. */
  selected?: boolean
  /** How many items the choice holds, shown after the label. */
  count?: number
}

/**
 * One choice in a row of toggleable options — filter chips, quick presets, a deposit amount. A
 * control (`radius-control`, 40px); the selected one fills with `primary`. Up to five mutually
 * exclusive views of the same data are IMTabs instead; a state label is an IMBadge.
 */
export function IMChip({ className, selected = false, count, children, type = "button", ...props }: IMChipProps) {
  return (
    <button
      type={type}
      data-slot="chip"
      aria-pressed={selected}
      className={cn(
        "inline-flex h-10 shrink-0 cursor-pointer select-none items-center justify-center gap-1.5 rounded-lg border px-3.5 text-sm leading-none font-bold whitespace-nowrap outline-none transition-[transform,background-color,color,border-color] duration-150 ease-native active:scale-97 focus-visible:ring-4 focus-visible:ring-ring/35 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        selected
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-card text-muted-foreground shadow-xs hover:bg-surface-2 hover:text-foreground",
        className
      )}
      {...props}
    >
      {children}
      {count !== undefined && (
        <span data-slot="chip-count" className="text-2xs font-semibold tabular-nums opacity-80">
          {count}
        </span>
      )}
    </button>
  )
}
