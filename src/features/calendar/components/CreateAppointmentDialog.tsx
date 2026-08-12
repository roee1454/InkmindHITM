import React, { useState, useEffect } from 'react'
import { ResponsiveDialog } from '@/components/ui/responsive-dialog'
import { Button } from '@/components/ui/button'
import { AppointmentFormFields } from './AppointmentFormFields'
import type { ApiGoogleConnection, AppointmentFormValues } from '../types'
import { useWorkingHoursCheck } from '../use-working-hours-check'

interface StaffItem {
  id: string
  name: string
}

interface CreateAppointmentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  staff: StaffItem[]
  googleConnections: ApiGoogleConnection[]
  onSave: (data: AppointmentFormValues) => void
  isSaving: boolean
  error: string | null
  initialChatId?: string
  initialDate?: string
  initialTimeSlot?: string
}

function emptyValues(): AppointmentFormValues {
  return {
    customerId: null,
    chatId: null,
    leadName: '',
    leadPhone: '',
    date: '',
    timeSlot: '',
    staffId: null,
    durationMinutes: 120,
    tattooDescription: '',
    priceMinIls: null,
    priceMaxIls: null,
    depositAmount: null,
    status: 'pending',
    depositPaid: false,
    notes: '',
    allowException: false,
  }
}

export const CreateAppointmentDialog: React.FC<CreateAppointmentDialogProps> = ({
  open,
  onOpenChange,
  staff,
  googleConnections,
  onSave,
  isSaving,
  error,
  initialChatId,
  initialDate,
  initialTimeSlot,
}) => {
  const [values, setValues] = useState<AppointmentFormValues>(emptyValues)
  const [localError, setLocalError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setValues({
      ...emptyValues(),
      chatId: initialChatId ?? null,
      date: initialDate ?? '',
      timeSlot: initialTimeSlot ?? '',
    })
    setLocalError(null)
  }, [open, initialChatId, initialDate, initialTimeSlot])

  const handleChange = (patch: Partial<AppointmentFormValues>) =>
    setValues((prev) => ({ ...prev, ...patch }))

  const { fitsWorkingHours, isStudioClosed } = useWorkingHoursCheck(
    values.staffId,
    values.date,
    values.timeSlot,
    values.durationMinutes / 60,
  )

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!values.customerId || !values.date || !values.timeSlot) {
      setLocalError('נא לבחור לקוח, תאריך ושעה')
      return
    }
    if (isStudioClosed && !values.allowException) {
      setLocalError('יש לסמן שאתם מודעים שהסטודיו סגור בתאריך זה')
      return
    }
    if (!fitsWorkingHours && !values.allowException) {
      setLocalError('יש לסמן שאתם מודעים שהתור מחוץ לשעות העבודה')
      return
    }
    onSave(values)
  }

  const displayError = error || localError

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title="תור חדש"
      description="הזן את פרטי הלקוח והתור. ניתן לקבוע תור גם ללקוח מזדמן, ללא שיחת ווטסאפ."
      contentClassName="sm:max-w-lg max-h-[90vh] overflow-y-auto"
    >
      {displayError && <p className="text-[13px] font-bold text-destructive">{displayError}</p>}

      <form onSubmit={handleSubmit} className="mt-2 space-y-4">
        <AppointmentFormFields
          values={values}
          onChange={handleChange}
          staff={staff}
          googleConnections={googleConnections}
          isEdit={false}
        />

        <div className="grid grid-cols-2 gap-3 pt-2">
          <Button type="submit" disabled={isSaving}>
            {isSaving ? 'שומר…' : 'שמור'}
          </Button>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            ביטול
          </Button>
        </div>
      </form>
    </ResponsiveDialog>
  )
}

export default CreateAppointmentDialog
