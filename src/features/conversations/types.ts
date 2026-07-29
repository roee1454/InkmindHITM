import type { MessageStatus, MessageType } from '@/integrations/whatsapp-cloud-api/types'

/** Flattened conversation for the inbox list (customer relation pre-resolved). */
export interface UIConversation {
  id: string
  customerName: string
  customerPhone: string
  status: string
  /** Booking-funnel state (NEW / COLLECTING_INFO / AWAIT_PRICE_OFFER / …) — drives the
   *  inline HITL cards in the thread (pricing, deposit confirmation). */
  state: string
  staffCallReason: string | null
  lastMessageAt: string | null
  windowExpiresAt: string | null
  unreadCount: number
}

/** Flat summary of the customer's active (pending/confirmed) appointment — what staff
 *  sees on the inline pricing card and on the deposit-confirmation preview, so approval
 *  is never blind (HITL-2/3/7). */
export interface UIAppointmentSummary {
  id: string
  status: string
  tattooDescription: string
  staffName: string | null
  date: string // YYYY-MM-DD
  timeSlot: string // HH:MM
  durationHours: number
  priceIls: number | null
  depositAmount: number | null
  depositPaid: boolean
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
}

export interface WhatsAppConnectionStatus {
  configured: boolean
}
