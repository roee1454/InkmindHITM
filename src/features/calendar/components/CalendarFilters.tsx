import React, { useState, useRef, useEffect, useMemo } from 'react'
import { PencilLine, Needle } from '@/components/ui/icon'
import { SearchInput } from '@/components/ui/search-input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { formatDayTitle } from '../utils/date-utils'
import { cn } from '@/lib/utils'
import { GoogleIcon } from '@/components/icons/GoogleIcon'
import { formatPhoneForDisplay, phoneMatchesQuery } from '@/lib/phone'
import type { ApiAppointment, ApiGoogleConnection } from '../types'

interface StaffItem {
  id: string
  name: string
  avatar?: string
}

interface FilterCounts {
  all: number
  confirmed: number
  pending: number
  cancelled: number
  completed: number
  no_show: number
}

interface CalendarFiltersProps {
  searchQuery: string
  onSearchQueryChange: (query: string) => void
  selectedStatus: string
  onSelectedStatusChange: (status: string) => void
  selectedArtist: string
  onSelectedArtistChange: (artistId: string) => void
  filterCounts: FilterCounts
  staff: StaffItem[]
  googleConnections?: ApiGoogleConnection[]
  appointments?: ApiAppointment[]
  onSelectAppointment?: (appt: ApiAppointment) => void
  onJumpToDate?: (date: Date) => void
}

