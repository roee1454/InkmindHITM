import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "#/lib/utils.ts"

const badgeVariants = cva(
  "inline-flex shrink-0 select-none items-center gap-1.5 rounded-full px-3 py-1.5 font-assistant text-[12.5px] leading-none font-bold whitespace-nowrap [&_svg:not([class*='size-'])]:size-3.5",
  {
    variants: {
      variant: {
        default: "bg-primary/10 text-primary",
        success: "bg-emerald-500/12 text-emerald-600",
        warning: "bg-amber-500/12 text-amber-600",
        destructive: "bg-rose-500/10 text-rose-600",
        muted: "bg-muted text-muted-foreground",
        outline: "border border-border/80 text-foreground",
      },
    },
    defaultVariants: {
      variant: "muted",
    },
  }
)

function Badge({
  className,
  variant = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "span"

  return (
    <Comp
      data-slot="badge"
      data-variant={variant}
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
