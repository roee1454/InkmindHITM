import React from 'react'
import { SearchInput } from '@/components/ui/search-input'
import { STAGE_CONFIG, STAGE_OPTIONS } from '../types'
import type { LeadStage } from '../types'

interface LeadsFiltersProps {
  searchQuery: string
  onSearchQueryChange: (query: string) => void
  selectedStage: string
  onSelectedStageChange: (stage: string) => void
  stageCounts: Record<string, number>
}

export const LeadsFilters: React.FC<LeadsFiltersProps> = ({
  searchQuery,
  onSearchQueryChange,
  selectedStage,
  onSelectedStageChange,
  stageCounts,
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
      {/* Top row: Search input */}
      <SearchInput
        size="lg"
        variant="card"
        placeholder="חיפוש לפי שם או טלפון..."
        value={searchQuery}
        onChange={onSearchQueryChange}
      />

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
              className={`flex h-[38px] shrink-0 cursor-pointer select-none items-center gap-1.5 whitespace-nowrap rounded-xl px-3.5 font-assistant text-sm font-bold transition-all duration-150 ease-native active:scale-[0.97] ${
                isActive
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'border border-border bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground'
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
