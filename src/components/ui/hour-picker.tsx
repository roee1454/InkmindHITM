import * as React from "react"

import { imPickerTriggerClasses } from "@/components/ui/date-picker"
import { ChevronDown, Clock } from "@/components/ui/icon"
import { IMPopover, IMPopoverContent, IMPopoverTrigger } from "@/components/ui/popover"
import { IMSearchInput } from "@/components/ui/search-input"
import { minutesToTime, timeToMinutes } from "@/lib/date-utils"
import { cn } from "@/lib/utils"

export interface IMHourPickerProps {
  /** "HH:MM", or "" when nothing is selected yet. */
  value: string
  onChange: (time: string) => void
  /** Minutes between options — a 30-minute cadence by default. */
  step?: number
  min?: string
  max?: string
  placeholder?: string
  className?: string
  /** Dense layouts (a tight inline start–end pair) can drop the leading clock icon. */
  hideIcon?: boolean
  disabled?: boolean
}

/** The option grid for [min, max] at `step`, with `value` sorted in if it isn't on the grid. */
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

// Chronological day segments (no wraparound) — how people talk about a day, so scanning the list
// means jumping to a segment instead of scrolling past 20 half-hours.
const TIME_GROUPS = [
  { key: "dawn", label: "לפנות בוקר", maxHour: 6 },
  { key: "morning", label: "בוקר", maxHour: 12 },
  { key: "afternoon", label: "צהריים", maxHour: 17 },
  { key: "evening", label: "ערב", maxHour: 21 },
  { key: "night", label: "לילה", maxHour: 24 },
] as const

function groupOptions(options: string[]): { key: string; label: string; times: string[] }[] {
  const groups = TIME_GROUPS.map((g) => ({ key: g.key, label: g.label, times: [] as string[] }))
  for (const time of options) {
    const hour = Number(time.slice(0, 2))
    const index = TIME_GROUPS.findIndex((g) => hour < g.maxHour)
    groups[index === -1 ? groups.length - 1 : index]?.times.push(time)
  }
  return groups.filter((g) => g.times.length > 0)
}

/** Time entry: an IMInput-styled trigger that opens a filterable list of slots, grouped by part of day. */
export function IMHourPicker({
  value,
  onChange,
  step = 30,
  min = "00:00",
  max = "23:30",
  placeholder = "בחירת שעה",
  className,
  hideIcon = false,
  disabled = false,
}: IMHourPickerProps) {
  const [open, setOpen] = React.useState(false)
  const [search, setSearch] = React.useState("")
  const options = React.useMemo(() => buildOptions(step, min, max, value), [step, min, max, value])
  const groups = React.useMemo(() => {
    const q = search.trim()
    return groupOptions(q ? options.filter((t) => t.includes(q)) : options)
  }, [options, search])

  const listRef = React.useRef<HTMLDivElement>(null)
  const searchRef = React.useRef<HTMLInputElement>(null)

  React.useEffect(() => {
    if (!open) {
      setSearch("")
      return
    }
    const timer = setTimeout(() => {
      searchRef.current?.focus()
      listRef.current?.querySelector<HTMLElement>('[data-selected="true"]')?.scrollIntoView({ block: "nearest" })
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
    const current = buttons.findIndex((b) => b === document.activeElement)
    if (e.key === "ArrowDown") {
      e.preventDefault()
      buttons[Math.min(current + 1, buttons.length - 1)]?.focus()
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      if (current <= 0) searchRef.current?.focus()
      else buttons[current - 1]?.focus()
    }
  }

  return (
    <IMPopover open={disabled ? false : open} onOpenChange={disabled ? undefined : setOpen}>
      <IMPopoverTrigger asChild>
        <button type="button" disabled={disabled} className={cn(imPickerTriggerClasses, className)}>
          {/* Phase 1b: <IMIcon name="clock" size="sm" tone="muted" /> … <IMIcon name="chevron-down" size="sm" tone="muted" /> */}
          {!hideIcon && <Clock aria-hidden className="size-4 shrink-0 text-muted-foreground" />}
          <span className={cn("min-w-0 flex-1 truncate tabular-nums", !value && "text-muted-foreground/70")}>
            {value || placeholder}
          </span>
          {!disabled && <ChevronDown aria-hidden className="size-4 shrink-0 text-muted-foreground" />}
        </button>
      </IMPopoverTrigger>
      <IMPopoverContent className="w-48 p-0" dir="rtl">
        <div className="border-b border-border p-2">
          <IMSearchInput
            ref={searchRef}
            size="sm"
            variant="subtle"
            value={search}
            onChange={setSearch}
            onImmediateChange={setSearch}
            onKeyDown={handleSearchKeyDown}
            placeholder="הקלדת שעה…"
          />
        </div>
        <div
          ref={listRef}
          onKeyDown={handleListKeyDown}
          // The popover renders in its own portal outside the modal sheet/dialog it opens from. That
          // dialog's scroll-lock (react-remove-scroll) intercepts touchmove document-wide and blocks
          // scrolling on anything it doesn't recognise as its own content — stopping propagation
          // here keeps the block from reaching this list, so it stays scrollable on phones.
          onTouchMove={(e) => e.stopPropagation()}
          className="max-h-60 overflow-y-auto overscroll-contain p-1.5"
        >
          {groups.length === 0 ? (
            <p className="px-3 py-6 text-center text-xs font-medium text-muted-foreground">לא נמצאה התאמה</p>
          ) : (
            groups.map((group) => (
              <div key={group.key}>
                <div className="sticky top-0 z-10 bg-popover px-3 py-1.5 text-2xs font-semibold text-muted-foreground">
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
                      "flex h-11 w-full cursor-pointer items-center rounded-md px-3 text-start text-base font-medium tabular-nums outline-none transition-colors duration-100 hover:bg-surface-2 focus-visible:bg-surface-2",
                      time === value && "bg-accent-soft font-bold"
                    )}
                  >
                    {time}
                  </button>
                ))}
              </div>
            ))
          )}
        </div>
      </IMPopoverContent>
    </IMPopover>
  )
}
