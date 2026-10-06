import { create } from 'zustand'

/** The leads-without-project page (track-b B6.7) has nothing to filter by stage or artist —
 *  there is no project yet — so this store only carries search and pagination. */
interface LeadsUiState {
  searchQuery: string
  currentPage: number

  setSearchQuery: (query: string) => void
  setCurrentPage: (page: number) => void
  resetFilters: () => void
}

export const useLeadsUiStore = create<LeadsUiState>((set) => ({
  searchQuery: '',
  currentPage: 1,

  setSearchQuery: (searchQuery) => set({ searchQuery, currentPage: 1 }),
  setCurrentPage: (currentPage) => set({ currentPage }),
  resetFilters: () => set({ searchQuery: '', currentPage: 1 }),
}))
