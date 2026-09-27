import { SearchInput } from '@/components/ui/search-input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'
import type { BoardColumn, BoardColumnId } from '../utils/board'

interface ProjectsToolbarProps {
  searchQuery: string
  onSearchQueryChange: (query: string) => void
  artists: { id: string; name: string }[]
  artistId: string
  onArtistChange: (artistId: string) => void
  openCount: number
  closedCount: number
  showClosed: boolean
  onShowClosedChange: (showClosed: boolean) => void
  /** Phone lanes, each with how many projects it holds. */
  mobileColumns: (BoardColumn & { count: number })[]
  mobileColumn: BoardColumnId
  onMobileColumnChange: (column: BoardColumnId) => void
}

const segment = (active: boolean) =>
  cn(
    'h-8 cursor-pointer rounded-md px-3 text-sm font-bold transition-colors duration-150',
    active ? 'bg-card font-extrabold text-foreground shadow-xs' : 'text-muted-foreground',
  )

/** The projects page's one toolbar: title, search, artist, and which part of the board to show. */
export function ProjectsToolbar(props: ProjectsToolbarProps) {
  return (
    <div dir="rtl" className="flex shrink-0 flex-col gap-2.5 border-b border-border bg-card px-4 py-3 font-assistant">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="hidden text-lg font-extrabold tracking-tight text-foreground lg:block">פרויקטים</h1>

        {/* Search and the artist filter share one row on a phone too: search takes the width, the
            filter sits beside it at a fixed size, both the same height. */}
        <SearchInput
          containerClassName="min-w-0 flex-1 lg:max-w-md"
          size="sm"
          variant="card"
          placeholder="חיפוש לקוח או פרויקט..."
          value={props.searchQuery}
          onChange={props.onSearchQueryChange}
        />

        <div className="flex shrink-0 items-center gap-2 lg:ms-auto">
          {props.artists.length > 0 && (
            <Select value={props.artistId} onValueChange={props.onArtistChange}>
              {/* The trigger sizes itself through `data-[size=*]:h-*`, which a plain `h-*` can't beat —
                  override on the same variant so it matches the search's height. */}
              <SelectTrigger size="sm" className="w-36 rounded-xl px-3 text-sm data-[size=sm]:h-9.5 md:text-sm lg:w-40" aria-label="סינון לפי מקעקע">
                <SelectValue />
              </SelectTrigger>
              <SelectContent dir="rtl" align="end">
                <SelectItem value="all">כל המקעקעים</SelectItem>
                {props.artists.map((artist) => (
                  <SelectItem key={artist.id} value={artist.id}>
                    {artist.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <div className="hidden select-none items-center rounded-lg bg-muted p-0.5 lg:flex" role="group" aria-label="פתוחים או סגורים">
            <button type="button" aria-pressed={!props.showClosed} onClick={() => props.onShowClosedChange(false)} className={segment(!props.showClosed)}>
              פתוחים · {props.openCount}
            </button>
            <button type="button" aria-pressed={props.showClosed} onClick={() => props.onShowClosedChange(true)} className={segment(props.showClosed)}>
              סגורים · {props.closedCount}
            </button>
          </div>
        </div>
      </div>

      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 scrollbar-none lg:hidden" role="tablist" aria-label="שלב">
        {props.mobileColumns.map((column) => {
          const active = props.mobileColumn === column.id
          return (
            <button
              key={column.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => props.onMobileColumnChange(column.id)}
              className={cn(
                'flex h-9 shrink-0 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-lg px-3 text-sm font-bold transition-colors duration-150',
                active ? 'bg-primary text-primary-foreground' : 'border border-border bg-muted/60 text-muted-foreground',
              )}
            >
              {column.label}
              <span className={cn('text-2xs tabular-nums', active ? 'text-primary-foreground/80' : 'text-muted-foreground/70')}>{column.count}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
