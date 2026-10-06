import * as React from "react"

import { Search, X } from "@/components/ui/icon"
import { IMInput } from "@/components/ui/input"
import { useDebouncedCallback } from "@/hooks/useDebounce"
import { cn } from "@/lib/utils"

/** How long typing has to pause before the parent hears about it. */
const DEBOUNCE_MS = 300

type IMSearchInputVariant = "default" | "subtle"
type IMSearchInputSize = "md" | "sm"

const SIZES: Record<IMSearchInputSize, { input: string; icon: string }> = {
  md: { input: "ps-10.5 pe-10", icon: "start-3.5" },
  // Inside pickers and menus: 38px, body-sm text, also on touch.
  sm: { input: "h-9.5 ps-9 pe-9 text-sm", icon: "start-3" },
}

const VARIANTS: Record<IMSearchInputVariant, string> = {
  default: "",
  // Inside a toolbar or popover: a recessed fill, no shadow.
  subtle: "bg-surface-2/55 shadow-none",
}

export interface IMSearchInputProps
  extends Omit<React.ComponentProps<"input">, "size" | "onChange" | "value" | "ref"> {
  value: string
  /** The settled value, after typing pauses. */
  onChange: (value: string) => void
  /** Every keystroke, for UI that must follow the text immediately. */
  onImmediateChange?: (value: string) => void
  onClear?: () => void
  /** `default` on a page · `subtle` inside a toolbar or popover. */
  variant?: IMSearchInputVariant
  /** `md` (default) · `sm` inside pickers and menus. */
  size?: IMSearchInputSize
  containerRef?: React.Ref<HTMLDivElement>
  containerClassName?: string
}

/**
 * A search field with a leading search icon and a clear button once it has a value. Debounced: the
 * parent's `onChange` receives the settled value.
 */
export const IMSearchInput = React.forwardRef<HTMLInputElement, IMSearchInputProps>(function IMSearchInput(
  {
    value,
    onChange,
    onImmediateChange,
    onClear,
    variant = "default",
    size = "md",
    containerRef,
    containerClassName,
    className,
    placeholder = "חיפוש…",
    ...inputProps
  },
  ref
) {
  const [localValue, setLocalValue] = React.useState(value)
  const inputRef = React.useRef<HTMLInputElement>(null)
  React.useImperativeHandle(ref, () => inputRef.current as HTMLInputElement)

  // Follow the parent when it changes the value itself (a reset, a deep link).
  React.useEffect(() => {
    setLocalValue(value)
  }, [value])

  const settle = useDebouncedCallback((next: string) => onChange(next), DEBOUNCE_MS)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const next = e.target.value
    setLocalValue(next)
    onImmediateChange?.(next)
    settle(next)
  }

  const handleClear = () => {
    setLocalValue("")
    onImmediateChange?.("")
    onChange("")
    onClear?.()
    inputRef.current?.focus()
  }

  return (
    <div
      ref={containerRef}
      data-slot="search-input"
      data-variant={variant}
      data-size={size}
      className={cn("relative flex w-full items-center", containerClassName)}
    >
      {/* Phase 1b: <IMIcon name="search" size="sm" tone="muted" /> */}
      <Search
        aria-hidden
        className={cn("pointer-events-none absolute size-4 text-muted-foreground", SIZES[size].icon)}
      />
      <IMInput
        ref={inputRef}
        type="text"
        value={localValue}
        onChange={handleChange}
        placeholder={placeholder}
        className={cn(SIZES[size].input, VARIANTS[variant], className)}
        {...inputProps}
      />
      {localValue && (
        <button
          type="button"
          onClick={handleClear}
          aria-label="ניקוי החיפוש"
          className="absolute end-2 grid size-7 cursor-pointer place-items-center rounded-full text-muted-foreground outline-none transition-colors hover:bg-surface-2 hover:text-foreground focus-visible:ring-4 focus-visible:ring-ring/35"
        >
          {/* Phase 1b: <IMIcon name="close" size="xs" /> */}
          <X className="size-3.5" />
        </button>
      )}
    </div>
  )
})
