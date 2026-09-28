import React, { useState, useEffect } from 'react'
import { ChevronRight } from '@/components/ui/icon'
import { DialogActions, ResponsiveDialog } from '@/components/ui/responsive-dialog'
import { Button } from '@/components/ui/button'
import { StepCustomerDateTime } from './create-appointment-wizard/StepCustomerDateTime'
import { StepStaffDuration } from './create-appointment-wizard/StepStaffDuration'
import { StepPricingDeposit } from './create-appointment-wizard/StepPricingDeposit'
import { StepStatusNotes } from './create-appointment-wizard/StepStatusNotes'
import { WIZARD_STEPS, progressPercent } from './create-appointment-wizard/wizard-steps'
import type { ApiGoogleConnection, AppointmentFormValues } from '../types'
import { useWorkingHoursCheck } from '../hooks/useWorkingHoursCheck'

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
  initialValues?: Partial<AppointmentFormValues> | null
}

function emptyValues(): AppointmentFormValues {
  return {
    customerId: null,
    chatId: null,
    leadName: '',
    leadPhone: '',
    type: 'tattoo',
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
  initialValues,
}) => {
  const [values, setValues] = useState<AppointmentFormValues>(emptyValues)
  const [currentStep, setCurrentStep] = useState(0)
  const [localError, setLocalError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setValues({
      ...emptyValues(),
      ...(initialValues ?? {}),
      chatId: initialChatId ?? initialValues?.chatId ?? null,
      date: initialDate ?? initialValues?.date ?? '',
      timeSlot: initialTimeSlot ?? initialValues?.timeSlot ?? '',
    })
    setCurrentStep(0)
    setLocalError(null)
  }, [open, initialChatId, initialDate, initialTimeSlot, initialValues])

  const handleChange = (patch: Partial<AppointmentFormValues>) =>
    setValues((prev) => ({ ...prev, ...patch }))

  const { fitsWorkingHours, isStudioClosed, closureReason } = useWorkingHoursCheck(
    values.staffId,
    values.date,
    values.timeSlot,
    values.durationMinutes / 60,
  )

  const isLastStep = currentStep === WIZARD_STEPS.length - 1

  const goNext = () => {
    setLocalError(null)
    if (currentStep === 0) {
      if (!values.customerId || !values.date || !values.timeSlot) {
        setLocalError('נא לבחור לקוח, תאריך ושעה')
        return
      }
    }
    if (currentStep === 1) {
      if (isStudioClosed && !values.allowException) {
        setLocalError('יש לסמן שאתם מודעים שהסטודיו סגור בתאריך זה')
        return
      }
      if (!fitsWorkingHours && !values.allowException) {
        setLocalError('יש לסמן שאתם מודעים שהתור מחוץ לשעות העבודה')
        return
      }
    }
    setCurrentStep((s) => Math.min(s + 1, WIZARD_STEPS.length - 1))
  }

  const goBack = () => {
    setLocalError(null)
    setCurrentStep((s) => Math.max(s - 1, 0))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // The new-customer dialog renders inside this form's React tree (it portals out of the DOM, not
    // out of React), so its submit bubbles here too — it must not advance or save the booking.
    if (e.target !== e.currentTarget) return
    if (!isLastStep) {
      goNext()
      return
    }
    onSave(values)
  }

  const displayError = error || localError

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      size="lg"
      title="תור חדש"
      description={`שלב ${currentStep + 1} מתוך ${WIZARD_STEPS.length} · ${WIZARD_STEPS[currentStep]?.title ?? ''}`}
      footer={
        <DialogActions
          start={
            currentStep > 0 && (
              <Button type="button" variant="ghost" onClick={goBack} className="gap-1">
                <ChevronRight size={16} />
                חזרה
              </Button>
            )
          }
        >
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            ביטול
          </Button>
          <Button type="submit" form="create-appointment-form" disabled={isSaving} className="min-w-28">
            {isLastStep ? (isSaving ? 'שומר…' : 'קביעת התור') : 'המשך'}
          </Button>
        </DialogActions>
      }
    >
      <div className="step-progress mb-4 overflow-hidden rounded-full" aria-hidden>
        <div className="step-progress-fill" style={{ width: `${progressPercent(currentStep)}%` }} />
      </div>

      {displayError && (
        <p role="alert" className="mb-3 text-sm font-bold text-destructive">
          {displayError}
        </p>
      )}

      <form id="create-appointment-form" onSubmit={handleSubmit} className="space-y-4">
        {currentStep === 0 && <StepCustomerDateTime values={values} onChange={handleChange} />}
        {currentStep === 1 && (
          <StepStaffDuration
            values={values}
            onChange={handleChange}
            staff={staff}
            googleConnections={googleConnections}
            fitsWorkingHours={fitsWorkingHours}
            isStudioClosed={isStudioClosed}
            closureReason={closureReason}
          />
        )}
        {currentStep === 2 && <StepPricingDeposit values={values} onChange={handleChange} />}
        {currentStep === 3 && <StepStatusNotes values={values} onChange={handleChange} />}
      </form>
    </ResponsiveDialog>
  )
}

export default CreateAppointmentDialog
