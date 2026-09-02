import React from 'react'
import { Search } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import type { StaffMember } from '@/features/settings/server/staff'
import type { ApiGoogleConnection } from '@/features/calendar/types'
import { STAGE_CONFIG, STAGE_OPTIONS } from '../types'
import type { LeadStage } from '../types'

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

interface LeadsFiltersProps {
  searchQuery: string
  onSearchQueryChange: (query: string) => void
  selectedStage: string
  onSelectedStageChange: (stage: string) => void
  selectedArtist: string
  onSelectedArtistChange: (artistId: string) => void
  stageCounts: Record<string, number>
  staffList: StaffMember[]
  googleConnections?: ApiGoogleConnection[]
}

export const LeadsFilters: React.FC<LeadsFiltersProps> = ({
  searchQuery,
  onSearchQueryChange,
  selectedStage,
  onSelectedStageChange,
  selectedArtist,
  onSelectedArtistChange,
  stageCounts,
  staffList,
  googleConnections = [],
}) => {
  const allStagesList = [
    { id: 'all', label: 'הכל', count: stageCounts.all ?? 0 },
    ...STAGE_OPTIONS.map((opt) => ({
      id: opt.stage,
      label: opt.label,
      count: stageCounts[opt.stage] ?? 0,
      dotClass: opt.dotClass,
    })),
  ]

  return (
    <div className="flex flex-col gap-3 font-assistant lg:gap-3.5" dir="rtl">
      {/* Top row: Search input & Artist dropdown */}
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
        <div className="relative w-full flex-1">
          <Search size={18} className="pointer-events-none absolute start-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="חיפוש לפי שם או טלפון..."
            value={searchQuery}
            onChange={(e) => onSearchQueryChange(e.target.value)}
            className="flex h-13 w-full items-center rounded-2xl border border-input/80 bg-card ps-11 pe-4 font-assistant text-base text-foreground shadow-2xs transition-all duration-150 ease-native outline-none placeholder:text-muted-foreground/50 focus:border-primary focus:ring-4 focus:ring-primary/10 md:h-12 md:text-[15px]"
          />
        </div>

        <div className="w-full sm:w-64 sm:shrink-0" dir="rtl">
          <Select value={selectedArtist} onValueChange={onSelectedArtistChange}>
            <SelectTrigger className="h-13 w-full rounded-2xl border-input/80 bg-card shadow-2xs text-base md:h-12 md:text-[15px]">
              <SelectValue placeholder="לפי מקעקעים (כל הצוות)" />
            </SelectTrigger>
            <SelectContent align="end" className="font-assistant" dir="rtl">
              <SelectItem value="all">
                <span className="flex items-center gap-2 font-bold">לפי מקעקעים (כל הצוות)</span>
              </SelectItem>
              {staffList.map((artist) => {
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

      {/* Stage filter pills */}
      <div className="scrollbar-none -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 lg:mx-0 lg:px-0 lg:pb-0">
        {allStagesList.map((pill) => {
          const isActive = selectedStage === pill.id
          const stageConfig = pill.id !== 'all' ? STAGE_CONFIG[pill.id as LeadStage] : null

          return (
            <button
              key={pill.id}
              type="button"
              onClick={() => onSelectedStageChange(pill.id)}
              className={`flex h-[38px] shrink-0 cursor-pointer select-none items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 font-assistant text-[13px] font-bold transition-all duration-150 ease-native active:scale-[0.97] ${
                isActive
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'border border-border/70 bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              {stageConfig && !isActive && (
                <span className={`size-1.5 rounded-full ${stageConfig.dotClass}`} />
              )}
              <span>{pill.label}</span>
              <span
                className={`ms-0.5 text-mini ${
                  isActive ? 'text-primary-foreground/80' : 'text-muted-foreground/70'
                }`}
              >
                · {pill.count}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default LeadsFilters

