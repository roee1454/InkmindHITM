import { z } from 'zod'
import { getSuperuserClient } from '@/integrations/pocketbase/superuser.server'
import { getWhatsAppSettings } from '@/integrations/whatsapp-cloud-api/settings.server'
import { createWhatsAppClient } from '@/integrations/whatsapp-cloud-api/client'
import { mcpWriteTool } from './shared'
import type { McpToolContext } from './shared'
import type { McpActionDiff } from '../types'

// Channel-agnostic on purpose (doc §2/§8): this calls the exact same low-level `sendText`
// function the Customer Agent uses, as an explicit staff-approved tool call — never by writing
// into `conversations`/`messages`, which belong to the WhatsApp customer channel.

export function buildMessagingTools(ctx: McpToolContext) {
  return {
    send_reminder: mcpWriteTool(
      ctx,
      'send_reminder',
      'מציע לשלוח ללקוח/ה תזכורת בוואטסאפ (למשל על מקדמה שלא שולמה). לעולם לא שולח מיד — רק מציג הצעה לאישור.',
      z.object({
        customerId: z.string(),
        text: z.string().min(1).max(1000).describe('תוכן ההודעה שתישלח'),
      }),
      async ({ customerId, text }) => {
        const su = await getSuperuserClient()
        const customer = await su.collection('customers').getOne(customerId)
        if (!customer.phone) throw new Error('ללקוח/ה הזה/ו אין מספר טלפון שמור.')
        return {
          summary: `שליחת תזכורת — ${(customer.name as string) || customer.phone}`,
          rows: [{ label: 'תוכן ההודעה', before: '—', after: text }],
        } satisfies McpActionDiff
      },
    ),

    send_update_message: mcpWriteTool(
      ctx,
      'send_update_message',
      'מציע לשלוח ללקוח/ה עדכון חופשי בוואטסאפ (למשל על שינוי מועד). לעולם לא שולח מיד — רק מציג הצעה לאישור.',
      z.object({
        customerId: z.string(),
        text: z.string().min(1).max(1000),
      }),
      async ({ customerId, text }) => {
        const su = await getSuperuserClient()
        const customer = await su.collection('customers').getOne(customerId)
        if (!customer.phone) throw new Error('ללקוח/ה הזה/ו אין מספר טלפון שמור.')
        return {
          summary: `שליחת עדכון — ${(customer.name as string) || customer.phone}`,
          rows: [{ label: 'תוכן ההודעה', before: '—', after: text }],
        } satisfies McpActionDiff
      },
    ),

    request_review: mcpWriteTool(
      ctx,
      'request_review',
      'מציע לשלוח ללקוח/ה בקשת ביקורת בוואטסאפ, בדרך כלל אחרי תור שהושלם. לעולם לא שולח מיד — רק מציג הצעה לאישור.',
      z.object({
        customerId: z.string(),
        text: z
          .string()
          .min(1)
          .max(1000)
          .default('תודה שבחרת בנו! נשמח מאוד אם תשאיר/י לנו ביקורת קצרה 🙏'),
      }),
      async ({ customerId, text }) => {
        const su = await getSuperuserClient()
        const customer = await su.collection('customers').getOne(customerId)
        if (!customer.phone) throw new Error('ללקוח/ה הזה/ו אין מספר טלפון שמור.')
        return {
          summary: `בקשת ביקורת — ${(customer.name as string) || customer.phone}`,
          rows: [{ label: 'תוכן ההודעה', before: '—', after: text }],
        } satisfies McpActionDiff
      },
    ),
  }
}

/** The only place either messaging tool actually sends — both proposals collapse to the same
 *  send path since a "reminder" and an "update" differ only in the model's own framing, not in
 *  how they're delivered. */
export async function commitMessagingAction(toolName: string, args: Record<string, unknown>): Promise<string> {
  if (toolName !== 'send_reminder' && toolName !== 'send_update_message' && toolName !== 'request_review') {
    throw new Error(`Unknown messaging action: ${toolName}`)
  }
  const { customerId, text } = args as { customerId: string; text: string }
  const su = await getSuperuserClient()
  const customer = await su.collection('customers').getOne(customerId)
  const waSettings = await getWhatsAppSettings()
  if (!waSettings?.phoneNumberId || !waSettings.accessToken) {
    throw new Error('הוואטסאפ של הסטודיו אינו מחובר — לא ניתן לשלוח הודעה כרגע.')
  }
  if (!customer.phone) throw new Error('ללקוח/ה הזה/ו אין מספר טלפון שמור.')
  const client = createWhatsAppClient({ phoneNumberId: waSettings.phoneNumberId, accessToken: waSettings.accessToken })
  await client.sendText({ to: customer.phone as string, body: text })
  return 'ההודעה נשלחה בהצלחה.'
}

export const MESSAGING_WRITE_TOOLS = new Set(['send_reminder', 'send_update_message', 'request_review'])