export const CalendarFilters: React.FC<CalendarFiltersProps> = ({
  searchQuery,
  onSearchQueryChange,
  selectedStatus,
  onSelectedStatusChange,
  selectedArtist,
  onSelectedArtistChange,
  filterCounts,
  staff,
  googleConnections = [],
  appointments = [],
  onSelectAppointment,
  onJumpToDate,
}) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const searchContainerRef = useRef<HTMLDivElement>(null)

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Instant search results
  const query = searchQuery.trim().toLowerCase()
  const searchResults = useMemo(() => {
    if (!query || !appointments.length) return []
    return appointments
      .filter((a) => {
        const leadName = (a.leadName || '').toLowerCase()
        const style = (a.style || '').toLowerCase()
        const staffName = (a.staffName || '').toLowerCase()
        const notes = (a.notes || '').toLowerCase()
        const date = (a.date || '').toLowerCase()
        const timeSlot = (a.timeSlot || '').toLowerCase()
        const typeHebrew = a.type === 'sketch' ? 'סקיצה ייעוץ' : 'קעקוע'
        return (
          leadName.includes(query) ||
          phoneMatchesQuery(a.leadPhone, query) ||
          style.includes(query) ||
          staffName.includes(query) ||
          notes.includes(query) ||
          date.includes(query) ||
          timeSlot.includes(query) ||
          typeHebrew.includes(query)
        )
      })
      .slice(0, 6)
  }, [query, appointments])

  const handleSelectResult = (appt: ApiAppointment) => {
    setIsDropdownOpen(false)
    if (onJumpToDate && appt.date) {
      const [y, m, d] = appt.date.split('-').map(Number)
      if (y && m && d) {
        onJumpToDate(new Date(y, m - 1, d))
      }
    }
    if (onSelectAppointment) {
      onSelectAppointment(appt)
    }
  }

  return (
    <div className="flex flex-col gap-3 font-assistant" dir="rtl">
      {/* Top row: Search input & Artist dropdown */}
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
        {/* Search input with quick-result dropdown */}
        <SearchInput
          containerRef={searchContainerRef}
          containerClassName="flex-1"
          size="default"
          variant="card"
          placeholder="חיפוש פגישה לפי לקוח, טלפון, קעקוע או מקעקע..."
          value={searchQuery}
          onChange={onSearchQueryChange}
          onImmediateChange={(val) => {
            if (val.trim()) setIsDropdownOpen(true)
            else setIsDropdownOpen(false)
          }}
          onFocus={() => {
            if (searchQuery.trim()) setIsDropdownOpen(true)
          }}
          onKeyDown={(e) => {
            if (e.key === 'Escape') setIsDropdownOpen(false)
          }}
          onClear={() => setIsDropdownOpen(false)}
        >
          {/* Instant Dropdown Results */}
          {isDropdownOpen && searchQuery.trim().length > 0 && (
            <div className="absolute top-full start-0 mt-1.5 w-full bg-card/95 backdrop-blur-md rounded-2xl border border-border shadow-lg z-50 overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150">
              <div className="px-3.5 py-2 border-b border-border flex items-center justify-between text-micro text-muted-foreground font-medium bg-muted/30">
                <span>תוצאות חיפוש מהירות</span>
                <span>{searchResults.length} {searchResults.length === 1 ? 'פגישה נמצאה' : 'פגישות נמצאו'}</span>
              </div>

              {searchResults.length === 0 ? (
                <div className="px-4 py-6 text-center text-xs text-muted-foreground font-medium">
                  לא נמצאו פגישות התואמות ל-&quot;<span className="text-foreground font-bold">{searchQuery}</span>&quot;
                </div>
              ) : (
                <div className="divide-y divide-border/50 max-h-[340px] overflow-y-auto">
                  {searchResults.map((appt) => {
                    const isSketch = appt.type === 'sketch'
                    const subject = appt.style || (isSketch ? 'פגישת סקיצה / ייעוץ' : 'סשן קעקוע')
                    const [y, m, d] = appt.date.split('-').map(Number)
                    const formattedDate = (y && m && d) ? formatDayTitle(new Date(y, m - 1, d)) : appt.date

                    return (
                      <button
                        key={appt.id}
                        type="button"
                        onClick={() => handleSelectResult(appt)}
                        className="w-full text-right p-3 hover:bg-muted/50 active:bg-muted/80 transition-colors flex items-center justify-between gap-3 cursor-pointer group"
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div className={cn(
                            "size-8 rounded-xl flex items-center justify-center shrink-0 border",
                            isSketch ? "bg-accent-ink/10 text-accent-ink border-accent-ink/20" : "bg-primary/10 text-primary border-primary/20"
                          )}>
                            {isSketch ? <PencilLine size={15} /> : <Needle size={15} />}
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-extrabold text-foreground truncate group-hover:text-primary transition-colors">
                                {appt.leadName || 'לקוח ללא שם'}
                              </span>
                              {appt.leadPhone && (
                                <span className="text-micro font-assistant text-muted-foreground dir-ltr">
                                  {formatPhoneForDisplay(appt.leadPhone)}
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-muted-foreground truncate mt-0.5">
                              <span className="font-semibold text-foreground/80">{subject}</span>
                              {appt.staffName && <span> · מקעקע: {appt.staffName}</span>}
                            </div>
                          </div>
                        </div>

                        <div className="shrink-0 text-left flex flex-col items-end gap-1">
                          <span className="text-xs font-assistant font-bold text-foreground bg-muted/60 px-2 py-0.5 rounded-xl border border-border">
                            {formattedDate} · {appt.timeSlot}
                          </span>
                          <span className={cn(
                            "text-2xs font-bold rounded-xl px-2 py-0.5",
                            appt.status === 'confirmed' ? 'bg-status-done/10 text-status-done' :
                            appt.status === 'pending' ? 'bg-accent-ink/10 text-accent-ink' :
                            appt.status === 'completed' ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                          )}>
                            {appt.status === 'confirmed' ? 'מאושר' : appt.status === 'pending' ? 'ממתין' : appt.status === 'completed' ? 'הושלם' : 'בוטל'}
                          </span>
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}

              <div className="px-3.5 py-1.5 border-t border-border bg-muted/20 text-2xs text-muted-foreground flex items-center justify-between">
                <span>לחיצה על פגישה מקפיצה לתאריך בלוח ופותחת עריכה</span>
                <span className="text-micro">Esc לסגירה</span>
              </div>
            </div>
          )}
        </SearchInput>

        {/* Artist Filter Dropdown */}
        <div className="w-full sm:w-64 sm:shrink-0" dir="rtl">
          <Select value={selectedArtist} onValueChange={onSelectedArtistChange}>
            <SelectTrigger className="h-12 w-full rounded-2xl border-input bg-card shadow-xs text-sm">
              <SelectValue placeholder="לפי מקעקעים (כל הצוות)" />
            </SelectTrigger>
            <SelectContent align="end" className="font-assistant" dir="rtl">
              <SelectItem value="all">
                <span className="flex items-center gap-2 font-bold">לפי מקעקעים (כל הצוות)</span>
              </SelectItem>
              {staff.map((artist) => {
                const connection = googleConnections.find(
                  (c) => c.staffId === artist.id && c.status === 'connected',
                )
                const isGoogleConnected = !!connection
                const picture = connection?.googleAccountPicture || artist.avatar

                return (
                  <SelectItem key={artist.id} value={artist.id}>
                    <div className="flex items-center gap-2">
                      <Avatar className="size-5">
                        <AvatarImage src={isGoogleConnected ? picture : undefined} />
                        <AvatarFallback className="text-micro bg-muted">
                          {artist.name.slice(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                      <span>{artist.name}</span>
                      {isGoogleConnected && <GoogleIcon size={12} />}
                    </div>
                  </SelectItem>
                )
              })}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Status chips — horizontal scroll at every width */}
      <div className="scrollbar-none -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 lg:mx-0 lg:px-0 lg:pb-0">
        {[
          { id: 'all', label: 'הכל', count: filterCounts.all },
          { id: 'confirmed', label: 'מאושר', count: filterCounts.confirmed },
          { id: 'pending', label: 'ממתין', count: filterCounts.pending },
          { id: 'cancelled', label: 'בוטל', count: filterCounts.cancelled },
          { id: 'completed', label: 'הושלם', count: filterCounts.completed },
          { id: 'no_show', label: 'לא הגיע', count: filterCounts.no_show },
        ].map((pill) => {
          const active = selectedStatus === pill.id
          return (
            <button
              key={pill.id}
              onClick={() => onSelectedStatusChange(pill.id)}
              className={`h-[38px] shrink-0 cursor-pointer select-none whitespace-nowrap rounded-xl px-3.5 font-assistant text-sm font-bold transition-all duration-150 ease-native active:scale-[0.97] ${
                active
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              {pill.label} · {pill.count}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default CalendarFilters
