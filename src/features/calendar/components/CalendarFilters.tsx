import React from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import type { ApiGoogleConnection } from '../types'

function GoogleIcon({ size = 13 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className="shrink-0">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
      />
    </svg>
  )
}

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
  selectedStatus: string
  onSelectedStatusChange: (status: string) => void
  selectedArtist: string
  onSelectedArtistChange: (artistId: string) => void
  filterCounts: FilterCounts
  staff: StaffItem[]
  googleConnections?: ApiGoogleConnection[]
}

export const CalendarFilters: React.FC<CalendarFiltersProps> = ({
  selectedStatus,
  onSelectedStatusChange,
  selectedArtist,
  onSelectedArtistChange,
  filterCounts,
  staff,
  googleConnections = [],
}) => {
  return (
    <div className="mb-4 flex flex-col justify-between gap-3 font-assistant md:mb-6 md:flex-row md:items-center md:gap-4" dir="rtl">
      {/* Status pills. Below md these bleed to the screen edge as a single scrollable row —
          six wrapped pills would otherwise eat ~3 rows of vertical space on a phone. */}
      {/* Mobile Status Selectable Dropdown */}
      <div className="md:hidden w-full" dir="rtl">
        <Select value={selectedStatus} onValueChange={onSelectedStatusChange}>
          <SelectTrigger className="h-11 rounded-xl bg-card border-border hover:border-primary/50 text-foreground transition-all duration-150 text-xs font-semibold">
            <SelectValue placeholder="סנן לפי סטטוס…" />
          </SelectTrigger>
          <SelectContent className="font-assistant">
            <SelectItem value="all" className="text-xs font-semibold">הכל ({filterCounts.all})</SelectItem>
            <SelectItem value="confirmed" className="text-xs font-semibold">מאושר ({filterCounts.confirmed})</SelectItem>
            <SelectItem value="pending" className="text-xs font-semibold">ממתין לאישור ({filterCounts.pending})</SelectItem>
            <SelectItem value="cancelled" className="text-xs font-semibold">בוטל ({filterCounts.cancelled})</SelectItem>
            <SelectItem value="completed" className="text-xs font-semibold">הושלם ({filterCounts.completed})</SelectItem>
            <SelectItem value="no_show" className="text-xs font-semibold">לא הגיע ({filterCounts.no_show})</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Status pills (desktop only) */}
      <div className="hidden md:flex scrollbar-none -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:flex-wrap md:overflow-visible md:px-0 md:pb-0">
        {[
          { id: 'all', label: 'הכל', count: filterCounts.all },
          { id: 'confirmed', label: 'מאושר', count: filterCounts.confirmed },
          { id: 'pending', label: 'ממתין לאישור', count: filterCounts.pending },
          { id: 'cancelled', label: 'בוטל', count: filterCounts.cancelled },
          { id: 'completed', label: 'הושלם', count: filterCounts.completed },
          { id: 'no_show', label: 'לא הגיע', count: filterCounts.no_show },
        ].map((pill) => {
          const active = selectedStatus === pill.id
          return (
            <button
              key={pill.id}
              onClick={() => onSelectedStatusChange(pill.id)}
              className={`shrink-0 cursor-pointer whitespace-nowrap rounded-xl border px-3 py-1.5 font-assistant text-xs font-semibold transition-colors active:scale-[0.97] ${
                active
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground active:bg-muted'
              }`}
            >
              {pill.label} ({pill.count})
            </button>
          )
        })}
      </div>

      {/* Artist Filter Dropdown */}
      <div className="w-full md:w-64 md:shrink-0" dir="rtl">
        <Select value={selectedArtist} onValueChange={onSelectedArtistChange}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="לפי מקעקעים (כל הצוות)" />
          </SelectTrigger>
          <SelectContent align="end">
            <SelectItem value="all">
              <span className="flex items-center gap-2">לפי מקעקעים (כל הצוות)</span>
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
  )
}

export default CalendarFilters
