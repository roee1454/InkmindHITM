/**
 * Canonical Hebrew labels for the bot's dialogue states and staff call reasons, and who has to act.
 */
import type { ConversationState } from '@/integrations/ai/prompts'

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
  touch_up_request: "בקשת טאץ'-אפ",
  system_whatsapp_error: 'תקלת וואטסאפ',
  system_database_error: 'תקלת מערכת',
  system_model_error: 'תקלת מודל AI',
}

type AttentionFields = {
  state?: string | null
  status?: string | null
  staffCallReason?: string | null
}

/**
 * Why a person has to step in, in a few words ("מקדמה לאישור"), or null when nobody has to. The
 * inbox row shows it in place of the last message; the thread's action panel says the same at length.
 */
export function attentionLabel(conversation: AttentionFields): string | null {
  if (conversation.state === 'AWAIT_PRICE_OFFER') return 'מחכה להצעת מחיר'
  if (conversation.state === 'AWAIT_PAYMENT') return 'מקדמה לאישור'
  if (conversation.staffCallReason) return STAFF_REASON_LABELS[conversation.staffCallReason] ?? 'ממתין למענה'
  if (conversation.status === 'escalated') return 'ממתין למענה'
  return null
}

/** A person has to step in: the thread shows an action, the bot stays quiet, the inbox counts it as waiting. */
export function hasStaffActionButtons(conversation: AttentionFields): boolean {
  return attentionLabel(conversation) !== null
}

export type InboxBucket = 'escalated' | 'staff_handling' | 'bot_active' | 'closed'

/** Which inbox filter a conversation falls under; "waiting" wins over whoever is nominally answering. */
export function inboxBucket(conversation: AttentionFields): InboxBucket {
  if (hasStaffActionButtons(conversation)) return 'escalated'
  if (conversation.status === 'bot_active') return 'bot_active'
  if (conversation.status === 'closed') return 'closed'
  return 'staff_handling'
}
