import React from 'react'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { AppointmentFormValues, AppointmentStatus } from '../../types'
import { STATUS_LABELS } from '../../types'

interface StepStatusNotesProps {
  values: AppointmentFormValues
  onChange: (patch: Partial<AppointmentFormValues>) => void
}

export const StepStatusNotes: React.FC<StepStatusNotesProps> = ({ values, onChange }) => {
  return (
    <div className="space-y-4 font-assistant" dir="rtl">
      <div className="flex flex-col gap-1.5" dir="rtl">
        <label className="text-xs font-semibold text-foreground">סטטוס</label>
        <Select value={values.status} onValueChange={(val) => onChange({ status: val as AppointmentStatus })}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent align="end">
            {Object.entries(STATUS_LABELS).map(([key, label]) => (
              <SelectItem key={key} value={key}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold text-foreground">הערות</label>
        <Textarea
          rows={3}
          value={values.notes}
          onChange={(e) => onChange({ notes: e.target.value })}
          className="h-[72px] resize-none"
        />
      </div>
    </div>
  )
}

export default StepStatusNotes
