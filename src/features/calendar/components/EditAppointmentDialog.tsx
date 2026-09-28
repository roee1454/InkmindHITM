import React, { useState, useEffect } from 'react'
import { DialogActions, ResponsiveDialog } from '@/components/ui/responsive-dialog'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Button } from '@/components/ui/button'
import { CalendarPlus, ChevronLeft, Lock, Tattoo } from '@/components/ui/icon'
import { AppointmentFormFields } from './AppointmentFormFields'
import type { ApiAppointment, ApiGoogleConnection, AppointmentFormValues } from '../types'
import type { CurrentStaffInfo } from '@/features/settings/server/staff'
import { useWorkingHoursCheck } from '../hooks/useWorkingHoursCheck'
import { appointmentToFormValues } from '../utils/appointment-form-values'
import { ImageGalleryDialog } from './ImageGalleryDialog'
import { formatShortSlot } from '@/features/projects/utils/format'
import { appointmentKindLabel } from '../utils/project-position'
import { formatAppointmentDurationLabel } from '../utils/appointment-status'
import { SessionCloseOutSection } from '@/features/payments/components/SessionCloseOutSection'
import type { QuoteToSend } from './BotQuoteBanner'
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
  onSendQuote: (quote: QuoteToSend) => void
  isSendingQuote: boolean
  onDelete?: (id: string) => void
  isDeleting?: boolean
  onContinueToTattoo?: (sketchAppointment: ApiAppointment) => void
  /** Opens the booking form for the next session of this appointment's project. */
  onScheduleNextSession?: (session: ApiAppointment) => void
  currentStaff?: CurrentStaffInfo | null
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
  onScheduleNextSession,
  currentStaff,
}) => {
  const isReadOnly = Boolean(currentStaff && !currentStaff.isAdmin && appointment?.staffId && appointment.staffId !== currentStaff.id)

  const [values, setValues] = useState<AppointmentFormValues | null>(() =>
    appointment ? appointmentToFormValues(appointment) : null,
  )
  const [localError, setLocalError] = useState<string | null>(null)
  const [selectedGallery, setSelectedGallery] = useState<{ images: string[]; index: number } | null>(null)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [projectPanelOpen, setProjectPanelOpen] = useState(false)
  // The header keeps describing the appointment while the dialog slides out (after `appointment` clears).
  const [shown, setShown] = useState(appointment)
  if (appointment && appointment !== shown) setShown(appointment)

  useEffect(() => {
    if (!appointment) {
      setValues(null)
      setIsDeleteDialogOpen(false)
      return
    }
    setValues(appointmentToFormValues(appointment))
    setLocalError(null)
  }, [appointment])

  const handleChange = (patch: Partial<AppointmentFormValues>) => setValues((prev) => (prev ? { ...prev, ...patch } : prev))

  const { fitsWorkingHours, isStudioClosed } = useWorkingHoursCheck(
    values?.staffId ?? null,
    values?.date ?? '',
    values?.timeSlot ?? '',
    (values?.durationMinutes ?? 120) / 60,
  )

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (isReadOnly || !values) return
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

  const kindLabel = shown ? appointmentKindLabel(shown.kind, shown.projectPosition) : 'תור'
  const when = shown ? `${formatShortSlot(`${shown.date}T${shown.timeSlot}:00`)} · ${formatAppointmentDurationLabel(shown.durationMinutes)}` : ''

  return (
    <>
      <ResponsiveDialog
        open={appointment !== null}
        onOpenChange={onOpenChange}
        size="lg"
        title={`${kindLabel} — ${shown?.leadName || 'לקוח ללא שם'}`}
        description={[when, shown?.staffName].filter(Boolean).join(' · ')}
        // A steady height on desktop: switching between the form's tabs mustn't make the dialog jump.
        contentClassName="lg:h-[min(46rem,calc(100dvh-2rem))]"
        footer={
          isReadOnly ? (
            <DialogActions>
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
                סגירה
              </Button>
            </DialogActions>
          ) : (
            <DialogActions
              error={error || localError}
              start={
                onDelete && (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setIsDeleteDialogOpen(true)}
                    className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                  >
                    מחיקת התור
                  </Button>
                )
              }
            >
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
                ביטול
              </Button>
              <Button type="submit" form="appointment-form" disabled={isSaving || isDeleting} className="min-w-28">
                {isSaving ? 'שומר…' : 'שמירה'}
              </Button>
            </DialogActions>
          )
        }
      >
        {values && appointment && (
          <form id="appointment-form" onSubmit={handleSubmit} className="flex flex-col gap-4" dir="rtl">
            {isReadOnly && (
              <p className="flex items-center gap-2 text-xs text-muted-foreground">
                <Lock size={14} className="shrink-0" />
                תור של מקעקע אחר — לצפייה בלבד.
              </p>
            )}

            <SessionCloseOutSection appointment={appointment} readOnly={isReadOnly} onScheduleNextSession={onScheduleNextSession} />

            {appointment.projectId && (
              // The whole piece — every appointment, the money — lives in the project panel; here it's one row away.
              <button
                type="button"
                onClick={() => setProjectPanelOpen(true)}
                className="flex w-full cursor-pointer items-center gap-2.5 rounded-lg border border-border px-3 py-2.5 text-start text-sm transition-colors duration-150 hover:bg-muted/50"
              >
                <Tattoo size={16} className="shrink-0 text-muted-foreground" />
                <span className="font-bold text-foreground">הפרויקט</span>
                {appointment.projectPosition && appointment.projectPosition.appointmentCount > 1 && (
                  <span className="text-muted-foreground">{appointment.projectPosition.appointmentCount} תורים</span>
                )}
                <ChevronLeft size={16} className="ms-auto shrink-0 text-muted-foreground" />
              </button>
            )}

            {appointment.kind === 'consultation' && onContinueToTattoo && !isReadOnly && (
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm text-muted-foreground">אחרי הפגישה: קובעים את סשן הקעקוע.</p>
                <Button type="button" variant="outline" size="sm" onClick={() => onContinueToTattoo(appointment)} className="shrink-0 gap-1.5">
                  <CalendarPlus size={14} />
                  קביעת סשן
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
          </form>
        )}
      </ResponsiveDialog>

      <ConfirmDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        title="מחיקת התור"
        description="התור יימחק לצמיתות ויוסר מהיומן. אי אפשר לשחזר אותו."
        details={
          shown
            ? [
                { label: 'לקוח', value: shown.leadName || 'ללא שם' },
                { label: 'מועד', value: when },
                ...(shown.staffName ? [{ label: 'מקעקע', value: shown.staffName }] : []),
              ]
            : undefined
        }
        tone="destructive"
        confirmLabel="מחיקה"
        pendingLabel="מוחק…"
        isPending={isDeleting}
        onConfirm={() => {
          if (!appointment || !onDelete) return
          onDelete(appointment.id)
          setIsDeleteDialogOpen(false)
          onOpenChange(false)
        }}
      />

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
