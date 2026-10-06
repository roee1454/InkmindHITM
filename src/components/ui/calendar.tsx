import * as React from "react"

import { IMButton } from "@/components/ui/button"
import { IMCaption, IMNum, IMSubtitle, IM_TYPE_ROLES } from "@/components/ui/typography"
import {
  HEBREW_DAYS_SHORT,
  addMonths,
  buildMonthMatrix,
  formatMonthTitle,
  fromYmd,
  isSameDay,
  isSameMonth,
  isToday,
  toYmd,
} from "@/lib/date-utils"
import { cn } from "@/lib/utils"

// Days to move per arrow key. Left = forward in time, right = backward: the RTL reading direction.
const KEY_STEPS: Record<string, number> = { ArrowLeft: 1, ArrowRight: -1, ArrowDown: 7, ArrowUp: -7 }

export interface IMCalendarProps {
  /** "YYYY-MM-DD", or null/empty when nothing is selected yet. */
  selected: string | null
  onSelect: (ymd: string) => void
  disabled?: (date: Date) => boolean
  className?: string
  defaultAnchor?: Date
}

/**
 * A month grid, RTL-native: the document is `dir="rtl"`, so the DOM keeps the days chronological
 * (Sun..Sat) and the grid flips visually. The week starts on Sunday (א); today has a ring and the
 * selected day is `primary`. Used on its own or inside IMDatePicker.
 */
export function IMCalendar({ selected, onSelect, disabled, className, defaultAnchor }: IMCalendarProps) {
  const initial = selected ? fromYmd(selected) : (defaultAnchor ?? new Date())
  const [anchor, setAnchor] = React.useState(initial)
  const [focused, setFocused] = React.useState(initial)
  const buttonRefs = React.useRef(new Map<string, HTMLButtonElement>())

  React.useEffect(() => {
    buttonRefs.current.get(toYmd(focused))?.focus()
  }, [focused])

  const moveFocus = (days: number) => {
    const next = new Date(focused)
    next.setDate(next.getDate() + days)
    if (!isSameMonth(next, anchor)) setAnchor(next)
    setFocused(next)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    const step = KEY_STEPS[e.key]
    if (step === undefined) return
    e.preventDefault()
    moveFocus(step)
  }

  return (
    <div data-slot="calendar" className={cn("flex w-74 flex-col gap-2", className)}>
      <div className="flex items-center justify-between">
        <IMButton
          type="button"
          variant="ghost"
          size="icon-sm"
          icon="chevron-start"
          onClick={() => setAnchor((a) => addMonths(a, -1))}
          aria-label="חודש קודם"
        />
        <IMSubtitle as="span" aria-live="polite">
          {formatMonthTitle(anchor)}
        </IMSubtitle>
        <IMButton
          type="button"
          variant="ghost"
          size="icon-sm"
          icon="chevron-end"
          onClick={() => setAnchor((a) => addMonths(a, 1))}
          aria-label="חודש הבא"
        />
      </div>

      <div className="grid grid-cols-7 gap-0.5" onKeyDown={handleKeyDown}>
        {HEBREW_DAYS_SHORT.map((label) => (
          <IMCaption key={label} as="div" className="grid h-7 place-items-center">
            {label}
          </IMCaption>
        ))}

        {buildMonthMatrix(anchor)
          .flat()
          .map((day) => {
            const ymd = toYmd(day)
            const isDisabled = disabled?.(day) ?? false
            const isSelected = !!selected && isSameDay(day, fromYmd(selected))
            return (
              <button
                key={ymd}
                ref={(el) => {
                  if (el) buttonRefs.current.set(ymd, el)
                  else buttonRefs.current.delete(ymd)
                }}
                type="button"
                disabled={isDisabled}
                tabIndex={isSameDay(day, focused) ? 0 : -1}
                onFocus={() => setFocused(day)}
                onClick={() => onSelect(ymd)}
                aria-pressed={isSelected}
                className={cn(
                  IM_TYPE_ROLES["body-sm"],
                  "grid h-10 cursor-pointer place-items-center rounded-md outline-none transition-colors duration-100 hover:bg-surface-2 focus-visible:ring-4 focus-visible:ring-ring/35",
                  isSameMonth(day, anchor) ? "text-foreground" : "text-muted-foreground/60",
                  isToday(day) && !isSelected && "font-bold inset-ring-[1.5px] inset-ring-ring",
                  isSelected && "bg-primary font-bold text-primary-foreground hover:bg-primary",
                  isDisabled && "cursor-not-allowed opacity-30 hover:bg-transparent"
                )}
              >
                <IMNum>{day.getDate()}</IMNum>
              </button>
            )
          })}
      </div>
    </div>
  )
}
