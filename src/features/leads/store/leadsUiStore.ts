import { create } from 'zustand'
import type { PipelineFilter } from '../utils/pipeline-filter'

interface LeadsUiState {
  searchQuery: string
  filter: PipelineFilter
  artistId: string
  currentPage: number

  setSearchQuery: (query: string) => void
  setFilter: (filter: PipelineFilter) => void
  setArtistId: (artistId: string) => void
  setCurrentPage: (page: number) => void
  resetFilters: () => void
}

export const useLeadsUiStore = create<LeadsUiState>((set) => ({
  searchQuery: '',
  filter: 'open',
  artistId: 'all',
  currentPage: 1,

  setSearchQuery: (searchQuery) => set({ searchQuery, currentPage: 1 }),
  setFilter: (filter) => set({ filter, currentPage: 1 }),
  setArtistId: (artistId) => set({ artistId, currentPage: 1 }),
  setCurrentPage: (currentPage) => set({ currentPage }),
  resetFilters: () => set({ searchQuery: '', filter: 'open', artistId: 'all', currentPage: 1 }),
}))
