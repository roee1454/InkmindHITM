import { describe, expect, it, beforeEach } from 'vitest'
import { useInviteUiStore } from '@/features/invite/store/inviteUiStore'

describe('Invite UI Store Unit Tests', () => {
  beforeEach(() => {
    useInviteUiStore.getState().reset()
  })

  it('initializes with expected default values', () => {
    const state = useInviteUiStore.getState()
    expect(state.currentStep).toBe(1)
    expect(state.staffId).toBe('')
    expect(state.staffName).toBe('')
    expect(state.token).toBe('')
    expect(state.password).toBe('')
    expect(state.passwordConfirm).toBe('')
    expect(state.phone).toBe('')
    expect(state.showPassword).toBe(false)
    expect(state.showPasswordConfirm).toBe(false)
    expect(state.step1Errors).toEqual({})
    expect(state.step1RootError).toBeNull()
    expect(state.portfolioUrl).toBe('')
    expect(state.bio).toBe('')
    expect(state.windows.length).toBe(5)
    expect(state.selectedPreset).toBe('standard')
    expect(state.showHoursDetail).toBe(false)
    expect(state.hoursError).toBeNull()
    expect(state.connectingCalendar).toBe(false)
    expect(state.calendarError).toBeNull()
  })

  it('updates staff details and token on init', () => {
    useInviteUiStore.getState().init('staff_123', 'אוראל כהן', 'tok_abc')
    const state = useInviteUiStore.getState()
    expect(state.staffId).toBe('staff_123')
    expect(state.staffName).toBe('אוראל כהן')
    expect(state.token).toBe('tok_abc')
  })

  it('handles step transitions', () => {
    useInviteUiStore.getState().setCurrentStep(2)
    expect(useInviteUiStore.getState().currentStep).toBe(2)

    useInviteUiStore.getState().setCurrentStep(3)
    expect(useInviteUiStore.getState().currentStep).toBe(3)

    useInviteUiStore.getState().setCurrentStep(4)
    expect(useInviteUiStore.getState().currentStep).toBe(4)
  })

  it('manages Step 1 form fields and validation errors', () => {
    const store = useInviteUiStore.getState()
    store.setPassword('secret123')
    store.setPasswordConfirm('secret123')
    store.setPhone('0501234567')
    store.setShowPassword(true)
    store.setShowPasswordConfirm(true)
    store.setStep1Errors({ phone: 'שגיאה' })
    store.setStep1RootError('שגיאה כללית')

    const state = useInviteUiStore.getState()
    expect(state.password).toBe('secret123')
    expect(state.passwordConfirm).toBe('secret123')
    expect(state.phone).toBe('0501234567')
    expect(state.showPassword).toBe(true)
    expect(state.showPasswordConfirm).toBe(true)
    expect(state.step1Errors).toEqual({ phone: 'שגיאה' })
    expect(state.step1RootError).toBe('שגיאה כללית')
  })

  it('manages Step 2 artist profile fields', () => {
    const store = useInviteUiStore.getState()
    store.setPortfolioUrl('https://instagram.com/artist')
    store.setBio('בוטניקה וקווים עדינים')

    const state = useInviteUiStore.getState()
    expect(state.portfolioUrl).toBe('https://instagram.com/artist')
    expect(state.bio).toBe('בוטניקה וקווים עדינים')
  })

  it('applies hour presets correctly', () => {
    const store = useInviteUiStore.getState()
    store.applyPreset('morning')

    let state = useInviteUiStore.getState()
    expect(state.selectedPreset).toBe('morning')
    expect(state.windows.every((w) => w.startTime === '09:00' && w.endTime === '17:00')).toBe(true)

    store.applyPreset('evening')
    state = useInviteUiStore.getState()
    expect(state.selectedPreset).toBe('evening')
    expect(state.windows.every((w) => w.startTime === '12:00' && w.endTime === '20:00')).toBe(true)
  })

  it('toggles working days on and off', () => {
    const store = useInviteUiStore.getState()
    // Day 0 (Sun) is initially present in DEFAULT_HOURS_PRESET
    expect(store.windows.some((w) => w.dayOfWeek === 0)).toBe(true)

    // Toggle off day 0
    store.toggleDay(0)
    expect(useInviteUiStore.getState().windows.some((w) => w.dayOfWeek === 0)).toBe(false)

    // Toggle day 0 back on
    store.toggleDay(0)
    expect(useInviteUiStore.getState().windows.some((w) => w.dayOfWeek === 0)).toBe(true)

    // Toggle day 5 (Friday) on (was not present initially)
    expect(useInviteUiStore.getState().windows.some((w) => w.dayOfWeek === 5)).toBe(false)
    store.toggleDay(5)
    expect(useInviteUiStore.getState().windows.some((w) => w.dayOfWeek === 5)).toBe(true)
  })

  it('toggles hours detail view and updates errors', () => {
    const store = useInviteUiStore.getState()
    store.setShowHoursDetail(true)
    expect(useInviteUiStore.getState().showHoursDetail).toBe(true)

    store.setShowHoursDetail((prev) => !prev)
    expect(useInviteUiStore.getState().showHoursDetail).toBe(false)

    store.setHoursError('יש לבחור לפחות יום עבודה אחד')
    expect(useInviteUiStore.getState().hoursError).toBe('יש לבחור לפחות יום עבודה אחד')
  })

  it('manages Step 4 Google Calendar connection state', () => {
    const store = useInviteUiStore.getState()
    store.setConnectingCalendar(true)
    store.setCalendarError('OAuth failed')

    const state = useInviteUiStore.getState()
    expect(state.connectingCalendar).toBe(true)
    expect(state.calendarError).toBe('OAuth failed')
  })

  it('resets state back to initial values', () => {
    const store = useInviteUiStore.getState()
    store.init('staff_1', 'Name', 'token_1')
    store.setCurrentStep(3)
    store.setBio('Some bio')
    store.reset()

    const state = useInviteUiStore.getState()
    expect(state.currentStep).toBe(1)
    expect(state.staffId).toBe('')
    expect(state.bio).toBe('')
  })
})

