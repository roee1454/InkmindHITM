export const WIZARD_STEPS = [
  { id: 'customer-datetime', title: 'לקוח ומועד' },
  { id: 'staff-duration', title: 'איש צוות ומשך' },
  { id: 'pricing-deposit', title: 'מחיר ומקדמה' },
  { id: 'status-notes', title: 'סטטוס והערות' },
] as const

export function progressPercent(stepIndex: number): number {
  return Math.round(((stepIndex + 1) / WIZARD_STEPS.length) * 100)
}
