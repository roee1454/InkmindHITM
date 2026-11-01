import { IMInput } from '@/components/ui/input'
import { IMLabel } from '@/components/ui/label'

/** The tattoo quote's estimated price range, in shekels. */
export function QuotePriceRange({
  min,
  max,
  onMinChange,
  onMaxChange,
}: {
  min: string
  max: string
  onMinChange: (value: string) => void
  onMaxChange: (value: string) => void
}) {
  return (
    <div className="space-y-2">
      <IMLabel className="text-xs font-extrabold text-foreground block">
        טווח מחירים משוער למפגש
      </IMLabel>
      <div className="grid grid-cols-2 gap-3">
        <div className="relative">
          <IMInput
            type="number"
            inputMode="numeric"
            placeholder="מינימום"
            value={min}
            onChange={(e) => onMinChange(e.target.value)}
            className="h-12 rounded-2xl text-base font-bold tabular-nums pl-8"
          />
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">
            ₪
          </span>
        </div>
        <div className="relative">
          <IMInput
            type="number"
            inputMode="numeric"
            placeholder="מקסימום"
            value={max}
            onChange={(e) => onMaxChange(e.target.value)}
            className="h-12 rounded-2xl text-base font-bold tabular-nums pl-8"
          />
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">
            ₪
          </span>
        </div>
      </div>
    </div>
  )
}
