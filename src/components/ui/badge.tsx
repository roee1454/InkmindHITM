import * as React from "react"
import { cva } from "class-variance-authority"
import type { VariantProps } from "class-variance-authority"

import { IMIcon } from "@/components/ui/icon"
import type { IMIconName } from "@/components/ui/icon"
import { cn } from "@/lib/utils"

const imBadgeVariants = cva(
  "inline-flex shrink-0 select-none items-center gap-1.5 rounded-full border border-transparent px-3 py-1.5 text-xs leading-none font-bold whitespace-nowrap [&_svg:not([class*='size-'])]:size-3",
  {
    variants: {
      // The four status roles, plus the neutral shapes. Nothing here names a hue, and no caller
      // passes a colour — `new` is an outline and `dead` a filled grey, so a brand-new lead can
      // never be mistaken for a cancelled appointment.
      variant: {
        new: "border-status-new-border text-status-new",
        wait: "bg-status-wait-soft text-status-wait",
        done: "bg-status-done-soft text-status-done",
        dead: "bg-status-dead-soft text-status-dead",
        muted: "bg-surface-2 text-muted-foreground",
        outline: "border-border text-foreground",
        // Failures only (payment failed) — never a passive state like "lost".
        destructive: "bg-destructive/12 text-destructive",
      },
    },
    defaultVariants: {
      variant: "muted",
    },
  }
)

type IMBadgeVariant = NonNullable<VariantProps<typeof imBadgeVariants>["variant"]>

export interface IMBadgeProps extends React.ComponentProps<"span"> {
  variant?: IMBadgeVariant
  /** A leading icon, `xs`, in the badge's colour. */
  icon?: IMIconName
}

/**
 * A pill that names a state or a category in one or two words. In a dense list prefer
 * IMStatusLabel — a column of pills is louder than the data.
 */
export function IMBadge({ className, variant = "muted", icon, children, ...props }: IMBadgeProps) {
  return (
    <span
      data-slot="badge"
      data-variant={variant}
      className={cn(imBadgeVariants({ variant }), className)}
      {...props}
    >
      {icon && <IMIcon name={icon} size="xs" />}
      {children}
    </span>
  )
}
