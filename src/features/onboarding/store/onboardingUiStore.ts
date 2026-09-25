import { create } from 'zustand'

export type OnboardingStepNumber = 1 | 2 | 3 | 4 | 5 | 6

interface OnboardingUiState {
  currentStep: OnboardingStepNumber

  // Step 1: Studio
  studioName: string
  hasEditedStudioName: boolean
  studioLogoPreview: string | null
  studioError: string | null

  // Step 2: Admin Account
  adminName: string
  adminEmail: string
  adminPhone: string
  adminPassword: string
  adminPasswordConfirm: string
  adminErrors: Record<string, string>
  adminRootError: string | null

  // Step 3: Profile & Bio
  portfolioUrl: string
  bio: string
  profileError: string | null

  // Step 4: Hours
  hoursError: string | null

  // Step 5: Payments & Deposit
  depositRequired: boolean
  depositAmount: number | null
  paymentInstructions: string
  paymentsError: string | null

  // Step 6: Calendar
  connectingCalendar: boolean
  calendarError: string | null

  // Actions
  setCurrentStep: (step: OnboardingStepNumber) => void
  nextStep: () => void
  prevStep: () => void

  setStudioName: (name: string) => void
  setHasEditedStudioName: (edited: boolean) => void
  setStudioLogoPreview: (preview: string | null) => void
  setStudioError: (error: string | null) => void

  setAdminName: (name: string) => void
  setAdminEmail: (email: string) => void
  setAdminPhone: (phone: string) => void
  setAdminPassword: (password: string) => void
  setAdminPasswordConfirm: (confirm: string) => void
  setAdminErrors: (errors: Record<string, string>) => void
  setAdminRootError: (error: string | null) => void

  setPortfolioUrl: (url: string) => void
  setBio: (bio: string) => void
  setProfileError: (error: string | null) => void

  setHoursError: (error: string | null) => void

  setDepositRequired: (required: boolean) => void
  setDepositAmount: (amount: number | null) => void
  setPaymentInstructions: (instructions: string) => void
  setPaymentsError: (error: string | null) => void

  setConnectingCalendar: (connecting: boolean) => void
  setCalendarError: (error: string | null) => void

  reset: () => void
}

const initialState = {
  currentStep: 1 as OnboardingStepNumber,

  studioName: '',
  hasEditedStudioName: false,
  studioLogoPreview: null,
  studioError: null,

  adminName: '',
  adminEmail: '',
  adminPhone: '',
  adminPassword: '',
  adminPasswordConfirm: '',
  adminErrors: {},
  adminRootError: null,

  portfolioUrl: '',
  bio: '',
  profileError: null,

  hoursError: null,

  depositRequired: false,
  depositAmount: 200,
  paymentInstructions: '',
  paymentsError: null,

  connectingCalendar: false,
  calendarError: null,
}

export const useOnboardingUiStore = create<OnboardingUiState>((set) => ({
  ...initialState,

  setCurrentStep: (currentStep) => set({ currentStep }),
  nextStep: () =>
    set((state) => ({
      currentStep: Math.min(6, state.currentStep + 1) as OnboardingStepNumber,
    })),
  prevStep: () =>
    set((state) => ({
      currentStep: Math.max(1, state.currentStep - 1) as OnboardingStepNumber,
    })),

  setStudioName: (studioName) => set({ studioName, hasEditedStudioName: true }),
  setHasEditedStudioName: (hasEditedStudioName) => set({ hasEditedStudioName }),
  setStudioLogoPreview: (studioLogoPreview) => set({ studioLogoPreview }),
  setStudioError: (studioError) => set({ studioError }),

  setAdminName: (adminName) => set({ adminName }),
  setAdminEmail: (adminEmail) => set({ adminEmail }),
  setAdminPhone: (adminPhone) => set({ adminPhone }),
  setAdminPassword: (adminPassword) => set({ adminPassword }),
  setAdminPasswordConfirm: (adminPasswordConfirm) => set({ adminPasswordConfirm }),
  setAdminErrors: (adminErrors) => set({ adminErrors }),
  setAdminRootError: (adminRootError) => set({ adminRootError }),

  setPortfolioUrl: (portfolioUrl) => set({ portfolioUrl }),
  setBio: (bio) => set({ bio }),
  setProfileError: (profileError) => set({ profileError }),

  setHoursError: (hoursError) => set({ hoursError }),

  setDepositRequired: (depositRequired) => set({ depositRequired }),
  setDepositAmount: (depositAmount) => set({ depositAmount }),
  setPaymentInstructions: (paymentInstructions) => set({ paymentInstructions }),
  setPaymentsError: (paymentsError) => set({ paymentsError }),

  setConnectingCalendar: (connectingCalendar) => set({ connectingCalendar }),
  setCalendarError: (calendarError) => set({ calendarError }),

  reset: () => set(initialState),
}))
