import { create } from 'zustand'
import type { LeadStage } from '../types'

interface LeadsUiState {
  draggingId: string | null
  dropTarget: LeadStage | null
  isPanning: boolean

  // Actions
  setDraggingId: (draggingId: string | null) => void
  setDropTarget: (dropTarget: LeadStage | null) => void
  setIsPanning: (isPanning: boolean) => void
}

export const useLeadsUiStore = create<LeadsUiState>((set) => ({
  draggingId: null,
  dropTarget: null,
  isPanning: false,

  setDraggingId: (draggingId) => set({ draggingId }),
  setDropTarget: (dropTarget) => set({ dropTarget }),
  setIsPanning: (isPanning) => set({ isPanning }),
}))
