import React, { useState, useEffect, useRef, useImperativeHandle } from 'react'
import { Search, X } from '@/components/ui/icon'
import { cn } from '@/lib/utils'
import { useDebouncedCallback } from '@/hooks/useDebounce'

export type SearchInputSize = 'default' | 'lg' | 'sm'
export type SearchInputVariant = 'card' | 'muted'

export function getSearchInputClasses(
  size: SearchInputSize,
  variant: SearchInputVariant,
  className?: string
) {
  const sizeClasses = {
    lg: 'h-13 md:h-12 ps-11 pe-10 text-base rounded-2xl',
    default: 'h-12 ps-10 pe-10 text-sm rounded-2xl',
    sm: 'h-9.5 ps-9 pe-8 text-xs rounded-xl',
  }[size]

  const variantClasses = {
    card: 'border-input bg-card text-foreground shadow-xs placeholder:text-muted-foreground/50 focus:border-primary focus:ring-4 focus:ring-primary/10',
    muted: 'border-border bg-muted/40 text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-4 focus:ring-primary/10',
  }[variant]

  return cn(
    'flex w-full items-center border font-assistant transition-all duration-150 ease-native outline-none',
    sizeClasses,
    variantClasses,
    className
  )
}

export interface SearchInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size' | 'onChange'> {
  value: string
  onChange: (value: string) => void
  onImmediateChange?: (value: string) => void
  onClear?: () => void
  debounceMs?: number
  size?: SearchInputSize
  variant?: SearchInputVariant
  clearable?: boolean
  containerRef?: React.Ref<HTMLDivElement>
  containerClassName?: string
  children?: React.ReactNode
}

export const SearchInput = React.forwardRef<HTMLInputElement, SearchInputProps>(
  (
    {
      value,
      onChange,
      onImmediateChange,
      onClear,
      debounceMs = 300,
      size = 'default',
      variant = 'card',
      clearable = true,
      containerRef,
      containerClassName,
      className,
      placeholder = 'חיפוש...',
      children,
      ...inputProps
    },
    ref
  ) => {
    const [localValue, setLocalValue] = useState(value)
    const inputRef = useRef<HTMLInputElement>(null)
    useImperativeHandle(ref, () => inputRef.current as HTMLInputElement)

    // Synchronize localValue when the external value changes
    useEffect(() => {
      setLocalValue(value)
    }, [value])

    const debouncedOnChange = useDebouncedCallback((val: string) => {
      onChange(val)
    }, debounceMs)

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const nextValue = e.target.value
      setLocalValue(nextValue)
      onImmediateChange?.(nextValue)

      if (debounceMs > 0) {
        debouncedOnChange(nextValue)
      } else {
        onChange(nextValue)
      }
    }

    const handleClear = () => {
      setLocalValue('')
      onImmediateChange?.('')
      onChange('')
      onClear?.()
      inputRef.current?.focus()
    }

    const iconSizeClasses = {
      lg: 'start-4 size-[18px]',
      default: 'start-3.5 size-[18px]',
      sm: 'start-3 size-4',
    }[size]

    const clearButtonClasses = {
      lg: 'end-3.5 size-6',
      default: 'end-3 size-6',
      sm: 'end-2.5 size-5',
    }[size]

    return (
      <div ref={containerRef} className={cn('relative w-full font-assistant', containerClassName)} dir="rtl">
        <Search
          className={cn(
            'pointer-events-none absolute top-1/2 -translate-y-1/2 text-muted-foreground/60 shrink-0',
            iconSizeClasses
          )}
        />

        <input
          ref={inputRef}
          type="text"
          value={localValue}
          onChange={handleChange}
          placeholder={placeholder}
          className={getSearchInputClasses(size, variant, className)}
          {...inputProps}
        />

        {clearable && localValue && (
          <button
            type="button"
            onClick={handleClear}
            className={cn(
              'absolute top-1/2 -translate-y-1/2 rounded-full flex items-center justify-center text-muted-foreground/60 hover:text-foreground hover:bg-muted/60 transition-colors cursor-pointer',
              clearButtonClasses
            )}
            title="נקה חיפוש"
            aria-label="נקה חיפוש"
          >
            <X size={size === 'sm' ? 12 : 14} />
          </button>
        )}

        {children}
      </div>
    )
  }
)

SearchInput.displayName = 'SearchInput'

