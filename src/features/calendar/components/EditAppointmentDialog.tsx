import React, { useState, useEffect } from 'react'
import { Send } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { AppointmentFormFields } from './AppointmentFormFields'
import type { ApiAppointment, ApiGoogleConnection, AppointmentFormValues } from '../types'
import { useWorkingHoursCheck } from '../use-working-hours-check'
import { ImageGalleryDialog } from './ImageGalleryDialog'

interface StaffItem {
  id: string
  name: string
}

interface EditAppointmentDialogProps {
  appointment: ApiAppointment | null
  onOpenChange: (open: boolean) => void
  staff: StaffItem[]
  googleConnections: ApiGoogleConnection[]
  onSave: (data: AppointmentFormValues) => void
  isSaving: boolean
  error: string | null
  onSendQuote: (priceIls: number, depositAmount: number) => void
  isSendingQuote: boolean
}

export const EditAppointmentDialog: React.FC<EditAppointmentDialogProps> = ({
  appointment,
  onOpenChange,
  staff,
  googleConnections,
  onSave,
  isSaving,
  error,
  onSendQuote,
  isSendingQuote,
}) => {
  const [values, setValues] = useState<AppointmentFormValues | null>(null)
  const [localError, setLocalError] = useState<string | null>(null)
  const [selectedGallery, setSelectedGallery] = useState<{ images: string[]; index: number } | null>(null)

  useEffect(() => {
    if (!appointment) {
      setValues(null)
      return
    }
    setValues({
      customerId: appointment.customerId,
      chatId: appointment.chatId,
      leadName: appointment.leadName ?? '',
      leadPhone: appointment.leadPhone ?? '',
      date: appointment.date,
      timeSlot: appointment.timeSlot,
      staffId: appointment.staffId,
      durationHours: appointment.durationHours ?? 2.0,
      tattooDescription: appointment.style ?? '',
      priceIls: appointment.price,
      depositAmount: appointment.depositAmount,
      status: appointment.status,
      depositPaid: appointment.hasDeposit,
      notes: appointment.notes ?? '',
      allowException: appointment.isException,
    })
    setLocalError(null)
  }, [appointment])

  const handleChange = (patch: Partial<AppointmentFormValues>) =>
    setValues((prev) => (prev ? { ...prev, ...patch } : prev))

  const { fitsWorkingHours } = useWorkingHoursCheck(
    values?.staffId ?? null,
    values?.date ?? '',
    values?.timeSlot ?? '',
    values?.durationHours ?? 2,
  )

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!values) return
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
    <Dialog open={appointment !== null} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg rounded-2xl text-right font-assistant max-h-[90vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle>עריכת תור</DialogTitle>
          <DialogDescription>עדכן את פרטי הלקוח, מועד התור, המקעקע והסטטוס.</DialogDescription>
        </DialogHeader>

        {displayError && <p className="text-xs font-semibold text-rose-400">{displayError}</p>}

        {values && (
          <form onSubmit={handleSubmit} className="mt-2 space-y-4">
            <AppointmentFormFields
              values={values}
              onChange={handleChange}
              staff={staff}
              googleConnections={googleConnections}
              isEdit={true}
            />

            {appointment?.source === 'ai_bot' && appointment.status === 'pending' && (
              <div className="space-y-2 rounded-xl border border-primary/20 bg-primary/5 p-3">
                <p className="text-xs font-semibold text-foreground">
                  בקשת הזמנה מהבוט — ממתינה להצעת מחיר
                </p>
                <p className="text-[11px] text-muted-foreground">
                  מלא/י מחיר ומקדמה למעלה ואז שלח/י ללקוח את הצעת המחיר בוואטסאפ.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  disabled={isSendingQuote || values.priceIls == null || values.depositAmount == null}
                  onClick={() => values.priceIls != null && values.depositAmount != null && onSendQuote(values.priceIls, values.depositAmount)}
                  className="w-full rounded-xl cursor-pointer"
                >
                  <Send size={14} className="ml-1.5" />
                  {isSendingQuote ? 'שולח הצעת מחיר…' : 'שלח הצעת מחיר ללקוח'}
                </Button>
              </div>
            )}

            {appointment?.referenceImages && appointment.referenceImages.length > 0 && (
              <div className="space-y-2 mt-4 border-t border-border pt-3">
                <span className="text-xs font-semibold text-muted-foreground">תמונות התייחסות</span>
                <div className="flex gap-2 overflow-x-auto py-1">
                  {appointment.referenceImages.map((img, idx) => (
                    <div
                      key={idx}
                      onClick={() => setSelectedGallery({ images: appointment.referenceImages!, index: idx })}
                      className="relative w-16 h-16 rounded-lg overflow-hidden border border-border shrink-0 bg-muted cursor-pointer hover:border-primary transition-colors"
                    >
                      <img src={img} alt={`Reference ${idx + 1}`} className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
              </div>
            )}

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
        )}
      </DialogContent>

      {selectedGallery && (
        <ImageGalleryDialog
          images={selectedGallery.images}
          initialIndex={selectedGallery.index}
          open={selectedGallery !== null}
          onOpenChange={(open) => !open && setSelectedGallery(null)}
        />
      )}
    </Dialog>
  )
}

export default EditAppointmentDialog
