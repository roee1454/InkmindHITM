import { APICallError } from 'ai'
import type PocketBase from 'pocketbase'
import { ClientResponseError } from 'pocketbase'
import { WhatsAppApiError } from '@/integrations/whatsapp-cloud-api/client'
import { addSystemNotification } from '@/features/notifications/server/notifications'

export async function escalate(su: PocketBase, conversationId: string, reason: string, title: string, details: string) {
  try {
    const conversation = await su.collection('conversations').getOne(conversationId)
    if (conversation.status === 'escalated') {
      return // Already escalated, skip notification to avoid duplicates
    }
  } catch (err) {
    // If we fail to fetch, proceed anyway to be safe
  }

  await su.collection('conversations').update(conversationId, {
    status: 'escalated',
    is_staff_called: true,
    staff_call_reason: reason,
  }).catch(() => null)
  await addSystemNotification({
    title,
    message: details,
    type: 'error',
    link: `/dashboard/conversations?chatId=${conversationId}`,
  }).catch(() => null)
}

/** Classified escalation (FLOW-10): tells staff whether a bot turn failed because of a model
 *  outage, a WhatsApp send failure, or a DB error, instead of collapsing everything into one
 *  generic reason they'd have to dig through server logs to tell apart. */
export function classifyBotTurnError(err: unknown): { reason: string; title: string } {
  if (err instanceof WhatsAppApiError) {
    return { reason: 'system_whatsapp_error', title: 'שליחת וואטסאפ נכשלה בתור הבוט' }
  }
  if (err instanceof ClientResponseError) {
    return { reason: 'system_database_error', title: 'שגיאת בסיס נתונים בתור הבוט' }
  }
  if (APICallError.isInstance(err)) {
    return { reason: 'system_model_error', title: 'קריאת מודל ה-AI נכשלה' }
  }
  return { reason: 'unhandled_query', title: 'הבוט לא הצליח להשיב' }
}
