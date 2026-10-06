import * as React from "react"

import { IMCalendar } from "@/components/ui/calendar"
import { IMIcon } from "@/components/ui/icon"
import { imControlClasses, imControlHeight } from "@/components/ui/input"
import { IMPopover, IMPopoverContent, IMPopoverTrigger } from "@/components/ui/popover"
import { HEBREW_DAYS_LONG, HEBREW_MONTHS, fromYmd, toYmd } from "@/lib/date-utils"
import { cn } from "@/lib/utils"

/**
 * The trigger of IMDatePicker and IMHourPicker: an IMInput look with a muted leading icon, the value
 * (or the muted placeholder), and a trailing chevron. Buttons don't zoom on iOS, so 15px everywhere.
 */
export const imPickerTriggerClasses = cn(
  "flex cursor-pointer select-none items-center gap-2 px-4 text-start text-base",
  imControlClasses,
  imControlHeight,
  "data-[state=open]:border-primary data-[state=open]:ring-4 data-[state=open]:ring-ring/22"
)

/** "יום ד׳, 14 באוקטובר" — the year only when it isn't this year. */
function formatDisplay(ymd: string): string {
  const d = fromYmd(ymd)
  const year = d.getFullYear() === new Date().getFullYear() ? "" : ` ${d.getFullYear()}`
  return `${HEBREW_DAYS_LONG[d.getDay()]}, ${d.getDate()} ב${HEBREW_MONTHS[d.getMonth()]}${year}`
}

export interface IMDatePickerProps {
  /** "YYYY-MM-DD", or "" when nothing is selected yet. */
  value: string
  onChange: (ymd: string) => void
  placeholder?: string
  /** `true` disables the trigger; a function disables the days it returns true for. */
  disabled?: boolean | ((date: Date) => boolean)
  className?: string
  /** "YYYY-MM-DD": days before it can't be picked, and the calendar opens on its month. */
  minDate?: string
}

/** Date entry: an IMInput-styled trigger that opens an IMCalendar in a popover. */
export function IMDatePicker({
  value,
  onChange,
  placeholder = "בחירת תאריך",
  disabled,
  className,
  minDate,
}: IMDatePickerProps) {
  const [open, setOpen] = React.useState(false)
  const triggerDisabled = disabled === true
  const dayDisabled = (date: Date) => {
    if (minDate && toYmd(date) < minDate) return true
    return typeof disabled === "function" ? disabled(date) : false
  }

  return (
    <IMPopover open={triggerDisabled ? false : open} onOpenChange={triggerDisabled ? undefined : setOpen}>
      <IMPopoverTrigger asChild>
        <button type="button" disabled={triggerDisabled} className={cn(imPickerTriggerClasses, className)}>
          <IMIcon name="calendar" size="sm" tone="muted" />
          <span className={cn("min-w-0 flex-1 truncate", !value && "text-muted-foreground/70")}>
            {value ? formatDisplay(value) : placeholder}
          </span>
          <IMIcon name="chevron-down" size="sm" tone="muted" />
        </button>
      </IMPopoverTrigger>
      <IMPopoverContent className="w-auto p-2" dir="rtl">
        <IMCalendar
          selected={value || null}
          onSelect={(ymd) => {
            onChange(ymd)
            setOpen(false)
          }}
          disabled={dayDisabled}
          defaultAnchor={minDate ? fromYmd(minDate) : undefined}
        />
      </IMPopoverContent>
    </IMPopover>
  )
}
