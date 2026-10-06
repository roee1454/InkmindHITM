import type { AppointmentFormValues } from '../types'

export interface StepValidationResult {
  valid: boolean
  error?: string
}

export function validateCustomerDateTimeStep(values: Partial<AppointmentFormValues>): StepValidationResult {
  if (!values.customerId || !values.date || !values.timeSlot) {
    return { valid: false, error: 'נא לבחור לקוח, תאריך ושעה' }
  }
  if (values.minDate && values.date < values.minDate) {
    return { valid: false, error: 'לא ניתן לקבוע פגישת המשך לפני תאריך הפגישה הקודמת' }
  }
  return { valid: true }
}

export function validateStaffDurationStep(
  values: Partial<AppointmentFormValues>,
  options: { isStudioClosed?: boolean; fitsWorkingHours?: boolean } = {},
): StepValidationResult {
  if (values.type !== 'sketch' && (!values.staffId || values.staffId === 'none')) {
    return { valid: false, error: 'נא לבחור מקעקע עבור פגישת הקעקוע' }
  }
  if (options.isStudioClosed && !values.allowException) {
    return { valid: false, error: 'יש לסמן שאתם מודעים שהסטודיו סגור בתאריך זה' }
  }
  if (options.fitsWorkingHours === false && !values.allowException) {
    return { valid: false, error: 'יש לסמן שאתם מודעים שהתור מחוץ לשעות העבודה' }
  }
  return { valid: true }
}

export function validatePricingDepositStep(values: Partial<AppointmentFormValues>): StepValidationResult {
  if (values.type === 'sketch') {
    return { valid: true }
  }

  const isFollowUpConfirmedSession = Boolean(values.projectId && values.status === 'confirmed')
  if (!isFollowUpConfirmedSession) {
    if (!values.priceMinIls || values.priceMinIls <= 0) {
      return { valid: false, error: 'נא להזין מחיר מינימלי התחלתי' }
    }
    if (!values.priceMaxIls || values.priceMaxIls <= 0) {
      return { valid: false, error: 'נא להזין מחיר מקסימלי התחלתי' }
    }
    if (values.priceMaxIls < values.priceMinIls) {
      return { valid: false, error: 'המחיר המקסימלי אינו יכול להיות נמוך מהמחיר המינימלי' }
    }
    if (values.depositAmount === null || values.depositAmount === undefined || values.depositAmount <= 0) {
      return { valid: false, error: 'נא להזין סכום מקדמה לפגישת הקעקוע' }
    }
  } else {
    if (values.priceMinIls && values.priceMaxIls && values.priceMaxIls < values.priceMinIls) {
      return { valid: false, error: 'המחיר המקסימלי אינו יכול להיות נמוך מהמחיר המינימלי' }
    }
  }

  return { valid: true }
}
