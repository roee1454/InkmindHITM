import { SearchInput } from '@/components/ui/search-input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { PROJECT_STAGE_LABELS } from '@/features/projects/utils/labels'
import { OPEN_STAGES } from '../utils/pipeline-filter'
import type { PipelineFilter } from '../utils/pipeline-filter'

const FILTERS: { id: PipelineFilter; label: string }[] = [
  { id: 'open', label: 'פתוחים' },
  ...OPEN_STAGES.map((stage) => ({ id: stage, label: PROJECT_STAGE_LABELS[stage] })),
  { id: 'completed', label: PROJECT_STAGE_LABELS.completed },
  { id: 'lost', label: 'אבודים' },
]

interface PipelineFiltersProps {
  searchQuery: string
  onSearchQueryChange: (query: string) => void
  filter: PipelineFilter
  onFilterChange: (filter: PipelineFilter) => void
  counts: Record<PipelineFilter, number>
  artists: { id: string; name: string }[]
  artistId: string
  onArtistChange: (artistId: string) => void
}

export function PipelineFilters(props: PipelineFiltersProps) {
  return (
    <div className="flex flex-col gap-3 font-assistant" dir="rtl">
      <div className="flex flex-col gap-3 sm:flex-row">
        <SearchInput size="lg" variant="card" placeholder="חיפוש לפי שם, טלפון או פרויקט..." value={props.searchQuery} onChange={props.onSearchQueryChange} className="flex-1" />
        {props.artists.length > 0 && (
          <Select value={props.artistId} onValueChange={props.onArtistChange}>
            <SelectTrigger className="w-full sm:w-44" aria-label="סינון לפי אמן">
              <SelectValue />
            </SelectTrigger>
            <SelectContent dir="rtl">
              <SelectItem value="all">כל האמנים</SelectItem>
              {props.artists.map((artist) => (
                <SelectItem key={artist.id} value={artist.id}>
                  {artist.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 scrollbar-none lg:mx-0 lg:px-0" role="group" aria-label="סינון לפי שלב">
        {FILTERS.map((option) => {
          const active = props.filter === option.id
          return (
            <button
              key={option.id}
              type="button"
              aria-pressed={active}
              onClick={() => props.onFilterChange(option.id)}
              className={cn(
                'flex h-9 shrink-0 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-xl px-3.5 text-sm font-bold transition-all duration-150 ease-native active:scale-[0.97]',
                active ? 'bg-primary text-primary-foreground shadow-xs' : 'border border-border bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground',
              )}
            >
              {option.label}
              <span className={cn('text-mini', active ? 'text-primary-foreground/80' : 'text-muted-foreground/70')}>· {props.counts[option.id]}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
