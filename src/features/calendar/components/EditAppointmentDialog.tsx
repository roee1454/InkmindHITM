import React, { useState, useEffect } from 'react'
import { ResponsiveDialog } from '@/components/ui/responsive-dialog'
import { Button } from '@/components/ui/button'
import { Trash, Sparkle, CalendarPlus, Lock } from '@/components/ui/icon'
import { AppointmentFormFields } from './AppointmentFormFields'
import type { ApiAppointment, ApiGoogleConnection, AppointmentFormValues } from '../types'
import type { CurrentStaffInfo } from '@/features/settings/server/staff'
import { useWorkingHoursCheck } from '../hooks/useWorkingHoursCheck'
import { ImageGalleryDialog } from './ImageGalleryDialog'
import { formatPhoneForDisplay } from '@/lib/phone'
import { ProjectTimeline } from './ProjectTimeline'
import { SessionCloseOutSection } from '@/features/payments/components/SessionCloseOutSection'
import { ProjectPanel } from '@/features/projects/components/ProjectPanel'

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
  onDelete?: (id: string) => void
  isDeleting?: boolean
  onContinueToTattoo?: (sketchAppointment: ApiAppointment) => void
  currentStaff?: CurrentStaffInfo | null
  /** All appointments of this appointment's project, including itself. */
  projectAppointments?: ApiAppointment[]
}

