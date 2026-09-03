import React, { useState, useEffect } from 'react'
import { Send } from 'lucide-react'
import { ResponsiveDialog } from '@/components/ui/responsive-dialog'
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
  onSendQuote: (priceMinIls: number, priceMaxIls: number, depositAmount: number, durationMinutes: number) => void
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
      type: appointment.type || 'tattoo',
      date: appointment.date,
      timeSlot: appointment.timeSlot,
      staffId: appointment.staffId,
      durationMinutes: appointment.durationMinutes ?? 120,
      tattooDescription: appointment.style ?? '',
      priceMinIls: appointment.priceMin,
      priceMaxIls: appointment.priceMax,
      depositAmount: appointment.depositAmount,
      status: appointment.status,
      depositPaid: appointment.hasDeposit,
      notes: appointment.notes ?? '',
      allowException: appointment.isException,
      referenceImages: appointment.referenceImages,
      paymentReceiptUrl: appointment.paymentReceiptUrl,
      healthDeclarationSigned: appointment.healthDeclarationSigned,
      healthDeclarationDate: appointment.healthDeclarationDate,
      healthDeclarationFileUrl: appointment.healthDeclarationFileUrl,
    })
    setLocalError(null)
  }, [appointment])

  const handleChange = (patch: Partial<AppointmentFormValues>) =>
    setValues((prev) => (prev ? { ...prev, ...patch } : prev))

  const { fitsWorkingHours, isStudioClosed } = useWorkingHoursCheck(
    values?.staffId ?? null,
    values?.date ?? '',
    values?.timeSlot ?? '',
    (values?.durationMinutes ?? 120) / 60,
  )

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!values) return
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
    <>
      <ResponsiveDialog
        open={appointment !== null}
        onOpenChange={onOpenChange}
        title="עריכת תור"
        description="עדכן את פרטי הלקוח, מועד התור, המקעקע והסטטוס."
        contentClassName="sm:max-w-lg max-h-[90vh] overflow-y-auto"
      >
        {displayError && <p className="text-[13px] font-bold text-destructive">{displayError}</p>}

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
              <div className="space-y-2 rounded-2xl border border-primary/20 bg-primary/5 p-3.5">
                <p className="text-[13px] font-bold text-foreground">
                  בקשת הזמנה מהבוט — ממתינה להצעת מחיר
                </p>
                <p className="text-[12.5px] text-muted-foreground">
                  מלא/י טווח מחיר ומקדמה למעלה ואז שלח/י ללקוח את הצעת המחיר בוואטסאפ.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  disabled={isSendingQuote || values.priceMinIls == null || values.priceMaxIls == null || values.depositAmount == null}
                  onClick={() =>
                    values.priceMinIls != null &&
                    values.priceMaxIls != null &&
                    values.depositAmount != null &&
                    onSendQuote(values.priceMinIls, values.priceMaxIls, values.depositAmount, values.durationMinutes)
                  }
                  className="w-full"
                >
                  <Send size={14} className="ml-1.5" />
                  {isSendingQuote ? 'שולח הצעת מחיר…' : 'שלח הצעת מחיר ללקוח'}
                </Button>
              </div>
            )}

            {/* Linked Documents & Media Section */}
            <div className="space-y-3 mt-4 border-t border-border/60 pt-3" dir="rtl">
              <span className="text-[13px] font-bold text-foreground">מסמכים ומדיה מקושרים</span>

              {/* Reference / Inspiration Images */}
              {appointment?.referenceImages && appointment.referenceImages.length > 0 ? (
                <div className="space-y-1.5 rounded-xl border border-border/70 bg-card p-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-muted-foreground">תמונות השראה ורפרנס ({appointment.referenceImages.length})</span>
                  </div>
                  <div className="flex gap-2 overflow-x-auto py-1">
                    {appointment.referenceImages.map((img, idx) => (
                      <div
                        key={idx}
                        onClick={() => setSelectedGallery({ images: appointment.referenceImages!, index: idx })}
                        className="relative w-16 h-16 rounded-xl overflow-hidden border border-border/80 shrink-0 bg-muted cursor-pointer hover:opacity-90 transition-opacity"
                      >
                        <img src={img} alt={`Reference ${idx + 1}`} className="w-full h-full object-cover" />
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {/* Payment Receipt */}
              {appointment?.paymentReceiptUrl && (
                <div className="flex items-center justify-between rounded-xl border border-border/70 bg-card p-2.5">
                  <div className="flex items-center gap-2.5">
                    <div
                      onClick={() => setSelectedGallery({ images: [appointment.paymentReceiptUrl!], index: 0 })}
                      className="relative w-12 h-12 rounded-lg overflow-hidden border border-border/80 shrink-0 bg-muted cursor-pointer hover:opacity-90 transition-opacity"
                    >
                      <img src={appointment.paymentReceiptUrl} alt="קבלה" className="w-full h-full object-cover" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-foreground">אסמכתת תשלום מקדמה</span>
                      <span className="text-micro text-emerald-600 dark:text-emerald-400 font-medium">מאומת</span>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-xs h-8"
                    onClick={() => setSelectedGallery({ images: [appointment.paymentReceiptUrl!], index: 0 })}
                  >
                    צפה בקבלה
                  </Button>
                </div>
              )}

              {/* Health Notice */}
              <div className="flex items-center justify-between rounded-xl border border-border/70 bg-card p-2.5">
                <div className="flex flex-col gap-0.5">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-foreground">הצהרת בריאות</span>
                    {appointment?.healthDeclarationSigned ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-micro font-bold text-emerald-600 dark:text-emerald-400">
                        חתומה ומאושרת
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-micro font-bold text-amber-600 dark:text-amber-400">
                        טרם נחתמה
                      </span>
                    )}
                  </div>
                  {appointment?.healthDeclarationDate && (
                    <span className="text-micro text-muted-foreground">תאריך חתימה: {appointment.healthDeclarationDate}</span>
                  )}
                </div>
                {appointment?.healthDeclarationFileUrl && (
                  <a
                    href={appointment.healthDeclarationFileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center text-xs font-bold text-primary hover:underline"
                  >
                    צפה במסמך
                  </a>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <Button type="submit" disabled={isSaving}>
                {isSaving ? 'שומר…' : 'שמור'}
              </Button>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                ביטול
              </Button>
            </div>
          </form>
        )}
      </ResponsiveDialog>

      {selectedGallery && (
        <ImageGalleryDialog
          images={selectedGallery.images}
          initialIndex={selectedGallery.index}
          open={selectedGallery !== null}
          onOpenChange={(open) => !open && setSelectedGallery(null)}
        />
      )}
    </>
  )
}

export default EditAppointmentDialog
