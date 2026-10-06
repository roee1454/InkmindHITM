import type * as React from "react"
import { cn } from "@/lib/utils"

/**
 * The loading state: a `surface-2` block in the exact shape of the content it stands in for, so
 * nothing jumps when the data lands. Never "טוען…" as text. The pulse stops under reduced motion.
 */
export function IMSkeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn("animate-pulse rounded-md bg-surface-2 motion-reduce:animate-none", className)}
      {...props}
    />
  )
}
