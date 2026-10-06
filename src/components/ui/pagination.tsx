import { IMButton } from "@/components/ui/button"
import { IMNum, IMText, IM_TYPE_ROLES } from "@/components/ui/typography"
import { cn } from "@/lib/utils"

export type IMPaginationItem = number | "ellipsis-start" | "ellipsis-end"

/**
 * The page slots to show: every page up to 7, else the first, the last, a window around the current
 * page and an ellipsis for each gap — never more than 7 slots, so the row can't overflow.
 */
export function imPaginationPages(currentPage: number, totalPages: number): IMPaginationItem[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1)
  }
  if (currentPage <= 4) {
    return [1, 2, 3, 4, 5, "ellipsis-end", totalPages]
  }
  if (currentPage >= totalPages - 3) {
    return [1, "ellipsis-start", totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages]
  }
  return [1, "ellipsis-start", currentPage - 1, currentPage, currentPage + 1, "ellipsis-end", totalPages]
}

export interface IMPaginationProps {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
  /** With it, a range summary ("מציג 11–20 מתוך 57 לקוחות") sits at the inline start. */
  totalItems?: number
  itemsPerPage?: number
  /** The plural noun of the summary. */
  itemLabel?: string
  className?: string
}

/**
 * Windowed pagination under a list: the range summary at the start; previous / pages / next at the
 * end. On phones the page chips collapse to "2 / 7". Renders nothing for a single page.
 */
export function IMPagination({
  currentPage,
  totalPages,
  onPageChange,
  totalItems,
  itemsPerPage = 10,
  itemLabel = "פריטים",
  className,
}: IMPaginationProps) {
  if (totalPages <= 1) return null

  const page = Math.min(Math.max(1, currentPage), totalPages)
  const startItem = (page - 1) * itemsPerPage + 1
  const endItem = totalItems !== undefined ? Math.min(page * itemsPerPage, totalItems) : page * itemsPerPage

  return (
    <nav
      aria-label="עימוד"
      data-slot="pagination"
      className={cn("flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3.5", className)}
    >
      {totalItems !== undefined && (
        <IMText variant="body-sm" tone="muted">
          מציג <IMNum>{startItem}–{endItem}</IMNum> מתוך <IMNum>{totalItems}</IMNum> {itemLabel}
        </IMText>
      )}

      <div className="ms-auto flex items-center gap-1">
        <IMButton
          type="button"
          variant="outline"
          size="sm"
          icon="chevron-start"
          onClick={() => onPageChange(page - 1)}
          disabled={page === 1}
          aria-label="עמוד קודם"
        >
          הקודם
        </IMButton>

        <IMText as="span" variant="label" tone="muted" numeric className="px-2 sm:hidden">
          {page} / {totalPages}
        </IMText>

        <div className="hidden items-center gap-1 px-1 sm:flex">
          {imPaginationPages(page, totalPages).map((item) =>
            typeof item === "string" ? (
              <span
                key={item}
                aria-hidden
                className={cn(IM_TYPE_ROLES.label, "grid size-8 place-items-center text-muted-foreground select-none")}
              >
                …
              </span>
            ) : (
              <button
                key={item}
                type="button"
                onClick={() => onPageChange(item)}
                aria-current={item === page ? "page" : undefined}
                aria-label={`עמוד ${item}`}
                className={cn(
                  IM_TYPE_ROLES.label,
                  "grid size-8 cursor-pointer place-items-center rounded-md border outline-none transition-[transform,background-color,color] duration-150 ease-native focus-visible:ring-4 focus-visible:ring-ring/35 active:scale-95",
                  item === page
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card text-muted-foreground hover:bg-surface-2 hover:text-foreground"
                )}
              >
                <IMNum>{item}</IMNum>
              </button>
            )
          )}
        </div>

        <IMButton
          type="button"
          variant="outline"
          size="sm"
          iconEnd="chevron-end"
          onClick={() => onPageChange(page + 1)}
          disabled={page === totalPages}
          aria-label="עמוד הבא"
        >
          הבא
        </IMButton>
      </div>
    </nav>
  )
}
