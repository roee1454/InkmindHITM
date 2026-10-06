import { create } from 'zustand'
import type { Customer, CustomerFormData } from '../types'
import { formatPhoneForDisplay } from '@/lib/phone'

export const EMPTY_FORM: CustomerFormData = {
  name: '',
  phone: '',
  email: '',
  source: 'unknown',
  isVip: false,
}

interface CustomersUiState {
  searchQuery: string
  currentPage: number
  isCreating: boolean
  /** The customer whose card is open; `form` holds their editable details. */
  selectedCustomer: Customer | null
  form: CustomerFormData
  formError: string | null

  // Actions
  setSearchQuery: (query: string) => void
  setCurrentPage: (page: number) => void
  setIsCreating: (isCreating: boolean) => void
  setSelectedCustomer: (customer: Customer | null) => void
  setForm: (form: CustomerFormData) => void
  updateFormField: <K extends keyof CustomerFormData>(field: K, value: CustomerFormData[K]) => void
  setFormError: (error: string | null) => void
  resetForm: () => void
  openCreate: () => void
  openCustomerCard: (customer: Customer) => void
}

export const useCustomersUiStore = create<CustomersUiState>((set) => ({
  searchQuery: '',
  currentPage: 1,
  isCreating: false,
  selectedCustomer: null,
  form: EMPTY_FORM,
  formError: null,

  setSearchQuery: (searchQuery) => set({ searchQuery, currentPage: 1 }),
  setCurrentPage: (currentPage) => set({ currentPage }),
  setIsCreating: (isCreating) => set({ isCreating }),
  setSelectedCustomer: (selectedCustomer) => set({ selectedCustomer }),
  setForm: (form) => set({ form }),
  updateFormField: (field, value) =>
    set((state) => ({
      form: { ...state.form, [field]: value },
    })),
  setFormError: (formError) => set({ formError }),
  resetForm: () => set({ form: EMPTY_FORM, formError: null }),
  openCreate: () => set({ form: EMPTY_FORM, formError: null, isCreating: true }),
  openCustomerCard: (c) =>
    set({
      form: {
        name: c.name || '',
        phone: formatPhoneForDisplay(c.phone),
        email: c.email || '',
        source: c.source || 'unknown',
        isVip: c.isVip,
        healthDeclarationSigned: c.healthDeclarationSigned,
        healthDeclarationDate: c.healthDeclarationDate,
        healthDeclarationUrl: c.healthDeclarationUrl,
        allergies: c.allergies,
        medicalNotes: c.medicalNotes,
        healthDeclarationAnswers: c.healthDeclarationAnswers,
      },
      formError: null,
      selectedCustomer: c,
    }),
}))
