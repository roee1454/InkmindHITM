import * as React from "react"
import { Calendar as CalendarIcon } from '@/components/ui/icon'
import { cn } from "#/lib/utils.ts"
import { HEBREW_MONTHS, fromYmd } from "#/lib/date-utils.ts"
import { Popover, PopoverTrigger, PopoverContent } from "#/components/ui/popover.tsx"
import { Calendar } from "#/components/ui/calendar.tsx"

export interface DatePickerProps {
  // "YYYY-MM-DD", or "" when nothing is selected yet.
  value: string
  onChange: (ymd: string) => void
  placeholder?: string
  disabled?: boolean | ((date: Date) => boolean)
  className?: string
}

function formatDisplay(ymd: string): string {
  const d = fromYmd(ymd)
  return `${d.getDate()} ${HEBREW_MONTHS[d.getMonth()]} ${d.getFullYear()}`
}

export const DatePicker: React.FC<DatePickerProps> = ({
  value,
  onChange,
  placeholder = "בחר תאריך",
  disabled,
  className,
}) => {
  const [open, setOpen] = React.useState(false)
  const isTriggerDisabled = typeof disabled === 'boolean' ? disabled : false
  const calendarDisabled = typeof disabled === 'function' ? disabled : undefined

  return (
    <Popover open={isTriggerDisabled ? false : open} onOpenChange={isTriggerDisabled ? undefined : setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={isTriggerDisabled}
          dir="rtl"
          className={cn(
            "flex h-12 w-full cursor-pointer items-center justify-start text-right gap-2 rounded-2xl border border-input bg-card px-4 font-assistant text-base text-foreground shadow-xs transition-all duration-150 ease-native outline-none focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-primary/10 md:h-11 md:text-base",
            isTriggerDisabled && "cursor-not-allowed opacity-60 bg-muted/40",
            className
          )}
        >
          <CalendarIcon size={18} className="shrink-0 text-muted-foreground" />
          <span className={cn("truncate text-right", !value && "text-muted-foreground/50")}>
            {value ? formatDisplay(value) : placeholder}
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto rounded-2xl border-border p-2 shadow-lg" dir="rtl">
        <Calendar
          selected={value || null}
          onSelect={(ymd) => {
            onChange(ymd)
            setOpen(false)
          }}
          disabled={calendarDisabled}
        />
      </PopoverContent>
    </Popover>
  )
}
export default DatePicker
