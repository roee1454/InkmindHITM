import { create } from 'zustand'
import type { UIMessage } from '../types'

export interface SelectedFile {
  base64: string
  filename: string
  mimeType: string
  previewUrl?: string
}

interface ConversationsUiState {
  searchQuery: string
  messagesLimit: number
  draft: string
  replyingTo: UIMessage | null
  selectedFile: SelectedFile | null

  // Actions
  setSearchQuery: (query: string) => void
  setMessagesLimit: (limit: number) => void
  setDraft: (draft: string) => void
  setReplyingTo: (message: UIMessage | null) => void
  setSelectedFile: (file: SelectedFile | null) => void
  resetThread: () => void
}

export const useConversationsUiStore = create<ConversationsUiState>((set) => ({
  searchQuery: '',
  messagesLimit: 50,
  draft: '',
  replyingTo: null,
  selectedFile: null,

  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setMessagesLimit: (messagesLimit) => set({ messagesLimit }),
  setDraft: (draft) => set({ draft }),
  setReplyingTo: (replyingTo) => set({ replyingTo }),
  setSelectedFile: (selectedFile) => set({ selectedFile }),
  resetThread: () => set({ draft: '', replyingTo: null, selectedFile: null, messagesLimit: 50 }),
}))
