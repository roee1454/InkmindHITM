import * as React from "react"
import { Calendar as CalendarIcon } from "lucide-react"
import { cn } from "#/lib/utils.ts"
import { HEBREW_MONTHS, fromYmd } from "#/lib/date-utils.ts"
import { Popover, PopoverTrigger, PopoverContent } from "#/components/ui/popover.tsx"
import { Calendar } from "#/components/ui/calendar.tsx"

export interface DatePickerProps {
  // "YYYY-MM-DD", or "" when nothing is selected yet.
  value: string
  onChange: (ymd: string) => void
  placeholder?: string
  disabled?: (date: Date) => boolean
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

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "flex h-10 w-full cursor-pointer items-center gap-2 rounded-xl border border-input bg-muted px-3 py-2 font-assistant text-xs text-foreground focus-visible:border-primary/50 focus-visible:outline-none",
            className
          )}
        >
          <CalendarIcon size={14} className="shrink-0 text-muted-foreground" />
          <span className={cn("truncate", !value && "text-muted-foreground")}>
            {value ? formatDisplay(value) : placeholder}
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto">
        <Calendar
          selected={value || null}
          onSelect={(ymd) => {
            onChange(ymd)
            setOpen(false)
          }}
          disabled={disabled}
        />
      </PopoverContent>
    </Popover>
  )
}
export default DatePicker
