import * as React from "react"
import { cn } from "#/lib/utils.ts"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex min-h-[76px] w-full rounded-2xl border border-input/80 bg-card px-4 py-3 font-assistant text-base leading-relaxed text-foreground shadow-xs transition-all duration-150 ease-native outline-none placeholder:text-muted-foreground/50 disabled:cursor-not-allowed disabled:opacity-50 md:text-[15px]",
        "focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-primary/10",
        "aria-invalid:border-destructive aria-invalid:ring-4 aria-invalid:ring-destructive/10",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
