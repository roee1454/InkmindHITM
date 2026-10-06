import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Plus, X } from '@/components/ui/icon'
import { PAYMENT_METHODS } from '../types'
import type { PaymentMethod } from '../types'
import { PAYMENT_METHOD_LABELS } from '../utils/labels'

export interface PaymentRowDraft {
  method: PaymentMethod
  amount: string
}

/** Money received at the end of the session — one row per payment method used. */
export function PaymentRowsEditor({ rows, onChange, disabled }: { rows: PaymentRowDraft[]; onChange: (rows: PaymentRowDraft[]) => void; disabled?: boolean }) {
  const update = (index: number, patch: Partial<PaymentRowDraft>) => onChange(rows.map((row, i) => (i === index ? { ...row, ...patch } : row)))

  return (
    <div className="flex flex-col gap-2">
      {rows.map((row, index) => (
        <div key={index} className="flex items-center gap-2">
          <Select value={row.method} onValueChange={(method) => update(index, { method: method as PaymentMethod })} disabled={disabled}>
            <SelectTrigger className="w-36 shrink-0 text-start" dir="rtl" aria-label="אמצעי תשלום">
              <SelectValue />
            </SelectTrigger>
            <SelectContent align="end" dir="rtl">
              {PAYMENT_METHODS.map((method) => (
                <SelectItem key={method} value={method}>
                  {PAYMENT_METHOD_LABELS[method]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            type="number"
            inputMode="decimal"
            min={0}
            placeholder="סכום ₪"
            aria-label="סכום"
            value={row.amount}
            onChange={(event) => update(index, { amount: event.target.value })}
            disabled={disabled}
            className="flex-1"
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="הסרת תשלום"
            disabled={disabled}
            onClick={() => onChange(rows.filter((_, i) => i !== index))}
          >
            <X size={16} />
          </Button>
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="self-start gap-1.5"
        disabled={disabled}
        onClick={() => onChange([...rows, { method: 'cash', amount: '' }])}
      >
        <Plus size={14} />
        הוספת תשלום
      </Button>
    </div>
  )
}
