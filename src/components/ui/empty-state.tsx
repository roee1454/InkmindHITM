import type * as React from "react"

import { IMIcon } from "@/components/ui/icon"
import type { IMIconName } from "@/components/ui/icon"
import { IMText, IMTitle } from "@/components/ui/typography"
import { cn } from "@/lib/utils"

export interface IMEmptyStateProps extends Omit<React.ComponentProps<"div">, "title"> {
  /** The missing thing (`users`, `kanban`, `chat`), not a generic inbox. Drawn `xl`, muted, in a disc. */
  icon: IMIconName
  /** Why it's empty: "עדיין אין פרויקטים", "אין לקוחות שמתאימים". */
  title: React.ReactNode
  /** One sentence: what to do next. */
  description?: React.ReactNode
  /** At most one: create the first one, or clear the filter. */
  action?: React.ReactNode
}

/**
 * What a data view shows when it has nothing to show: an icon in a `surface-2` disc, a title, one
 * muted sentence and at most one action. Every data view has one, next to its IMSkeleton.
 */
export function IMEmptyState({ icon, title, description, action, className, ...props }: IMEmptyStateProps) {
  return (
    <div
      data-slot="empty-state"
      className={cn("flex flex-col items-center gap-2.5 px-5 py-8 text-center", className)}
      {...props}
    >
      <div className="mb-1 grid size-16 place-items-center rounded-full bg-surface-2">
        <IMIcon name={icon} size="xl" tone="muted" />
      </div>
      {/* A paragraph, not a heading: an empty state isn't a section of the page outline. */}
      <IMTitle as="p">{title}</IMTitle>
      {description && (
        <IMText variant="body-sm" tone="muted" className="max-w-[32ch] text-pretty">
          {description}
        </IMText>
      )}
      {action && <div className="pt-1.5">{action}</div>}
    </div>
  )
}
