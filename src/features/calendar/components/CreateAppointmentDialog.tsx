import React, { useState, useEffect } from 'react'
import { ChevronRight } from 'lucide-react'
import { ResponsiveDialog } from '@/components/ui/responsive-dialog'
import { Button } from '@/components/ui/button'
import { StepCustomerDateTime } from './create-appointment-wizard/StepCustomerDateTime'
import { StepStaffDuration } from './create-appointment-wizard/StepStaffDuration'
import { StepPricingDeposit } from './create-appointment-wizard/StepPricingDeposit'
import { StepStatusNotes } from './create-appointment-wizard/StepStatusNotes'
import { WIZARD_STEPS, progressPercent } from './create-appointment-wizard/wizard-steps'
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
  const [currentStep, setCurrentStep] = useState(0)
  const [localError, setLocalError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setValues({
      ...emptyValues(),
      chatId: initialChatId ?? null,
      date: initialDate ?? '',
      timeSlot: initialTimeSlot ?? '',
    })
    setCurrentStep(0)
    setLocalError(null)
  }, [open, initialChatId, initialDate, initialTimeSlot])

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
      title="תור חדש"
      description="הזן את פרטי הלקוח והתור. ניתן לקבוע תור גם ללקוח מזדמן, ללא שיחת ווטסאפ."
      contentClassName="sm:max-w-lg max-h-[90vh] overflow-y-auto"
    >
      <div className="step-progress rounded-full overflow-hidden">
        <div className="step-progress-fill" style={{ width: `${progressPercent(currentStep)}%` }} />
      </div>
      <div className="flex items-center justify-between px-0.5 pt-2 pb-1">
        {currentStep > 0 ? (
          <button
            type="button"
            onClick={goBack}
            className="size-6 flex items-center justify-center text-muted-foreground hover:text-foreground cursor-pointer"
            aria-label="חזור"
          >
            <ChevronRight size={16} />
          </button>
        ) : (
          <div className="size-6" />
        )}
        <span className="text-xs font-bold text-muted-foreground">
          {currentStep + 1} מתוך {WIZARD_STEPS.length} · {WIZARD_STEPS[currentStep]?.title}
        </span>
        <div className="size-6" />
      </div>

      {displayError && <p className="text-[13px] font-bold text-destructive">{displayError}</p>}

      <form onSubmit={handleSubmit} className="mt-2 space-y-4">
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

        <div className="grid grid-cols-2 gap-3 pt-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            ביטול
          </Button>
          <Button type="submit" disabled={isSaving}>
            {isLastStep ? (isSaving ? 'שומר…' : 'שמור') : 'המשך'}
          </Button>
        </div>
      </form>
    </ResponsiveDialog>
  )
}

export default CreateAppointmentDialog
