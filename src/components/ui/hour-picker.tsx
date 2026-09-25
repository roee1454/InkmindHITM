import * as React from "react"
import { ChevronDown, Clock, Search } from '@/components/ui/icon'
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
  disabled?: boolean
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

// Chronological day segments (no wraparound) — mirrors how people actually talk about a day,
// so scanning the list means jumping to a segment instead of scrolling past 20 half-hours.
const TIME_GROUPS = [
  { key: 'dawn', label: 'לפנות בוקר', maxHour: 6 },
  { key: 'morning', label: 'בוקר', maxHour: 12 },
  { key: 'afternoon', label: 'צהריים', maxHour: 17 },
  { key: 'evening', label: 'ערב', maxHour: 21 },
  { key: 'night', label: 'לילה', maxHour: 24 },
] as const

function groupOptions(options: string[]): { key: string; label: string; times: string[] }[] {
  const groups = TIME_GROUPS.map((g) => ({ key: g.key, label: g.label, times: [] as string[] }))
  for (const time of options) {
    const hour = Number(time.slice(0, 2))
    const index = TIME_GROUPS.findIndex((g) => hour < g.maxHour)
    const group = groups[index === -1 ? groups.length - 1 : index]
    if (group) group.times.push(time)
  }
  return groups.filter((g) => g.times.length > 0)
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
  disabled = false,
}) => {
  const [open, setOpen] = React.useState(false)
  const [search, setSearch] = React.useState("")
  const options = React.useMemo(() => buildOptions(step, min, max, value), [step, min, max, value])
  const filteredOptions = React.useMemo(() => {
    const q = search.trim()
    return q ? options.filter((t) => t.includes(q)) : options
  }, [options, search])
  const groups = React.useMemo(() => groupOptions(filteredOptions), [filteredOptions])

  const listRef = React.useRef<HTMLDivElement>(null)
  const searchRef = React.useRef<HTMLInputElement>(null)

  React.useEffect(() => {
    if (!open) {
      setSearch("")
      return
    }
    const timer = setTimeout(() => {
      searchRef.current?.focus()
      const el = listRef.current?.querySelector<HTMLElement>('[data-selected="true"]')
      el?.scrollIntoView({ block: "nearest" })
    }, 0)
    return () => clearTimeout(timer)
  }, [open])

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault()
      listRef.current?.querySelector<HTMLButtonElement>("button")?.focus()
    }
  }

  const handleListKeyDown = (e: React.KeyboardEvent) => {
    const buttons = listRef.current ? Array.from(listRef.current.querySelectorAll<HTMLButtonElement>("button")) : []
    const currentIndex = buttons.findIndex((b) => b === document.activeElement)
    if (e.key === "ArrowDown") {
      e.preventDefault()
      buttons[Math.min(currentIndex + 1, buttons.length - 1)]?.focus()
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      if (currentIndex <= 0) {
        searchRef.current?.focus()
        return
      }
      buttons[currentIndex - 1]?.focus()
    }
  }

  return (
    <Popover open={disabled ? false : open} onOpenChange={disabled ? undefined : setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          dir="rtl"
          className={cn(
            "flex h-12 w-full cursor-pointer items-center justify-start text-right gap-2 rounded-2xl border border-input bg-card px-4 font-assistant text-base text-foreground shadow-xs transition-all duration-150 ease-native outline-none focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-primary/10 md:h-11 md:text-base",
            disabled && "cursor-not-allowed opacity-60 bg-muted/40",
            className
          )}
        >
          {!hideIcon && <Clock size={18} className="shrink-0 text-muted-foreground" />}
          <span className={cn("truncate text-right", !value && "text-muted-foreground/50")}>{value || placeholder}</span>
          {!disabled && (
            <ChevronDown
              size={14}
              className={cn(
                "shrink-0 text-muted-foreground/60 transition-transform duration-150 ease-native",
                open && "rotate-180",
              )}
            />
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-44 p-0" dir="rtl">
        <div className="relative border-b border-border p-2">
          <Search size={13} className="pointer-events-none absolute end-5 top-1/2 -translate-y-1/2 text-muted-foreground/50" />
          <input
            ref={searchRef}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={handleSearchKeyDown}
            placeholder="הקלד שעה…"
            dir="rtl"
            className="h-9 w-full rounded-lg border border-transparent bg-muted/50 px-3 pe-7 text-right font-assistant text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/50 focus:border-primary/40 focus:bg-card"
          />
        </div>
        <div
          ref={listRef}
          onKeyDown={handleListKeyDown}
          // The popover renders in its own portal outside the modal Sheet/Dialog it opens from.
          // That Dialog's scroll-lock (react-remove-scroll) intercepts touchmove document-wide and
          // blocks scrolling on anything it doesn't recognize as its own content — stopping
          // propagation here keeps the block from reaching this list, so it stays scrollable on
          // mobile.
          onTouchMove={(e) => e.stopPropagation()}
          className="max-h-60 overflow-y-auto overscroll-contain p-1"
        >
          {groups.length === 0 ? (
            <p className="px-3 py-6 text-center text-xs text-muted-foreground">לא נמצאה התאמה</p>
          ) : (
            groups.map((group) => (
              <div key={group.key}>
                <div className="sticky top-0 z-10 bg-popover px-2.5 py-1.5 font-assistant text-2xs font-bold text-muted-foreground/60">
                  {group.label}
                </div>
                {group.times.map((time) => (
                  <button
                    key={time}
                    type="button"
                    data-selected={time === value}
                    onClick={() => {
                      onChange(time)
                      setOpen(false)
                    }}
                    className={cn(
                      "block h-12 w-full cursor-pointer rounded-xl px-3 text-right font-assistant text-base tabular-nums outline-none transition-colors duration-100 hover:bg-muted focus:bg-muted",
                      time === value && "bg-primary/10 font-bold text-primary"
                    )}
                  >
                    {time}
                  </button>
                ))}
              </div>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
export default HourPicker
