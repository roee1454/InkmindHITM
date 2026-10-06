import { create } from 'zustand'
import type { ApiAppointment, AppointmentFormValues } from '../types'
import type { StatusFilter } from '../utils/filter-appointments'
import type { CalendarViewMode } from '../utils/view-mode'

interface CalendarUiState {
  /** One four-way view control (track-b B6.8), replacing the old viewMode + calendarMode pair. */
  mode: CalendarViewMode
  anchorDate: Date
  selectedStatus: StatusFilter
  selectedArtist: string
  hasInitializedDefaultArtist: boolean
  searchQuery: string

  isCreating: boolean
  createSlot: { date: string; timeSlot: string } | null
  /** Pre-filled fields when booking a follow-up (next session, tattoo after a consultation). */
  createInitialValues: Partial<AppointmentFormValues> | null
  editingAppointment: ApiAppointment | null
  formError: string | null

  setMode: (mode: CalendarViewMode) => void
  setAnchorDate: (anchorDate: Date) => void
  setSelectedStatus: (selectedStatus: StatusFilter) => void
  setSelectedArtist: (selectedArtist: string) => void
  setHasInitializedDefaultArtist: (hasInitialized: boolean) => void
  setSearchQuery: (searchQuery: string) => void
  setEditingAppointment: (appointment: ApiAppointment | null) => void
  setFormError: (formError: string | null) => void
  openCreate: (options?: { slot?: { date: string; timeSlot: string } | null; initialValues?: Partial<AppointmentFormValues> | null }) => void
  closeCreate: () => void
  openEdit: (appointment: ApiAppointment) => void
}

export const useCalendarUiStore = create<CalendarUiState>((set) => ({
  mode: 'week',
  anchorDate: new Date(),
  selectedStatus: 'all',
  selectedArtist: 'all',
  hasInitializedDefaultArtist: false,
  searchQuery: '',

  isCreating: false,
  createSlot: null,
  createInitialValues: null,
  editingAppointment: null,
  formError: null,

  setMode: (mode) => set({ mode }),
  setAnchorDate: (anchorDate) => set({ anchorDate }),
  setSelectedStatus: (selectedStatus) => set({ selectedStatus }),
  setSelectedArtist: (selectedArtist) => set({ selectedArtist }),
  setHasInitializedDefaultArtist: (hasInitializedDefaultArtist) => set({ hasInitializedDefaultArtist }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setEditingAppointment: (editingAppointment) => set({ editingAppointment }),
  setFormError: (formError) => set({ formError }),
  openCreate: ({ slot = null, initialValues = null } = {}) =>
    set({ formError: null, createSlot: slot, createInitialValues: initialValues, isCreating: true }),
  closeCreate: () => set({ isCreating: false, createSlot: null, createInitialValues: null, formError: null }),
  openEdit: (appointment) => set({ formError: null, editingAppointment: appointment }),
}))
