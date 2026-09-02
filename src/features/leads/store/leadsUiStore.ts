import { create } from 'zustand'

interface LeadsUiState {
  searchQuery: string
  selectedStage: string
  selectedArtist: string
  currentPage: number

  // Actions
  setSearchQuery: (query: string) => void
  setSelectedStage: (stage: string) => void
  setSelectedArtist: (artistId: string) => void
  setCurrentPage: (page: number) => void
  resetFilters: () => void
}

export const useLeadsUiStore = create<LeadsUiState>((set) => ({
  searchQuery: '',
  selectedStage: 'all',
  selectedArtist: 'all',
  currentPage: 1,

  setSearchQuery: (searchQuery) => set({ searchQuery, currentPage: 1 }),
  setSelectedStage: (selectedStage) => set({ selectedStage, currentPage: 1 }),
  setSelectedArtist: (selectedArtist) => set({ selectedArtist, currentPage: 1 }),
  setCurrentPage: (currentPage) => set({ currentPage }),
  resetFilters: () => set({ searchQuery: '', selectedStage: 'all', selectedArtist: 'all', currentPage: 1 }),
}))

