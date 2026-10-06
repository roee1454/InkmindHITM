import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

/** A labelled row of choice chips, for the quote sheet's duration and session-count fields. */
export function QuoteChoiceChips<T extends string | number | null>({
  label,
  hint,
  options,
  value,
  onChange,
  columns = 4,
}: {
  label: string
  hint?: string
  options: ReadonlyArray<{ label: string; value: T }>
  value: T
  onChange: (value: T) => void
  columns?: 3 | 4 | 5
}) {
  return (
    <div className="space-y-2">
      <Label className="block text-xs font-extrabold text-foreground">{label}</Label>
      <div className={cn('grid gap-2', columns === 3 ? 'grid-cols-3' : columns === 5 ? 'grid-cols-5' : 'grid-cols-4')}>
        {options.map((option) => (
          <button
            type="button"
            key={String(option.value)}
            onClick={() => onChange(option.value)}
            className={cn(
              'flex h-10 cursor-pointer select-none items-center justify-center rounded-xl border text-xs font-extrabold transition-all active:scale-[0.96]',
              value === option.value
                ? 'border-primary bg-primary text-primary-foreground shadow-xs'
                : 'border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground',
            )}
          >
            {option.label}
          </button>
        ))}
      </div>
      {hint && <p className="text-2xs text-muted-foreground">{hint}</p>}
    </div>
  )
}
