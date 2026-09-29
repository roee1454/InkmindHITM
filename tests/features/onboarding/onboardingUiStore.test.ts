import { describe, expect, it, beforeEach } from 'vitest'
import { useOnboardingUiStore } from '@/features/onboarding/store/onboardingUiStore'

describe('Onboarding UI Store Unit Tests', () => {
  beforeEach(() => {
    useOnboardingUiStore.getState().reset()
  })

  it('initializes with default values and step 1', () => {
    const state = useOnboardingUiStore.getState()
    expect(state.currentStep).toBe(1)
    expect(state.studioName).toBe('')
    expect(state.hasEditedStudioName).toBe(false)
    expect(state.studioLogoPreview).toBeNull()
    expect(state.studioError).toBeNull()
    expect(state.adminName).toBe('')
    expect(state.adminEmail).toBe('')
    expect(state.adminPhone).toBe('')
    expect(state.adminPassword).toBe('')
    expect(state.adminPasswordConfirm).toBe('')
    expect(state.adminErrors).toEqual({})
    expect(state.adminRootError).toBeNull()
    expect(state.portfolioUrl).toBe('')
    expect(state.bio).toBe('')
    expect(state.profileError).toBeNull()
    expect(state.hoursError).toBeNull()
    expect(state.depositRequired).toBe(false)
    expect(state.depositAmount).toBe(200)
    expect(state.paymentInstructions).toBe('')
    expect(state.paymentsError).toBeNull()
    expect(state.connectingCalendar).toBe(false)
    expect(state.calendarError).toBeNull()
  })

  it('manages step navigation within bounds (1 to 6)', () => {
    const store = useOnboardingUiStore.getState()
    expect(store.currentStep).toBe(1)

    // cannot go below 1
    store.prevStep()
    expect(useOnboardingUiStore.getState().currentStep).toBe(1)

    // navigate through steps
    store.nextStep()
    expect(useOnboardingUiStore.getState().currentStep).toBe(2)

    store.nextStep()
    expect(useOnboardingUiStore.getState().currentStep).toBe(3)

    store.setCurrentStep(5)
    expect(useOnboardingUiStore.getState().currentStep).toBe(5)

    store.nextStep()
    expect(useOnboardingUiStore.getState().currentStep).toBe(6)

    // cannot go above 6
    store.nextStep()
    expect(useOnboardingUiStore.getState().currentStep).toBe(6)

    store.prevStep()
    expect(useOnboardingUiStore.getState().currentStep).toBe(5)
  })

  it('updates studio name and marks as edited', () => {
    const store = useOnboardingUiStore.getState()
    store.setStudioName('INKMIND Studio')

    const state = useOnboardingUiStore.getState()
    expect(state.studioName).toBe('INKMIND Studio')
    expect(state.hasEditedStudioName).toBe(true)
  })

  it('manages studio logo preview and error state', () => {
    const store = useOnboardingUiStore.getState()
    store.setStudioLogoPreview('data:image/png;base64,...')
    store.setStudioError('שגיאה בהעלאה')

    const state = useOnboardingUiStore.getState()
    expect(state.studioLogoPreview).toBe('data:image/png;base64,...')
    expect(state.studioError).toBe('שגיאה בהעלאה')
  })

  it('manages admin credentials and errors', () => {
    const store = useOnboardingUiStore.getState()
    store.setAdminName('ישראל ישראלי')
    store.setAdminEmail('admin@inkmind.com')
    store.setAdminPhone('0501234567')
    store.setAdminPassword('secret123')
    store.setAdminPasswordConfirm('secret123')
    store.setAdminErrors({ email: 'אימייל שגוי' })
    store.setAdminRootError('שגיאה ביצירה')

    const state = useOnboardingUiStore.getState()
    expect(state.adminName).toBe('ישראל ישראלי')
    expect(state.adminEmail).toBe('admin@inkmind.com')
    expect(state.adminPhone).toBe('0501234567')
    expect(state.adminPassword).toBe('secret123')
    expect(state.adminPasswordConfirm).toBe('secret123')
    expect(state.adminErrors).toEqual({ email: 'אימייל שגוי' })
    expect(state.adminRootError).toBe('שגיאה ביצירה')
  })

  it('manages artist profile fields and error', () => {
    const store = useOnboardingUiStore.getState()
    store.setPortfolioUrl('https://instagram.com/studio')
    store.setBio('ריאליזם ובוטניקה')
    store.setProfileError('שדה חובה')

    const state = useOnboardingUiStore.getState()
    expect(state.portfolioUrl).toBe('https://instagram.com/studio')
    expect(state.bio).toBe('ריאליזם ובוטניקה')
    expect(state.profileError).toBe('שדה חובה')
  })

  it('manages payments and deposit settings', () => {
    const store = useOnboardingUiStore.getState()
    store.setDepositRequired(true)
    store.setDepositAmount(350)
    store.setPaymentInstructions('Bit ל-050-0000000')
    store.setPaymentsError('סכום לא תקין')

    const state = useOnboardingUiStore.getState()
    expect(state.depositRequired).toBe(true)
    expect(state.depositAmount).toBe(350)
    expect(state.paymentInstructions).toBe('Bit ל-050-0000000')
    expect(state.paymentsError).toBe('סכום לא תקין')
  })

  it('manages calendar connection state', () => {
    const store = useOnboardingUiStore.getState()
    store.setConnectingCalendar(true)
    store.setCalendarError('החיבור נכשל')

    const state = useOnboardingUiStore.getState()
    expect(state.connectingCalendar).toBe(true)
    expect(state.calendarError).toBe('החיבור נכשל')
  })

  it('resets back to initial values', () => {
    const store = useOnboardingUiStore.getState()
    store.setCurrentStep(4)
    store.setStudioName('Studio')
    store.setDepositRequired(true)
    store.reset()

    const state = useOnboardingUiStore.getState()
    expect(state.currentStep).toBe(1)
    expect(state.studioName).toBe('')
    expect(state.depositRequired).toBe(false)
  })

  it('sends someone back from the last step to fix a gap and returns them straight to it', () => {
    const store = useOnboardingUiStore.getState()
    store.setCurrentStep(6)
    store.fixFromFinish(3)
    expect(useOnboardingUiStore.getState().currentStep).toBe(3)

    useOnboardingUiStore.getState().nextStep()
    expect(useOnboardingUiStore.getState().currentStep).toBe(6)
    expect(useOnboardingUiStore.getState().returnToFinish).toBe(false)

    // Normal navigation is untouched afterwards.
    useOnboardingUiStore.getState().setCurrentStep(2)
    useOnboardingUiStore.getState().nextStep()
    expect(useOnboardingUiStore.getState().currentStep).toBe(3)
  })

  it('leaving the fix path by an explicit step forgets the return trip', () => {
    const store = useOnboardingUiStore.getState()
    store.fixFromFinish(4)
    useOnboardingUiStore.getState().setCurrentStep(1)
    useOnboardingUiStore.getState().nextStep()
    expect(useOnboardingUiStore.getState().currentStep).toBe(2)
  })
})
