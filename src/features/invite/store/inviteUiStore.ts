import { create } from 'zustand'
import { DEFAULT_HOURS_PRESET, HOURS_PRESETS } from '@/features/onboarding/utils/work-hours'
import type { InviteStep, InviteUiState, PresetKey } from '../types'

const initialState = {
  currentStep: 1 as InviteStep,
  staffId: '',
  staffName: '',
  token: '',

  // Step 1: Password & Phone
  password: '',
  passwordConfirm: '',
  phone: '',
  showPassword: false,
  showPasswordConfirm: false,
  step1Errors: {},
  step1RootError: null,

  // Step 2: Artist Profile
  portfolioUrl: '',
  bio: '',
  profileError: null,

  // Step 3: Work Hours
  windows: DEFAULT_HOURS_PRESET,
  selectedPreset: 'standard' as PresetKey,
  showHoursDetail: false,
  hoursError: null,

  // Step 4: Google Calendar OAuth
  connectingCalendar: false,
  calendarError: null,
}

export const useInviteUiStore = create<InviteUiState>((set) => ({
  ...initialState,

  init: (staffId, staffName, token) =>
    set((state) => ({
      ...state,
      staffId: staffId || state.staffId,
      staffName: staffName || state.staffName,
      token: token || state.token,
    })),

  setCurrentStep: (currentStep) => set({ currentStep }),
  setStaffId: (staffId) => set({ staffId }),

  // Step 1 Actions
  setPassword: (password) => set({ password }),
  setPasswordConfirm: (passwordConfirm) => set({ passwordConfirm }),
  setPhone: (phone) => set({ phone }),
  setShowPassword: (showPassword) => set({ showPassword }),
  setShowPasswordConfirm: (showPasswordConfirm) => set({ showPasswordConfirm }),
  setStep1Errors: (step1Errors) => set({ step1Errors }),
  setStep1RootError: (step1RootError) => set({ step1RootError }),

  // Step 2 Actions
  setPortfolioUrl: (portfolioUrl) => set({ portfolioUrl }),
  setBio: (bio) => set({ bio }),
  setProfileError: (profileError) => set({ profileError }),

  // Step 3 Actions
  setWindows: (windows) => set({ windows }),
  setSelectedPreset: (selectedPreset) => set({ selectedPreset }),
  setShowHoursDetail: (updater) =>
    set((state) => ({
      showHoursDetail: typeof updater === 'function' ? updater(state.showHoursDetail) : updater,
    })),
  setHoursError: (hoursError) => set({ hoursError }),
  toggleDay: (dayOfWeek) =>
    set((state) => {
      const exists = state.windows.some((w) => w.dayOfWeek === dayOfWeek)
      if (exists) {
        return { windows: state.windows.filter((w) => w.dayOfWeek !== dayOfWeek) }
      }
      const template = state.windows[0]
      const newWindows = [
        ...state.windows,
        {
          dayOfWeek,
          startTime: template?.startTime ?? '10:00',
          endTime: template?.endTime ?? '18:00',
        },
      ].sort((a, b) => a.dayOfWeek - b.dayOfWeek)
      return { windows: newWindows }
    }),
  applyPreset: (presetKey) =>
    set((state) => {
      const preset = HOURS_PRESETS[presetKey]
      return {
        selectedPreset: presetKey,
        windows: state.windows.map((w) => ({
          ...w,
          startTime: preset.startTime,
          endTime: preset.endTime,
        })),
      }
    }),

  // Step 4 Actions
  setConnectingCalendar: (connectingCalendar) => set({ connectingCalendar }),
  setCalendarError: (calendarError) => set({ calendarError }),

  reset: () => set(initialState),
}))

