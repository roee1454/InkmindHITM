import * as React from "react"

import { IMIcon } from "@/components/ui/icon"
import { imControlClasses, imControlHeight, imControlText } from "@/components/ui/input"
import { cn } from "@/lib/utils"

export type IMSelectInputProps = React.ComponentProps<"select">

/**
 * A native `<select>` styled as IMInput — only where the OS picker beats a popover: long numeric
 * ranges on phones. Everything else is IMSelect.
 */
export function IMSelectInput({ className, children, dir = "rtl", ...props }: IMSelectInputProps) {
  return (
    <div className="relative w-full">
      <select
        data-slot="select-input"
        dir={dir}
        className={cn(
          "flex cursor-pointer appearance-none ps-4 pe-10",
          imControlClasses,
          imControlHeight,
          imControlText,
          className
        )}
        {...props}
      >
        {children}
      </select>
      <IMIcon name="chevron-down" size="sm" tone="muted" className="pointer-events-none absolute end-3.5 top-1/2 -translate-y-1/2" />
    </div>
  )
}
