import React from 'react'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import type { AppointmentFormValues } from '../../types'

interface StepPricingDepositProps {
  values: AppointmentFormValues
  onChange: (patch: Partial<AppointmentFormValues>) => void
}

export const StepPricingDeposit: React.FC<StepPricingDepositProps> = ({ values, onChange }) => {
  return (
    <div className="space-y-4 font-assistant" dir="rtl">
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-foreground">מחיר מינימלי (₪)</label>
          <Input
            type="number"
            min="0"
            value={values.priceMinIls ?? ''}
            onChange={(e) => onChange({ priceMinIls: e.target.value === '' ? null : Number(e.target.value) })}
            dir="rtl"
            className="text-right"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-foreground">מחיר מקסימלי (₪)</label>
          <Input
            type="number"
            min="0"
            value={values.priceMaxIls ?? ''}
            onChange={(e) => onChange({ priceMaxIls: e.target.value === '' ? null : Number(e.target.value) })}
            dir="rtl"
            className="text-right"
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold text-foreground">מקדמה (₪)</label>
        <Input
          type="number"
          min="0"
          value={values.depositAmount ?? ''}
          onChange={(e) => onChange({ depositAmount: e.target.value === '' ? null : Number(e.target.value) })}
          dir="rtl"
          className="text-right"
        />
      </div>

      <div className="flex items-center justify-between border-t border-border/60 pt-4">
        <div className="flex flex-col gap-0.5">
          <span className="text-xs font-bold text-foreground">מקדמה שולמה</span>
          <span className="text-micro text-muted-foreground">סמן אם מקדמת התור שולמה</span>
        </div>
        <Switch
          id="appointment-deposit-paid"
          checked={values.depositPaid}
          onCheckedChange={(checked) => onChange({ depositPaid: checked })}
        />
      </div>
    </div>
  )
}

export default StepPricingDeposit
