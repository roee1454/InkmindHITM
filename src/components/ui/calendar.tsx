import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "#/lib/utils.ts"
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
} from "#/lib/date-utils.ts"

export interface CalendarProps {
  // "YYYY-MM-DD", or null/empty when nothing is selected yet.
  selected: string | null
  onSelect: (ymd: string) => void
  disabled?: (date: Date) => boolean
  className?: string
}

// Month-grid calendar, RTL-native (the app sets dir="rtl" on <html>, so the day-of-week order in
// the DOM stays chronological — Sun..Sat — and the grid flips visually via CSS). Reused on its
// own or via DatePicker (Popover + this + a trigger button).
export const Calendar: React.FC<CalendarProps> = ({ selected, onSelect, disabled, className }) => {
  const initial = selected ? fromYmd(selected) : new Date()
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
    // Left = forward in time, right = backward, matching RTL nav convention.
    switch (e.key) {
      case "ArrowLeft":
        e.preventDefault()
        moveFocus(1)
        break
      case "ArrowRight":
        e.preventDefault()
        moveFocus(-1)
        break
      case "ArrowDown":
        e.preventDefault()
        moveFocus(7)
        break
      case "ArrowUp":
        e.preventDefault()
        moveFocus(-7)
        break
    }
  }

  const weeks = buildMonthMatrix(anchor)

  return (
    <div className={cn("w-64 font-assistant", className)}>
      <div className="mb-2 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setAnchor((a) => addMonths(a, -1))}
          className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg text-muted-foreground hover:bg-muted"
          aria-label="חודש קודם"
        >
          <ChevronRight size={16} />
        </button>
        <span className="text-xs font-bold text-foreground">{formatMonthTitle(anchor)}</span>
        <button
          type="button"
          onClick={() => setAnchor((a) => addMonths(a, 1))}
          className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg text-muted-foreground hover:bg-muted"
          aria-label="חודש הבא"
        >
          <ChevronLeft size={16} />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-y-1" onKeyDown={handleKeyDown}>
        {HEBREW_DAYS_SHORT.map((label) => (
          <div key={label} className="flex h-7 items-center justify-center text-[10px] text-muted-foreground">
            {label}
          </div>
        ))}

        {weeks.flat().map((day) => {
          const ymd = toYmd(day)
          const isDisabled = disabled?.(day) ?? false
          const isSelected = !!selected && isSameDay(day, fromYmd(selected))
          const inMonth = isSameMonth(day, anchor)
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
              className={cn(
                "flex h-8 w-8 cursor-pointer items-center justify-center justify-self-center rounded-lg text-xs transition-colors hover:bg-primary/10",
                inMonth ? "text-foreground" : "text-muted-foreground/40",
                isToday(day) && !isSelected && "border border-primary/50 font-bold",
                isSelected && "bg-primary font-bold text-primary-foreground hover:bg-primary",
                isDisabled && "cursor-not-allowed opacity-30 hover:bg-transparent"
              )}
            >
              {day.getDate()}
            </button>
          )
        })}
      </div>
    </div>
  )
}
export default Calendar
