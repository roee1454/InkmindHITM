import { create } from 'zustand'

interface SettingsUiState {
  // AI config state
  aiModel: string
  aiTemperature: number
  aiMaxTokens: string
  aiInstructions: string
  aiConfigSaved: boolean
  aiInstructionsSaved: boolean
  aiError: string | null

  // FAQ tab state
  faqNewQuestion: string
  faqNewAnswer: string
  faqEditingId: string | null
  faqEditQuestion: string
  faqEditAnswer: string
  faqError: string | null

  // AI config actions
  setAiModel: (model: string) => void
  setAiTemperature: (temp: number) => void
  setAiMaxTokens: (tokens: string) => void
  setAiInstructions: (instructions: string) => void
  setAiConfigSaved: (saved: boolean) => void
  setAiInstructionsSaved: (saved: boolean) => void
  setAiError: (error: string | null) => void

  // FAQ actions
  setFaqNewQuestion: (q: string) => void
  setFaqNewAnswer: (a: string) => void
  setFaqEditingId: (id: string | null) => void
  setFaqEditQuestion: (q: string) => void
  setFaqEditAnswer: (a: string) => void
  setFaqError: (error: string | null) => void
}

export const useSettingsUiStore = create<SettingsUiState>((set) => ({
  // Defaults
  aiModel: 'gpt-4o',
  aiTemperature: 0.4,
  aiMaxTokens: '',
  aiInstructions: '',
  aiConfigSaved: false,
  aiInstructionsSaved: false,
  aiError: null,

  faqNewQuestion: '',
  faqNewAnswer: '',
  faqEditingId: null,
  faqEditQuestion: '',
  faqEditAnswer: '',
  faqError: null,

  // Setters
  setAiModel: (aiModel) => set({ aiModel }),
  setAiTemperature: (aiTemperature) => set({ aiTemperature }),
  setAiMaxTokens: (aiMaxTokens) => set({ aiMaxTokens }),
  setAiInstructions: (aiInstructions) => set({ aiInstructions }),
  setAiConfigSaved: (aiConfigSaved) => set({ aiConfigSaved }),
  setAiInstructionsSaved: (aiInstructionsSaved) => set({ aiInstructionsSaved }),
  setAiError: (aiError) => set({ aiError }),

  setFaqNewQuestion: (faqNewQuestion) => set({ faqNewQuestion }),
  setFaqNewAnswer: (faqNewAnswer) => set({ faqNewAnswer }),
  setFaqEditingId: (faqEditingId) => set({ faqEditingId }),
  setFaqEditQuestion: (faqEditQuestion) => set({ faqEditQuestion }),
  setFaqEditAnswer: (faqEditAnswer) => set({ faqEditAnswer }),
  setFaqError: (faqError) => set({ faqError }),
}))