function appointmentToFormValues(appointment: ApiAppointment): AppointmentFormValues {
  return {
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
    medicalNotes: appointment.medicalNotes,
    healthDeclarationAnswers: appointment.healthDeclarationAnswers,
    allergies: appointment.allergies,
  }
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
  onDelete,
  isDeleting = false,
  onContinueToTattoo,
  projectAppointments = [],
  currentStaff,
}) => {
  const isReadOnly = Boolean(
    currentStaff &&
      !currentStaff.isAdmin &&
      appointment?.staffId &&
      appointment.staffId !== currentStaff.id,
  )

  const [values, setValues] = useState<AppointmentFormValues | null>(() =>
    appointment ? appointmentToFormValues(appointment) : null,
  )
  const [localError, setLocalError] = useState<string | null>(null)
  const [selectedGallery, setSelectedGallery] = useState<{ images: string[]; index: number } | null>(null)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [projectPanelOpen, setProjectPanelOpen] = useState(false)

  useEffect(() => {
    if (!appointment) {
      setValues(null)
      setIsDeleteDialogOpen(false)
      return
    }
    setValues(appointmentToFormValues(appointment))
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
    if (isReadOnly) {
      onOpenChange(false)
      return
    }
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
        title={isReadOnly ? 'פרטי תור' : 'עריכת תור'}
        description={
          isReadOnly
            ? 'צפייה בפרטי התור, המועד, המקעקע והמסמכים המצורפים.'
            : 'עדכן את פרטי הלקוח, מועד התור, המקעקע והסטטוס.'
        }
        // Rigid fixed height: content changes across tabs, errors, or notes must not cause layout shifts
        contentClassName="sm:max-w-lg h-[85dvh] max-h-[85dvh] sm:h-[42rem] sm:max-h-[min(42rem,calc(100dvh-2rem))] overflow-hidden flex flex-col"
      >
        {displayError && (
          <p className="shrink-0 text-sm font-bold text-destructive">{displayError}</p>
        )}

        {values && (
          <form
            onSubmit={handleSubmit}
            className="flex min-h-0 flex-1 flex-col font-assistant"
            dir="rtl"
          >
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pb-4">
              {isReadOnly && (
                <div className="flex items-center gap-2 p-3 rounded-2xl bg-muted/40 border border-border text-xs text-muted-foreground">
                  <Lock size={15} className="shrink-0 text-muted-foreground" />
                  <span>תור המשויך למקעקע אחר — לצפייה בלבד (אין הרשאת עריכה או מחיקה)</span>
                </div>
              )}

              {appointment && <SessionCloseOutSection appointment={appointment} readOnly={isReadOnly} />}

              {appointment && <ProjectTimeline appointments={projectAppointments} currentId={appointment.id} />}
              {appointment?.projectId && (
                <Button type="button" variant="outline" size="sm" className="w-full" onClick={() => setProjectPanelOpen(true)}>
                  פרטי הפרויקט
                </Button>
              )}

              {appointment?.kind === 'consultation' && onContinueToTattoo && !isReadOnly && (
                <div className="flex items-center justify-between gap-2 p-3 rounded-2xl bg-accent-ink/10 border border-accent-ink/25">
                  <div className="flex items-center gap-2">
                    <Sparkle size={16} className="text-accent-ink shrink-0" />
                    <div className="flex flex-col text-right">
                      <span className="text-xs font-extrabold text-foreground">קביעת תור לקעקוע בעקבות הפגישה</span>
                      <span className="text-2xs text-muted-foreground">מעבר לאשף לקביעת סשן קעקוע על בסיס הסקיצה</span>
                    </div>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => onContinueToTattoo(appointment)}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground font-extrabold text-xs shrink-0 gap-1.5 h-8 px-3 cursor-pointer shadow-xs"
                  >
                    <CalendarPlus size={13} />
                    <span>המשך לתור</span>
                  </Button>
                </div>
              )}

              <AppointmentFormFields
                values={values}
                onChange={handleChange}
                staff={staff}
                googleConnections={googleConnections}
                appointment={appointment}
                onSendQuote={onSendQuote}
                isSendingQuote={isSendingQuote}
                onOpenGallery={(images, index) => setSelectedGallery({ images, index })}
                isEdit={true}
                readOnly={isReadOnly}
              />
            </div>

            {isReadOnly ? (
              <div className="flex shrink-0 items-center justify-end border-t border-border pt-3">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  סגור
                </Button>
              </div>
            ) : (
              <div className="flex shrink-0 items-center justify-between gap-3 border-t border-border pt-3">
                {onDelete ? (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setIsDeleteDialogOpen(true)}
                    className="text-destructive hover:text-destructive hover:bg-destructive/10 font-bold gap-1.5 px-3"
                  >
                    <Trash size={16} />
                    <span>מחק תור</span>
                  </Button>
                ) : (
                  <div />
                )}
                <div className="flex items-center gap-2">
                  <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                    ביטול
                  </Button>
                  <Button type="submit" disabled={isSaving || isDeleting} className="font-bold">
                    {isSaving ? 'שומר…' : 'שמור שינויים'}
                  </Button>
                </div>
              </div>
            )}
          </form>
        )}
      </ResponsiveDialog>

      {/* Dedicated Delete Confirmation Dialog */}
      <ResponsiveDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        title="מחיקת תור"
        description="האם אתה בטוח שברצונך למחוק תור זה לצמיתות? לא ניתן יהיה לשחזר את התור לאחר המחיקה."
        contentClassName="sm:max-w-md font-assistant"
      >
        <div className="flex flex-col gap-4 pt-2 font-assistant" dir="rtl">
          {appointment && (
            <div className="p-3.5 bg-muted/40 rounded-2xl border border-border text-xs space-y-2 text-right">
              <div className="font-extrabold text-foreground text-sm">
                {appointment.style || (appointment.type === 'sketch' ? 'פגישת סקיצה / ייעוץ' : 'סשן קעקוע')}
              </div>
              <div className="text-muted-foreground flex items-center gap-1.5">
                <span>לקוח:</span>
                <strong className="text-foreground">{appointment.leadName || 'ללא שם'}</strong>
                {appointment.leadPhone && <span>({formatPhoneForDisplay(appointment.leadPhone)})</span>}
              </div>
              <div className="text-muted-foreground flex items-center gap-1.5">
                <span>מועד:</span>
                <span className="font-mono text-foreground font-bold">{appointment.date} בשעה {appointment.timeSlot}</span>
                <span className="text-foreground font-bold tabular-nums">{appointment.date} בשעה {appointment.timeSlot}</span>
                {appointment.durationMinutes ? <span>({appointment.durationMinutes} דקות)</span> : null}
              </div>
              {appointment.staffName && (
                <div className="text-muted-foreground flex items-center gap-1.5">
                  <span>מקעקע:</span>
                  <span className="text-foreground font-medium">{appointment.staffName}</span>
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 pt-1">
            <Button
              type="button"
              variant="destructive"
              disabled={isDeleting}
              onClick={() => {
                if (appointment && onDelete) {
                  onDelete(appointment.id)
                  setIsDeleteDialogOpen(false)
                  onOpenChange(false)
                }
              }}
              className="flex items-center justify-center gap-1.5 font-bold rounded-xl"
            >
              <Trash size={15} />
              <span>{isDeleting ? 'מוחק…' : 'מחק תור לצמיתות'}</span>
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
              className="font-bold rounded-xl"
            >
              ביטול
            </Button>
          </div>
        </div>
      </ResponsiveDialog>

      {selectedGallery && (
        <ImageGalleryDialog
          images={selectedGallery.images}
          initialIndex={selectedGallery.index}
          open={selectedGallery !== null}
          onOpenChange={(open) => !open && setSelectedGallery(null)}
        />
      )}
      <ProjectPanel projectId={projectPanelOpen ? (appointment?.projectId ?? null) : null} onClose={() => setProjectPanelOpen(false)} />
    </>
  )
}

export default EditAppointmentDialog
