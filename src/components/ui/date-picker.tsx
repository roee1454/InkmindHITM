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
            "flex h-12 w-full cursor-pointer items-center gap-2 rounded-2xl border border-input/80 bg-card px-4 font-assistant text-base text-foreground shadow-xs transition-all duration-150 ease-native outline-none focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-primary/10 md:h-11 md:text-[15px]",
            className
          )}
        >
          <CalendarIcon size={18} className="shrink-0 text-muted-foreground" />
          <span className={cn("truncate", !value && "text-muted-foreground/50")}>
            {value ? formatDisplay(value) : placeholder}
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto rounded-2xl border-border/80 p-2 shadow-lg">
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
