import React, { useState, useEffect } from 'react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { DialogActions } from '@/components/ui/responsive-dialog'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Button } from '@/components/ui/button'
import { CalendarPlus, ChevronLeft, Lock, Receipt, Tattoo } from '@/components/ui/icon'
import { AppointmentFormFields } from './AppointmentFormFields'
import type { ApiAppointment, ApiGoogleConnection, AppointmentFormValues } from '../types'
import type { CurrentStaffInfo } from '@/features/settings/server/staff'
import { useWorkingHoursCheck } from '../hooks/useWorkingHoursCheck'
import { useIsMobile } from '@/hooks/useMediaQuery'
import { appointmentToFormValues } from '../utils/appointment-form-values'
import { ImageGalleryDialog } from './ImageGalleryDialog'
import { formatShortSlot } from '@/features/projects/utils/format'
import { appointmentKindLabel } from '../utils/project-position'
import { formatAppointmentDurationLabel } from '../utils/appointment-status'
import { appointmentNeedsCloseOut } from '@/features/payments/utils/balance'
import { formatIls } from '@/features/payments/utils/labels'
import { CloseSessionDialog } from '@/features/payments/components/CloseSessionDialog'
import type { QuoteToSend } from './BotQuoteBanner'
import { ProjectPanel } from '@/features/projects/components/ProjectPanel'
import { cn } from '@/lib/utils'

interface StaffItem {
  id: string
  name: string
}

