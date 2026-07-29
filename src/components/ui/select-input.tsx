import * as React from "react"
import { ChevronDownIcon } from "lucide-react"
import { cn } from "#/lib/utils.ts"

function SelectInput({ className, children, ...props }: React.ComponentProps<"select">) {
  return (
    <div className="relative w-full">
      <select
        data-slot="select-input"
        className={cn(
          "flex h-10 w-full cursor-pointer appearance-none rounded-xl border border-input bg-white dark:bg-card pe-9 ps-3.5 py-2.5 font-assistant text-sm text-foreground shadow-xs transition-all outline-none disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
          "focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20",
          "aria-invalid:border-destructive aria-invalid:ring-destructive/20",
          className
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDownIcon className="pointer-events-none absolute end-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground opacity-60" />
    </div>
  )
}

export { SelectInput }
