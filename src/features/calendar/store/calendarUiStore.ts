import { create } from 'zustand'
import type { ApiAppointment } from '../types'
import type { CalendarMode } from '../components/CalendarGrid'
import type { ViewMode } from '../components/CalendarViewToggle'

interface CalendarUiState {
  viewMode: ViewMode
  calendarMode: CalendarMode
  anchorDate: Date
  selectedStatus: string
  selectedArtist: string
  hasInitializedDefaultArtist: boolean

  isCreating: boolean
  createSlot: { date: string; timeSlot: string } | null
  editingAppointment: ApiAppointment | null
  formError: string | null

  // Actions
  setViewMode: (viewMode: ViewMode) => void
  setCalendarMode: (calendarMode: CalendarMode) => void
  setAnchorDate: (anchorDate: Date) => void
  setSelectedStatus: (selectedStatus: string) => void
  setSelectedArtist: (selectedArtist: string) => void
  setHasInitializedDefaultArtist: (hasInitialized: boolean) => void
  setIsCreating: (isCreating: boolean) => void
  setCreateSlot: (slot: { date: string; timeSlot: string } | null) => void
  setEditingAppointment: (appointment: ApiAppointment | null) => void
  setFormError: (formError: string | null) => void
  openCreate: (slot?: { date: string; timeSlot: string } | null) => void
  openEdit: (appointment: ApiAppointment) => void
}

export const useCalendarUiStore = create<CalendarUiState>((set) => ({
  viewMode: 'calendar',
  calendarMode: 'week',
  anchorDate: new Date(),
  selectedStatus: 'all',
  selectedArtist: 'all',
  hasInitializedDefaultArtist: false,

  isCreating: false,
  createSlot: null,
  editingAppointment: null,
  formError: null,

  setViewMode: (viewMode) => set({ viewMode }),
  setCalendarMode: (calendarMode) => set({ calendarMode }),
  setAnchorDate: (anchorDate) => set({ anchorDate }),
  setSelectedStatus: (selectedStatus) => set({ selectedStatus }),
  setSelectedArtist: (selectedArtist) => set({ selectedArtist }),
  setHasInitializedDefaultArtist: (hasInitializedDefaultArtist) => set({ hasInitializedDefaultArtist }),
  setIsCreating: (isCreating) => set({ isCreating }),
  setCreateSlot: (createSlot) => set({ createSlot }),
  setEditingAppointment: (editingAppointment) => set({ editingAppointment }),
  setFormError: (formError) => set({ formError }),
  openCreate: (slot = null) =>
    set({
      formError: null,
      createSlot: slot,
      isCreating: true,
    }),
  openEdit: (appointment) =>
    set({
      formError: null,
      editingAppointment: appointment,
    }),
}))
