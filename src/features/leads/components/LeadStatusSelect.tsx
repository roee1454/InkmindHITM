import React from 'react'
import { ChevronDown, Lock, Loader2 } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { STAGE_CONFIG, STAGE_OPTIONS } from '../types'
import type { LeadStage } from '../types'

interface LeadStatusSelectProps {
  stage: LeadStage
  editable: boolean
  isUpdating?: boolean
  onStageChange: (newStage: LeadStage) => void
}

export const LeadStatusSelect: React.FC<LeadStatusSelectProps> = ({
  stage,
  editable,
  isUpdating = false,
  onStageChange,
}) => {
  const currentConfig = STAGE_CONFIG[stage] ?? STAGE_CONFIG.new

  if (!editable) {
    return (
      <div
        className={`inline-flex h-8 items-center gap-1.5 rounded-full border px-3 font-assistant text-[12.5px] font-bold opacity-70 select-none md:h-7 ${currentConfig.badgeClass}`}
        title="אין לך הרשאה לעדכן ליד זה"
      >
        <span className={`size-2 rounded-full ${currentConfig.dotClass}`} />
        <span>{currentConfig.label}</span>
        <Lock className="size-3 text-muted-foreground ms-0.5" />
      </div>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          disabled={isUpdating}
          onClick={(e) => e.stopPropagation()}
          className={`group inline-flex h-8.5 cursor-pointer items-center gap-1.5 rounded-full border px-3.5 font-assistant text-[13px] font-bold shadow-2xs transition-all duration-150 ease-native outline-none hover:shadow-xs focus-visible:ring-2 focus-visible:ring-primary/20 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-60 md:h-7.5 md:px-3 md:text-[12.5px] ${currentConfig.badgeClass}`}
        >
          {isUpdating ? (
            <Loader2 className="size-3 animate-spin text-muted-foreground" />
          ) : (
            <span className={`size-2 rounded-full ${currentConfig.dotClass}`} />
          )}
          <span>{currentConfig.label}</span>
          <ChevronDown className="size-3 text-muted-foreground/80 transition-transform duration-150 group-data-[state=open]:rotate-180" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-[180px] p-1.5 font-assistant">
        {STAGE_OPTIONS.map((opt) => {
          const isSelected = opt.stage === stage
          return (
            <DropdownMenuItem
              key={opt.stage}
              onClick={(e) => {
                e.stopPropagation()
                if (opt.stage !== stage) {
                  onStageChange(opt.stage)
                }
              }}
              className={`flex cursor-pointer items-center justify-between rounded-xl px-3 py-2 text-[13.5px] font-semibold transition-colors md:py-1.5 md:text-[13px] ${
                isSelected ? 'bg-primary/10 font-bold text-primary' : 'text-foreground hover:bg-muted'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className={`size-2 shrink-0 rounded-full ${opt.dotClass}`} />
                <span>{opt.label}</span>
              </div>
              {isSelected && <span className="size-1.5 rounded-full bg-primary" />}
            </DropdownMenuItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export default LeadStatusSelect
