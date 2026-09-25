import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "#/lib/utils.ts"

const badgeVariants = cva(
  "inline-flex shrink-0 select-none items-center gap-1.5 rounded-full px-3 py-1.5 font-assistant text-xs leading-none font-bold whitespace-nowrap [&_svg:not([class*='size-'])]:size-3.5",
  {
    variants: {
      // The four status roles, plus the neutral shapes. Nothing here names a hue, and no
      // caller passes a colour — `new` is an outline and `dead` is a filled grey, so a
      // brand-new lead can never be mistaken for a cancelled appointment.
      variant: {
        new: "border border-status-new-border text-status-new",
        wait: "bg-accent-soft text-accent-ink",
        done: "bg-status-done-soft text-status-done",
        dead: "bg-status-dead-soft text-status-dead",
        default: "bg-accent-soft text-accent-ink",
        muted: "bg-muted text-muted-foreground",
        outline: "border border-border text-foreground",
        // Reserved for destructive *actions*, never a passive state.
        destructive: "bg-destructive/10 text-destructive",
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
