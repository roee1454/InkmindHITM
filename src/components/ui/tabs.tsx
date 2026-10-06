import * as React from "react"
import { Tabs as TabsPrimitive } from "radix-ui"

import { cn } from "@/lib/utils"

/**
 * Switch between views of the same data, in place. Up to five triggers; more becomes an IMSelect
 * or a row of IMChips. The list works without IMTabsContent too, as a segmented control.
 */
export function IMTabs({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return <TabsPrimitive.Root data-slot="tabs" className={cn("flex flex-col gap-2", className)} {...props} />
}

/** The `surface-2` rail (`radius-control`). */
export function IMTabsList({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      className={cn("inline-flex w-full select-none items-center gap-1 rounded-lg bg-surface-2 p-1", className)}
      {...props}
    />
  )
}

export interface IMTabsTriggerProps extends React.ComponentProps<typeof TabsPrimitive.Trigger> {
  /** How many items the view holds, shown after the label. */
  count?: number
}

/** A 38px trigger (`radius-inset`); the active one lifts to `card` with `shadow-raised`. */
export function IMTabsTrigger({ className, count, children, ...props }: IMTabsTriggerProps) {
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn(
        "inline-flex h-9.5 flex-1 cursor-pointer select-none items-center justify-center gap-1.5 rounded-md px-3 text-sm leading-none font-bold whitespace-nowrap text-muted-foreground outline-none transition-[background-color,color,box-shadow] duration-150 ease-native focus-visible:ring-4 focus-visible:ring-ring/35 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-card data-[state=active]:font-extrabold data-[state=active]:text-foreground data-[state=active]:shadow-xs [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      {...props}
    >
      {children}
      {count !== undefined && (
        <span
          data-slot="tabs-count"
          className="rounded-full bg-foreground/8 px-1.5 py-0.75 text-2xs leading-none font-semibold tabular-nums"
        >
          {count}
        </span>
      )}
    </TabsPrimitive.Trigger>
  )
}

export function IMTabsContent({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return <TabsPrimitive.Content data-slot="tabs-content" className={cn("flex-1 outline-none", className)} {...props} />
}
