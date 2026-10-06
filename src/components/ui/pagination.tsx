import React from 'react'
import { ChevronRight, ChevronLeft } from '@/components/ui/icon'
import { cn } from '@/lib/utils'

export type PaginationItem = number | 'ellipsis-start' | 'ellipsis-end'

export function getPaginationPages(currentPage: number, totalPages: number): PaginationItem[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1)
  }

  if (currentPage <= 4) {
    return [1, 2, 3, 4, 5, 'ellipsis-end', totalPages]
  }

  if (currentPage >= totalPages - 3) {
    return [1, 'ellipsis-start', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages]
  }

  return [1, 'ellipsis-start', currentPage - 1, currentPage, currentPage + 1, 'ellipsis-end', totalPages]
}

export interface PaginationProps {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
  totalItems?: number
  itemsPerPage?: number
  itemLabel?: string
  className?: string
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  onPageChange,
  totalItems,
  itemsPerPage = 10,
  itemLabel = 'פריטים',
  className,
}) => {
  if (totalPages <= 1) return null

  const safePage = Math.min(Math.max(1, currentPage), totalPages)
  const pages = getPaginationPages(safePage, totalPages)

  const startItem = (safePage - 1) * itemsPerPage + 1
  const endItem = totalItems !== undefined ? Math.min(safePage * itemsPerPage, totalItems) : safePage * itemsPerPage

  return (
    <div
      className={cn(
        'flex flex-col gap-3 border-t border-border pt-4 font-assistant text-sm sm:flex-row sm:items-center sm:justify-between',
        className
      )}
      dir="rtl"
    >
      {totalItems !== undefined && (
        <div className="text-muted-foreground text-center sm:text-start">
          מציג {startItem}–{endItem} מתוך {totalItems} {itemLabel}
        </div>
      )}

      <div className="flex items-center justify-between gap-2 sm:justify-start">
        <button
          type="button"
          onClick={() => onPageChange(Math.max(1, safePage - 1))}
          disabled={safePage === 1}
          className="flex h-9 cursor-pointer items-center gap-1 rounded-xl border border-border bg-card px-3.5 text-sm font-bold text-foreground transition-all duration-100 active:scale-95 active:bg-muted disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100 shadow-2xs"
          aria-label="עמוד קודם"
        >
          <ChevronRight size={15} /> הקודם
        </button>

        {/* Mobile compact indicator */}
        <span className="font-bold text-muted-foreground sm:hidden">
          עמוד {safePage} מתוך {totalPages}
        </span>

        {/* Desktop windowed page numbers */}
        <div className="hidden items-center gap-1 sm:flex">
          {pages.map((item, idx) => {
            if (typeof item === 'string') {
              return (
                <span
                  key={`ellipsis-${idx}`}
                  className="flex h-8 w-8 items-center justify-center text-xs font-bold text-muted-foreground select-none"
                >
                  ...
                </span>
              )
            }

            const isCurrent = item === safePage
            return (
              <button
                key={item}
                type="button"
                onClick={() => onPageChange(item)}
                className={cn(
                  'h-8 w-8 cursor-pointer rounded-lg text-sm font-bold transition-transform duration-150 ease-native active:scale-95',
                  isCurrent
                    ? 'bg-primary text-primary-foreground shadow-2xs'
                    : 'border border-border bg-card text-muted-foreground hover:text-foreground hover:bg-muted/80 active:bg-muted'
                )}
                aria-current={isCurrent ? 'page' : undefined}
              >
                {item}
              </button>
            )
          })}
        </div>

        <button
          type="button"
          onClick={() => onPageChange(Math.min(totalPages, safePage + 1))}
          disabled={safePage === totalPages}
          className="flex h-9 cursor-pointer items-center gap-1 rounded-xl border border-border bg-card px-3.5 text-sm font-bold text-foreground transition-all duration-100 active:scale-95 active:bg-muted disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100 shadow-2xs"
          aria-label="עמוד הבא"
        >
          הבא <ChevronLeft size={15} />
        </button>
      </div>
    </div>
  )
}

export { Pagination as IMPagination }
export type IMPaginationProps = PaginationProps

