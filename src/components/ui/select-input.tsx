import * as React from "react"
import { ChevronDownIcon } from "lucide-react"
import { cn } from "#/lib/utils.ts"

function SelectInput({ className, children, dir = "rtl", ...props }: React.ComponentProps<"select">) {
  return (
    <div className="relative w-full">
      <select
        data-slot="select-input"
        dir={dir}
        className={cn(
          "flex h-12 w-full cursor-pointer appearance-none rounded-2xl border border-input/80 bg-card pe-10 ps-4 font-assistant text-base text-foreground shadow-xs transition-all duration-150 ease-native outline-none disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:h-11 md:text-[15px]",
          "focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-primary/10",
          "aria-invalid:border-destructive aria-invalid:ring-4 aria-invalid:ring-destructive/10",
          className
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDownIcon className="pointer-events-none absolute end-3.5 top-1/2 size-[18px] -translate-y-1/2 text-muted-foreground opacity-60" />
    </div>
  )
}

export { SelectInput }
