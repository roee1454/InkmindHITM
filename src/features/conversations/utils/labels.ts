/**
 * Canonical Hebrew labels for conversation statuses and staff call reasons.
 * Single source of truth across list items, thread headers, action docks, and dialogs.
 */
import type { ConversationState } from '@/integrations/ai/prompts'

export const STATUS_LABEL: Record<string, string> = {
  all: 'הכל',
  bot_active: 'בוט',
  escalated: 'ממתין למענה',
  staff_handling: 'בטיפול צוות',
  closed: 'סגור',
}

/** The bot's dialogue state (conversations.state), as staff read it. */
export const CONVERSATION_STATE_LABELS: Record<ConversationState, string> = {
  NEW: 'ליד חדש',
  WANTS_TO_BOOK: 'בירור מסלול',
  COLLECTING_INFO: 'איסוף פרטים',
  WAITLIST: 'רשימת המתנה',
  AWAIT_PRICE_OFFER: 'ממתין לתמחור',
  AWAIT_HEALTH_NOTICE: 'הצהרת בריאות',
  AWAIT_PAYMENT: 'ממתין למקדמה',
  AWAIT_FINAL_CONFIRMATION: 'אישור סופי',
  AWAITING_APPOINTMENT: 'נקבע תור',
  PROJECT_IN_PROGRESS: 'באמצע פרויקט',
  AWAIT_NPS_SCORE: 'משוב ודירוג',
  COMPLETED: 'סגור / הושלם',
}

export function conversationStateLabel(state: string): string {
  return CONVERSATION_STATE_LABELS[state as ConversationState] ?? state
}

export const STAFF_REASON_LABELS: Record<string, string> = {
  price_offering: 'הצעת מחיר',
  receipt_verification: 'אימות תשלום',
  slot_conflict: 'התנגשות תורים',
  artist_assignment: 'שיוך אמן',
  reschedule_request: 'בקשת שינוי מועד',
  cancel_request: 'בקשת ביטול',
  complaint: 'תלונה',
  unhandled_query: 'שאלה ללא מענה',
  consultation_alert: 'נדרש ייעוץ',
  security_alert: 'התראת אבטחה',
  system_whatsapp_error: 'תקלת וואטסאפ',
  system_database_error: 'תקלת מערכת',
  system_model_error: 'תקלת מודל AI',
}

/**
 * Determines whether the conversation currently renders staff action buttons in the UI.
 * When true, a human staff member must intervene, and the bot must be disabled.
 */
export function hasStaffActionButtons(conversation: {
  state?: string | null
  status?: string | null
  staffCallReason?: string | null
}): boolean {
  if (conversation.state === 'AWAIT_PRICE_OFFER') return true
  if (conversation.state === 'AWAIT_PAYMENT') return true
  if (conversation.staffCallReason === 'cancel_request') return true
  if (conversation.staffCallReason === 'slot_conflict') return true
  if (conversation.status === 'escalated' || Boolean(conversation.staffCallReason)) return true
  return false
}

/**
 * Determines whether the conversation is in a waiting stage where we await customer response.
 * In these stages, no action buttons are shown, and the composer is disabled.
 */
export function isAwaitingCustomerAction(state?: string | null): boolean {
  return state === 'AWAIT_HEALTH_NOTICE' || state === 'AWAIT_FINAL_CONFIRMATION'
}


