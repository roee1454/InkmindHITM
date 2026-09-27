import React from 'react'
import { ChevronLeft, ChevronRight, Info, Plus, SlidersHorizontal } from '@/components/ui/icon'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { GoogleIcon } from '@/components/icons/GoogleIcon'
import { cn } from '@/lib/utils'
import { CalendarLegend } from './CalendarLegend'
import { CalendarSearch } from './CalendarSearch'
import { CALENDAR_VIEW_MODES } from '../utils/view-mode'
import type { CalendarViewMode } from '../utils/view-mode'
import type { StatusFilter } from '../utils/filter-appointments'
import { STATUS_LABELS } from '../types'
import type { ApiAppointment, ApiGoogleConnection } from '../types'

const STATUS_OPTIONS: StatusFilter[] = ['all', 'confirmed', 'pending', 'completed', 'cancelled', 'no_show']

interface StaffItem {
  id: string
  name: string
  avatar?: string
}

interface CalendarToolbarProps {
  title: string
  mode: CalendarViewMode
  availableModes: ReadonlyArray<CalendarViewMode>
  onModeChange: (mode: CalendarViewMode) => void
  /** List mode has no date range to walk, so it hides the today/prev/next group. */
  showNav: boolean
  onStep: (direction: 1 | -1) => void
  onToday: () => void
  searchQuery: string
  onSearchQueryChange: (query: string) => void
  appointments: ApiAppointment[]
  onSelectAppointment: (appointment: ApiAppointment) => void
  onJumpToDate: (date: Date) => void
  selectedArtist: string
  onSelectedArtistChange: (artistId: string) => void
  staff: StaffItem[]
  googleConnections: ApiGoogleConnection[]
  selectedStatus: StatusFilter
  onSelectedStatusChange: (status: StatusFilter) => void
  statusCounts: Record<StatusFilter, number>
  onNewAppointment: () => void
}

/**
 * The calendar's one toolbar (track-b B6.8). It replaces three stacked bars — the page header,
 * the filter block, and the grid's own navigation row — which together left barely a third of
 * the screen for the grid itself.
 */
export function CalendarToolbar(props: CalendarToolbarProps) {
  const filtersActive = props.selectedArtist !== 'all' || props.selectedStatus !== 'all'
  const [filtersOpen, setFiltersOpen] = React.useState(false)
  const showFilters = filtersOpen || filtersActive

  return (
    <div
      dir="rtl"
      className="sticky top-0 z-20 flex flex-col gap-2 border-b border-border bg-card px-3 py-2.5 font-assistant lg:px-4"
    >
      <div className="flex flex-wrap items-center gap-2">
        {props.showNav && (
          <div className="flex shrink-0 items-center gap-1">
            <Button variant="outline" size="sm" onClick={props.onToday} className="h-9 px-3">
              היום
            </Button>
            <button type="button" onClick={() => props.onStep(-1)} aria-label="הקודם" className="tap-target size-9 text-muted-foreground">
              <ChevronRight size={18} />
            </button>
            <button type="button" onClick={() => props.onStep(1)} aria-label="הבא" className="tap-target size-9 text-muted-foreground">
              <ChevronLeft size={18} />
            </button>
          </div>
        )}

        <h1 className="min-w-0 shrink-0 truncate text-lg font-extrabold tracking-tight text-foreground">{props.title}</h1>

        <CalendarSearch
          className="order-last w-full min-w-[180px] flex-1 lg:order-none lg:w-auto"
          searchQuery={props.searchQuery}
          onSearchQueryChange={props.onSearchQueryChange}
          appointments={props.appointments}
          onSelectAppointment={props.onSelectAppointment}
          onJumpToDate={props.onJumpToDate}
        />

        <div className="ms-auto flex shrink-0 items-center gap-1.5 lg:ms-0">
          <div className="flex select-none items-center rounded-lg bg-muted p-0.5">
            {CALENDAR_VIEW_MODES.filter((option) => props.availableModes.includes(option.id)).map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => props.onModeChange(option.id)}
                aria-pressed={props.mode === option.id}
                className={cn(
                  'h-8 cursor-pointer rounded-md px-2.5 text-sm font-bold transition-colors duration-150',
                  props.mode === option.id ? 'bg-card font-extrabold text-foreground shadow-xs' : 'text-muted-foreground',
                )}
              >
                {option.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setFiltersOpen((open) => !open)}
            aria-pressed={showFilters}
            aria-label="סינון"
            title="סינון"
            className={cn('tap-target size-9', filtersActive ? 'text-primary' : 'text-muted-foreground')}
          >
            <SlidersHorizontal size={17} />
          </button>

          <Popover>
            <PopoverTrigger asChild>
              <button type="button" aria-label="מקרא היומן" title="מקרא היומן" className="tap-target size-9 text-muted-foreground">
                <Info size={17} />
              </button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-80 p-0" dir="rtl">
              <CalendarLegend />
            </PopoverContent>
          </Popover>

          <Button onClick={props.onNewAppointment} size="sm" className="h-9 shrink-0 gap-1.5">
            <Plus size={16} />
            <span className="hidden sm:inline">תור חדש</span>
          </Button>
        </div>
      </div>

      {showFilters && (
        <div className="flex flex-wrap items-center gap-2">
          <Select value={props.selectedArtist} onValueChange={props.onSelectedArtistChange}>
            <SelectTrigger className="h-9 w-full rounded-lg text-sm sm:w-48" aria-label="סינון לפי מקעקע">
              <SelectValue />
            </SelectTrigger>
            <SelectContent align="end" dir="rtl" className="font-assistant">
              <SelectItem value="all">כל המקעקעים</SelectItem>
              {props.staff.map((artist) => {
                const connection = props.googleConnections.find((c) => c.staffId === artist.id && c.status === 'connected')
                return (
                  <SelectItem key={artist.id} value={artist.id}>
                    <span className="flex items-center gap-2">
                      <Avatar className="size-5">
                        <AvatarImage src={connection?.googleAccountPicture || artist.avatar || undefined} />
                        <AvatarFallback className="bg-muted text-2xs">{artist.name.slice(0, 2)}</AvatarFallback>
                      </Avatar>
                      <span>{artist.name}</span>
                      {connection && <GoogleIcon size={12} />}
                    </span>
                  </SelectItem>
                )
              })}
            </SelectContent>
          </Select>

          <Select value={props.selectedStatus} onValueChange={(value) => props.onSelectedStatusChange(value as StatusFilter)}>
            <SelectTrigger className="h-9 w-full rounded-lg text-sm sm:w-44" aria-label="סינון לפי סטטוס">
              <SelectValue />
            </SelectTrigger>
            <SelectContent align="end" dir="rtl" className="font-assistant">
              {STATUS_OPTIONS.map((status) => (
                <SelectItem key={status} value={status}>
                  {status === 'all' ? 'כל הסטטוסים' : STATUS_LABELS[status]} · {props.statusCounts[status]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {filtersActive && (
            <Button
              variant="ghost"
              size="sm"
              className="h-9"
              onClick={() => {
                props.onSelectedArtistChange('all')
                props.onSelectedStatusChange('all')
              }}
            >
              נקה סינון
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
