import type { MessageStatus, MessageType } from '@/integrations/whatsapp-cloud-api/types'
import type { CustomerSource } from '@/features/customers/types'

/** Flattened conversation for the inbox list (customer relation pre-resolved). */
export interface UIConversation {
  id: string
  customerName: string
  customerPhone: string
  customerSource?: CustomerSource | null
  status: string
  /** Booking-funnel state (NEW / COLLECTING_INFO / AWAIT_PRICE_OFFER / …) — drives the
   *  inline HITL cards in the thread (pricing, deposit confirmation). */
  state: string
  staffCallReason: string | null
  lastMessageAt: string | null
  windowExpiresAt: string | null
  unreadCount: number
  /** '' = idle, 'cooldown' = 10s inbound-message debounce open, 'typing' = the conversation-turn
   *  queue job is actually running. Drives BotTypingIndicator; see conversation-turn-worker.ts. */
  botTurnPhase: '' | 'cooldown' | 'typing'
}

/** Flat summary of the customer's active (pending/confirmed) appointment — what staff
 *  sees on the inline pricing card and on the deposit-confirmation preview, so approval
 *  is never blind (HITL-2/3/7). */
export interface UIAppointmentSummary {
  id: string
  status: string
  type?: 'tattoo' | 'sketch'
  tattooDescription: string
  staffName: string | null
  date: string // YYYY-MM-DD
  timeSlot: string // HH:MM
  durationMinutes: number
  priceMinIls: number | null
  priceMaxIls: number | null
  depositAmount: number | null
  depositPaid: boolean
  slotConfirmed: boolean
  healthDeclarationSigned?: boolean
  healthDeclarationDate?: string | null
  healthDeclarationFileUrl?: string | null
  medicalNotes?: string | null
  healthDeclarationAnswers?: Record<string, string | number | boolean | null | string[]> | null
  allergies?: string | null
  paymentReceiptUrl?: string | null
  referenceImages?: string[]
  createdAt?: string | null
}

/** Flattened message for the thread view. `mediaFilename` + `id` let the browser build
 *  the Pocketbase file URL; the raw file is never streamed through a server function. */
export interface UIMessage {
  id: string
  direction: 'inbound' | 'outbound'
  senderType: 'customer' | 'ai_bot' | 'staff'
  type: MessageType
  body: string
  mediaFilename: string | null
  status: MessageStatus | null
  timestamp: string
  replyToWamid: string | null
  errorDetail: string | null
  seen: boolean
  mediaCategory: 'inspiration' | 'verification' | null
  whatsappMessageId?: string | null
}

export interface WhatsAppConnectionStatus {
  configured: boolean
}
