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

        <SearchInput
          // `basis-full`, not `w-full`: a `flex-1` basis of 0 overrides width, which left the search
          // squeezed beside the artist select on a phone instead of on its own line.
          containerClassName="order-last basis-full lg:order-none lg:max-w-md lg:flex-1 lg:basis-auto"
          size="default"
          variant="card"
          placeholder="חיפוש לפי שם, טלפון או פרויקט..."
          value={props.searchQuery}
          onChange={props.onSearchQueryChange}
        />

        <div className="ms-auto flex items-center gap-2">
          {props.artists.length > 0 && (
            <Select value={props.artistId} onValueChange={props.onArtistChange}>
              <SelectTrigger className="h-9 w-40 rounded-lg text-sm" aria-label="סינון לפי מקעקע">
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
