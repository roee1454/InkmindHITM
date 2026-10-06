import * as React from "react"
import { Label as LabelPrimitive } from "radix-ui"

import { cn } from "@/lib/utils"

export type IMLabelProps = React.ComponentProps<typeof LabelPrimitive.Root>

/** The visible label of a form control (the `label` text role, 13.5/700). Wire it with `htmlFor`, or use IMField. */
export function IMLabel({ className, ...props }: IMLabelProps) {
  return (
    <LabelPrimitive.Root
      data-slot="label"
      className={cn(
        "flex select-none items-center gap-1 ps-1 text-sm font-bold text-foreground group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50 peer-disabled:cursor-not-allowed peer-disabled:opacity-50",
        className
      )}
      {...props}
    />
  )
}
