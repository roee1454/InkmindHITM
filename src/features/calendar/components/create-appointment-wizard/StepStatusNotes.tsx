import React from 'react'
import { IMTextarea } from '@/components/ui/textarea'
import { IMSelect, IMSelectContent, IMSelectItem, IMSelectTrigger, IMSelectValue } from '@/components/ui/select'
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
        <IMSelect value={values.status} onValueChange={(val) => onChange({ status: val as AppointmentStatus })}>
          <IMSelectTrigger className="w-full">
            <IMSelectValue />
          </IMSelectTrigger>
          <IMSelectContent align="end">
            {Object.entries(STATUS_LABELS).map(([key, label]) => (
              <IMSelectItem key={key} value={key}>
                {label}
              </IMSelectItem>
            ))}
          </IMSelectContent>
        </IMSelect>
        {values.status === 'pending' && (
          <p className="text-2xs text-muted-foreground">
            תור ממתין הוא החזקה עד אישור. אם לא יאושר תוך 48 שעות הוא משתחרר אוטומטית, והלקוח לא מקבל עליו תזכורות.
          </p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold text-foreground">הערות פנימיות לצוות (אופציונלי)</label>
        <IMTextarea
          rows={3}
          placeholder="הערות תפעוליות לצוות הסטודיו (למשל: רגישות לחומרים, מלווה, בקשות מיוחדות)…"
          value={values.notes}
          onChange={(e) => onChange({ notes: e.target.value })}
          className="h-[72px] resize-none text-xs"
        />
      </div>
    </div>
  )
}

export default StepStatusNotes
