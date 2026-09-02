import { create } from 'zustand'

interface McpUiState {
  isOpen: boolean
  panelMode: 'chat' | 'history'
  activeConversationId: string | null
  draft: string
  /** Per-action in-progress edits — survives the panel closing/reopening (doc §5), keyed by
   *  action id so switching conversations doesn't lose an edit on an action elsewhere. */
  draftEdits: Record<string, Record<string, unknown>>

  open: (conversationId?: string | null) => void
  close: () => void
  setPanelMode: (mode: 'chat' | 'history') => void
  toggleHistory: () => void
  setActiveConversation: (conversationId: string | null) => void
  setDraft: (draft: string) => void
  setDraftEdit: (actionId: string, edit: Record<string, unknown>) => void
  clearDraftEdit: (actionId: string) => void
}

export const useMcpUiStore = create<McpUiState>((set, get) => ({
  isOpen: false,
  panelMode: 'chat',
  activeConversationId: null,
  draft: '',
  draftEdits: {},

  open: (conversationId) =>
    set({ isOpen: true, panelMode: 'chat', ...(conversationId !== undefined ? { activeConversationId: conversationId } : {}) }),
  close: () => set({ isOpen: false }),
  setPanelMode: (panelMode) => set({ panelMode }),
  toggleHistory: () => set({ panelMode: get().panelMode === 'history' ? 'chat' : 'history' }),
  setActiveConversation: (activeConversationId) => set({ activeConversationId, panelMode: 'chat', draft: '' }),
  setDraft: (draft) => set({ draft }),
  setDraftEdit: (actionId, edit) => set((s) => ({ draftEdits: { ...s.draftEdits, [actionId]: edit } })),
  clearDraftEdit: (actionId) =>
    set((s) => {
      const next = { ...s.draftEdits }
      delete next[actionId]
      return { draftEdits: next }
    }),
}))
