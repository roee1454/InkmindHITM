import { IMButton } from "@/components/ui/button"
import { ChevronLeft, ChevronRight } from "@/components/ui/icon"
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
        <p className="text-sm font-medium text-muted-foreground">
          מציג <span className="tabular-nums">{startItem}–{endItem}</span> מתוך{" "}
          <span className="tabular-nums">{totalItems}</span> {itemLabel}
        </p>
      )}

      <div className="ms-auto flex items-center gap-1">
        {/* Phase 1b: icon="chevron-start" / iconEnd="chevron-end" — the registry mirrors them for RTL. */}
        <IMButton
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onPageChange(page - 1)}
          disabled={page === 1}
          aria-label="עמוד קודם"
        >
          <ChevronRight />
          הקודם
        </IMButton>

        <span dir="ltr" className="px-2 text-sm font-bold text-muted-foreground tabular-nums sm:hidden">
          {page} / {totalPages}
        </span>

        <div className="hidden items-center gap-1 px-1 sm:flex">
          {imPaginationPages(page, totalPages).map((item) =>
            typeof item === "string" ? (
              <span
                key={item}
                aria-hidden
                className="grid size-8 place-items-center text-sm font-bold text-muted-foreground select-none"
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
                  "grid size-8 cursor-pointer place-items-center rounded-md border text-sm font-bold tabular-nums outline-none transition-[transform,background-color,color] duration-150 ease-native focus-visible:ring-4 focus-visible:ring-ring/35 active:scale-95",
                  item === page
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card text-muted-foreground hover:bg-surface-2 hover:text-foreground"
                )}
              >
                {item}
              </button>
            )
          )}
        </div>

        <IMButton
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onPageChange(page + 1)}
          disabled={page === totalPages}
          aria-label="עמוד הבא"
        >
          הבא
          <ChevronLeft />
        </IMButton>
      </div>
    </nav>
  )
}