export interface EditAppointmentSheetProps {
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

export const EditAppointmentSheet: React.FC<EditAppointmentSheetProps> = ({
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
  const isMobile = useIsMobile()
  const isReadOnly = Boolean(currentStaff && !currentStaff.isAdmin && appointment?.staffId && appointment.staffId !== currentStaff.id)

  const [values, setValues] = useState<AppointmentFormValues | null>(() =>
    appointment ? appointmentToFormValues(appointment) : null,
  )
  const [localError, setLocalError] = useState<string | null>(null)
  const [selectedGallery, setSelectedGallery] = useState<{ images: string[]; index: number } | null>(null)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [projectPanelOpen, setProjectPanelOpen] = useState(false)

  const [isClosingSession, setIsClosingSession] = useState(false)
  const [showEarlyCloseWarning, setShowEarlyCloseWarning] = useState(false)

  // Keep describing the appointment while the sheet slides out (after `appointment` clears).
  const [shown, setShown] = useState(appointment)
  if (appointment && appointment !== shown) setShown(appointment)

  useEffect(() => {
    if (!appointment) {
      setValues(null)
      setIsDeleteDialogOpen(false)
      setIsClosingSession(false)
      setShowEarlyCloseWarning(false)
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
  const slotFormatted = shown ? formatShortSlot(`${shown.date}T${shown.timeSlot}:00`) : ''
  const when = shown ? `${slotFormatted} · ${formatAppointmentDurationLabel(shown.durationMinutes)}` : ''
  const description = [when, shown?.staffName].filter(Boolean).join(' · ')

  const handleOpenCloseOut = () => {
    if (!appointment) return
    const isReady = appointmentNeedsCloseOut(appointment, Date.now())
    if (isReady) {
      setIsClosingSession(true)
    } else {
      setShowEarlyCloseWarning(true)
    }
  }

  return (
    <>
      <Sheet open={appointment !== null} onOpenChange={onOpenChange}>
        <SheetContent
          side={isMobile ? 'bottom' : 'left'}
          dir="rtl"
          className={cn(
            'gap-0 p-0 font-assistant outline-none',
            isMobile
              ? 'max-h-[92svh] rounded-t-2xl border-t border-border'
              : 'h-svh w-full sm:max-w-lg md:max-w-xl lg:max-w-[34rem] rounded-none shadow-2xl',
          )}
        >
          {/* Fixed Header */}
          <SheetHeader className="shrink-0 gap-1 border-b border-border/80 px-5 pt-4 pb-3.5 pe-12 text-right">
            <SheetTitle className="text-base font-extrabold text-foreground">
              {kindLabel} — {shown?.leadName || 'לקוח ללא שם'}
            </SheetTitle>
            {description && (
              <SheetDescription className="text-xs text-muted-foreground">
                {description}
              </SheetDescription>
            )}

            {(shown?.projectId || (appointment?.kind === 'consultation' && onContinueToTattoo)) && (
              <div className="flex flex-wrap items-center gap-1.5 pt-2">
                {shown?.projectId && (
                  <button
                    type="button"
                    onClick={() => setProjectPanelOpen(true)}
                    className="inline-flex items-center gap-1.5 rounded-md border border-border/80 bg-muted/40 px-2.5 py-1 text-xs font-semibold text-foreground transition-colors hover:bg-muted cursor-pointer"
                  >
                    <Tattoo size={13} className="shrink-0 text-muted-foreground" />
                    <span>הפרויקט {shown.projectPosition && shown.projectPosition.appointmentCount > 1 ? `(${shown.projectPosition.appointmentCount} תורים)` : ''}</span>
                    <ChevronLeft size={11} className="shrink-0 text-muted-foreground" />
                  </button>
                )}

                {!isReadOnly && appointment && appointment.kind !== 'consultation' && appointment.projectId && appointment.status !== 'completed' && (
                  <button
                    type="button"
                    onClick={handleOpenCloseOut}
                    className="inline-flex items-center gap-1.5 rounded-md border border-warning/40 bg-warning/10 px-2.5 py-1 text-xs font-bold text-foreground transition-colors hover:bg-warning/20 cursor-pointer"
                  >
                    <Receipt size={13} className="shrink-0 text-warning" />
                    <span>סגירת פגישה</span>
                  </button>
                )}

                {shown?.status === 'completed' && (
                  <button
                    type="button"
                    onClick={() => !isReadOnly && setIsClosingSession(true)}
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-md bg-status-done/15 px-2.5 py-1 text-xs font-bold text-status-done transition-colors',
                      !isReadOnly && 'hover:bg-status-done/25 cursor-pointer',
                    )}
                  >
                    <Receipt size={13} className="shrink-0 text-status-done" />
                    <span>{shown.chargeWaived ? 'הושלם (ללא חיוב)' : `הושלם · ${formatIls(shown.finalPrice ?? 0)}`}</span>
                  </button>
                )}

                {!isReadOnly && appointment && appointment.kind !== 'consultation' && appointment.projectId && onScheduleNextSession && (
                  <button
                    type="button"
                    onClick={() => onScheduleNextSession(appointment)}
                    className="inline-flex items-center gap-1.5 rounded-md border border-border/80 bg-muted/40 px-2.5 py-1 text-xs font-semibold text-foreground transition-colors hover:bg-muted cursor-pointer"
                  >
                    <CalendarPlus size={13} className="shrink-0 text-muted-foreground" />
                    <span>תור המשך</span>
                  </button>
                )}

                {!isReadOnly && appointment?.kind === 'consultation' && onContinueToTattoo && (
                  <button
                    type="button"
                    onClick={() => onContinueToTattoo(appointment)}
                    className="inline-flex items-center gap-1.5 rounded-md border border-border/80 bg-muted/40 px-2.5 py-1 text-xs font-semibold text-foreground transition-colors hover:bg-muted cursor-pointer"
                  >
                    <CalendarPlus size={13} className="shrink-0 text-muted-foreground" />
                    <span>קביעת סשן קעקוע</span>
                  </button>
                )}
              </div>
            )}

            {isReadOnly && (
              <p className="mt-1 flex items-center gap-1.5 text-2xs text-muted-foreground">
                <Lock size={12} className="shrink-0" />
                תור של מקעקע אחר — לצפייה בלבד
              </p>
            )}
          </SheetHeader>

          {/* Scrollable Body - Clean, pristine form fields without stacked clutter */}
          {values && appointment && (
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4 lg:px-6">
              <form id="appointment-form" onSubmit={handleSubmit} className="flex flex-col gap-4" dir="rtl">
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
            </div>
          )}

          {/* Fixed Footer */}
          <div className="flex shrink-0 items-center gap-2 border-t border-border bg-card px-5 py-3 lg:px-6">
            {isReadOnly ? (
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
                      size="sm"
                      onClick={() => setIsDeleteDialogOpen(true)}
                      className="text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
                    >
                      מחיקה
                    </Button>
                  )
                }
              >
                <Button type="button" variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
                  ביטול
                </Button>
                <Button type="submit" form="appointment-form" disabled={isSaving || isDeleting} size="sm" className="min-w-24 font-bold">
                  {isSaving ? 'שומר…' : 'שמירה'}
                </Button>
              </DialogActions>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Early Close Override Warning Dialog */}
      {appointment && (
        <ConfirmDialog
          open={showEarlyCloseWarning}
          onOpenChange={setShowEarlyCloseWarning}
          title="סגירת סשן מוקדמת (חריג)"
          description="מומלץ לבצע סגירת חשבון רק בסיום הסשן, לאחר שמשך הזמן והמחיר הסופי ידועים בוודאות."
          details={[
            ...(slotFormatted ? [{ label: 'מועד התור', value: slotFormatted }] : []),
            ...(appointment.leadName ? [{ label: 'לקוח', value: appointment.leadName }] : []),
          ]}
          confirmLabel="המשך לסגירת סשן"
          cancelLabel="ביטול"
          onConfirm={() => {
            setShowEarlyCloseWarning(false)
            setIsClosingSession(true)
          }}
        >
          <div className="mt-3 rounded-lg border border-warning/30 bg-warning/10 p-2.5 text-xs text-warning">
            שים לב: סגירת הסשן לפני מועדו תקבע את המחיר הסופי ותסמן אותו כהושלם.
          </div>
        </ConfirmDialog>
      )}

      {/* Close Session Dialog */}
      {appointment && (
        <CloseSessionDialog
          appointment={appointment}
          open={isClosingSession}
          onOpenChange={setIsClosingSession}
          onScheduleNextSession={onScheduleNextSession}
        />
      )}

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

export default EditAppointmentSheet
