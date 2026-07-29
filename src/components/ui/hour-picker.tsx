import * as React from "react"
import { Clock } from "lucide-react"
import { cn } from "#/lib/utils.ts"
import { minutesToTime, timeToMinutes } from "#/lib/date-utils.ts"
import { Popover, PopoverTrigger, PopoverContent } from "#/components/ui/popover.tsx"

export interface HourPickerProps {
  // "HH:MM", or "" when nothing is selected yet.
  value: string
  onChange: (time: string) => void
  // Minute step between options — defaults to a 30-minute cadence.
  step?: number
  min?: string
  max?: string
  placeholder?: string
  className?: string
  // Compact/dense layouts (e.g. a tight inline start–end pair) can drop the leading clock icon.
  hideIcon?: boolean
}

// Builds the option grid for [min, max] at the given step, then — if value doesn't land on that
// grid — injects and sorts it in.
function buildOptions(step: number, min: string, max: string, value: string): string[] {
  const options: string[] = []
  for (let m = timeToMinutes(min); m <= timeToMinutes(max); m += step) {
    options.push(minutesToTime(m))
  }
  if (value && !options.includes(value)) {
    options.push(value)
    options.sort()
  }
  return options
}

export const HourPicker: React.FC<HourPickerProps> = ({
  value,
  onChange,
  step = 30,
  min = "00:00",
  max = "23:30",
  placeholder = "בחר שעה",
  className,
  hideIcon = false,
}) => {
  const [open, setOpen] = React.useState(false)
  const options = React.useMemo(() => buildOptions(step, min, max, value), [step, min, max, value])
  const listRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    if (!open) return
    const el = listRef.current?.querySelector<HTMLElement>('[data-selected="true"]') ?? listRef.current?.firstElementChild
    el?.scrollIntoView({ block: "nearest" })
  }, [open])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    const buttons = listRef.current ? Array.from(listRef.current.querySelectorAll<HTMLButtonElement>("button")) : []
    const currentIndex = buttons.findIndex((b) => b === document.activeElement)
    if (e.key === "ArrowDown") {
      e.preventDefault()
      buttons[Math.min(currentIndex + 1, buttons.length - 1)]?.focus()
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      buttons[Math.max(currentIndex - 1, 0)]?.focus()
    }
  }

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
          {!hideIcon && <Clock size={14} className="shrink-0 text-muted-foreground" />}
          <span className={cn("truncate", !value && "text-muted-foreground")}>{value || placeholder}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-28 p-1">
        <div ref={listRef} onKeyDown={handleKeyDown} className="max-h-60 overflow-y-auto">
          {options.map((time) => (
            <button
              key={time}
              type="button"
              data-selected={time === value}
              onClick={() => {
                onChange(time)
                setOpen(false)
              }}
              className={cn(
                "block w-full cursor-pointer rounded-lg px-3 py-1.5 text-right text-xs outline-none hover:bg-muted focus:bg-muted",
                time === value && "bg-primary/10 font-bold text-primary"
              )}
            >
              {time}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  )
}
export default HourPicker
