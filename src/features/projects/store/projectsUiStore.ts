import { create } from 'zustand'
import type { BoardColumnId } from '../utils/board'

interface ProjectsUiState {
  searchQuery: string
  artistId: string
  /** Desktop: the board shows finished work (completed, lost) instead of the open pipeline. */
  showClosed: boolean
  /** Phone: a board doesn't fit, so one lane at a time. */
  mobileColumn: BoardColumnId

  setSearchQuery: (query: string) => void
  setArtistId: (artistId: string) => void
  setShowClosed: (showClosed: boolean) => void
  setMobileColumn: (column: BoardColumnId) => void
  resetFilters: () => void
}

export const useProjectsUiStore = create<ProjectsUiState>((set) => ({
  searchQuery: '',
  artistId: 'all',
  showClosed: false,
  mobileColumn: 'inquiry',

  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setArtistId: (artistId) => set({ artistId }),
  setShowClosed: (showClosed) => set({ showClosed }),
  setMobileColumn: (mobileColumn) => set({ mobileColumn }),
  resetFilters: () => set({ searchQuery: '', artistId: 'all' }),
}))
