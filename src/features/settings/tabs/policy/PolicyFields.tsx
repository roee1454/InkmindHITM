import { IMInput } from '@/components/ui/input'
import { IMSelect, IMSelectContent, IMSelectItem, IMSelectTrigger, IMSelectValue } from '@/components/ui/select'

/** Radix Select can't hold an empty value, so "not decided yet" gets a sentinel. */
const UNDECIDED = '__undecided__'

/** Marks a setting the studio still has to decide; the system then keeps today's behaviour. */
export function UndecidedBadge() {
  return (
    <span className="inline-flex shrink-0 items-center rounded-full bg-status-wait-soft px-2 py-0.5 text-2xs font-bold text-status-wait">
      ממתין להחלטה
    </span>
  )
}

interface PolicySelectProps {
  value: string
  onChange: (value: string) => void
  options: readonly { value: string; label: string }[]
  /** Label for "not decided yet"; omit for settings that always have a value. */
  undecidedLabel?: string
}

export function PolicySelect({ value, onChange, options, undecidedLabel }: PolicySelectProps) {
  return (
    <IMSelect value={value === '' ? UNDECIDED : value} onValueChange={(next) => onChange(next === UNDECIDED ? '' : next)}>
      <IMSelectTrigger className="w-full">
        <IMSelectValue />
      </IMSelectTrigger>
      <IMSelectContent dir="rtl">
        {undecidedLabel && <IMSelectItem value={UNDECIDED}>{undecidedLabel}</IMSelectItem>}
        {options.map((option) => (
          <IMSelectItem key={option.value} value={option.value}>
            {option.label}
          </IMSelectItem>
        ))}
      </IMSelectContent>
    </IMSelect>
  )
}

interface PolicyNumberInputProps {
  value: string
  onChange: (value: string) => void
  placeholder: string
  unit: string
}

/** Empty means "use the default", which the placeholder shows. */
export function PolicyNumberInput({ value, onChange, placeholder, unit }: PolicyNumberInputProps) {
  return (
    <div className="flex items-center gap-2">
      <IMInput
        type="number"
        inputMode="numeric"
        min={1}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-28 tabular-nums"
        dir="ltr"
      />
      <span className="text-xs text-muted-foreground">{unit}</span>
    </div>
  )
}
