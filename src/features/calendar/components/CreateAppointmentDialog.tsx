import React, { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
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
    durationHours: 2.0,
    tattooDescription: '',
    priceIls: null,
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

  const { fitsWorkingHours } = useWorkingHoursCheck(values.staffId, values.date, values.timeSlot, values.durationHours)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!values.customerId || !values.date || !values.timeSlot) {
      setLocalError('נא לבחור לקוח, תאריך ושעה')
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg rounded-2xl text-right font-assistant max-h-[90vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle>תור חדש</DialogTitle>
          <DialogDescription>הזן את פרטי הלקוח והתור. ניתן לקבוע תור גם ללקוח מזדמן, ללא שיחת ווטסאפ.</DialogDescription>
        </DialogHeader>

        {displayError && <p className="text-xs font-semibold text-rose-400">{displayError}</p>}

        <form onSubmit={handleSubmit} className="mt-2 space-y-4">
          <AppointmentFormFields
            values={values}
            onChange={handleChange}
            staff={staff}
            googleConnections={googleConnections}
            isEdit={false}
          />

          <div className="grid grid-cols-2 gap-3 pt-2">
            <Button type="submit" disabled={isSaving} className="rounded-xl font-bold cursor-pointer">
              {isSaving ? 'שומר…' : 'שמור'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="rounded-xl font-bold cursor-pointer"
            >
              ביטול
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default CreateAppointmentDialog
