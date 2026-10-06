import { z } from 'zod'
import { getSuperuserClient } from '@/integrations/pocketbase/superuser.server'
import { getWhatsAppSettings } from '@/integrations/whatsapp-cloud-api/settings.server'
import {
  createWhatsAppClient,
  WhatsAppApiError,
  ERROR_REENGAGEMENT_REQUIRED,
} from '@/integrations/whatsapp-cloud-api/client'
import { mcpReadTool, mcpWriteTool } from './shared'
import type { McpToolContext } from './shared'
import type { McpActionDiff } from '../types'
import { stateAttribution } from '@/features/conversations/server/state-machine'
import { conversationStateLabel, attentionLabel } from '@/features/conversations/utils/labels'

export function buildMessagingTools(ctx: McpToolContext) {
  return {
    // ==========================================
    // READ TOOLS: Customer Conversations & Chat
    // ==========================================

    get_customer_conversation: mcpReadTool(
      'קורא את היסטוריית השיחה המלאה בוואטסאפ עם הלקוח/ה: הודעות אחרונות, כיוון (לקוח/בוט/נציג), תמונות רפרנס שנשלחו, שלב נוכחי, ומצב חלון 24 השעות.',
      z.object({
        customerId: z.string().optional().describe('מזהה הלקוח/ה'),
        conversationId: z.string().optional().describe('מזהה השיחה (אופציונלי אם סופק customerId)'),
        limit: z.number().int().min(1).max(50).default(20).optional().describe('כמות הודעות אחרונות לקריאה (ברירת מחדל: 20)'),
      }),
      async ({ customerId, conversationId, limit = 20 }) => {
        const su = await getSuperuserClient()

        let convRecord = null
        if (conversationId) {
          convRecord = await su.collection('conversations').getOne(conversationId, { expand: 'customer,active_project' }).catch(() => null)
        } else if (customerId) {
          convRecord = await su.collection('conversations').getFirstListItem(`customer = "${customerId}"`, { expand: 'customer,active_project' }).catch(() => null)
        }

        if (!convRecord) {
          return { status: 'error', message: 'לא נמצאה שיחה עבור הלקוח/ה או המזהה המבוקש.' }
        }

        const windowExpiresAt = convRecord.window_expires_at ? new Date(convRecord.window_expires_at as string) : null
        const isWindowOpen = windowExpiresAt ? windowExpiresAt.getTime() > Date.now() : false

        // Fetch recent messages
        const msgList = await su.collection('messages').getList(1, Math.min(Math.max(limit, 1), 50), {
          filter: `conversation = "${convRecord.id}"`,
          sort: '-created',
        })

        // Sort chronologically (oldest first)
        const sortedItems = [...msgList.items].sort((a, b) => {
          const tA = new Date((a.timestamp || a.created) as string).getTime()
          const tB = new Date((b.timestamp || b.created) as string).getTime()
          return tA - tB
        })

        const messages = sortedItems.map((m) => ({
          id: m.id,
          senderType: (m.sender_type as string) || 'customer',
          direction: (m.direction as string) || 'inbound',
          type: (m.type as string) || 'text',
          body: (m.body as string) || '',
          mediaCategory: (m.media_category as string) || null,
          timestamp: (m.timestamp as string) || (m.created as string),
        }))

        const customer = convRecord.expand?.customer as Record<string, unknown> | undefined
        const activeProject = convRecord.expand?.active_project as Record<string, unknown> | undefined

        return {
          status: 'success',
          message: `נקראו ${messages.length} הודעות מהשיחה.`,
          data: {
            conversationId: convRecord.id,
            customerId: convRecord.customer as string,
            customerName: (customer?.name as string) || null,
            customerPhone: (customer?.phone as string) || '',
            status: convRecord.status as string,
            state: convRecord.state as string,
            stateLabel: conversationStateLabel((convRecord.state as string) || 'NEW'),
            attentionReason: attentionLabel({
              state: convRecord.state as string,
              status: convRecord.status as string,
              staffCallReason: convRecord.staff_call_reason as string,
            }),
            activeProject: activeProject
              ? {
                  id: activeProject.id,
                  title: activeProject.title,
                  stage: activeProject.stage,
                }
              : null,
            isWindowOpen,
            windowExpiresAt: convRecord.window_expires_at || null,
            unreadCount: Number(convRecord.unread_count) || 0,
            messages,
          },
        }
      },
    ),

    list_conversations: mcpReadTool(
      'מציג רשימת שיחות וואטסאפ פעילות או שיחות שממתינות למענה נציג, עם תצוגה מקדימה של ההודעה האחרונה ושלב הטיפול.',
      z.object({
        status: z.enum(['bot_handling', 'staff_handling', 'staff_active', 'all']).default('all').optional(),
        state: z.string().optional().describe('סינון לפי שלב בבוט (למשל AWAIT_PRICE_OFFER, AWAIT_PAYMENT)'),
        needsAttentionOnly: z.boolean().default(false).optional().describe('להציג רק שיחות שממתינות למענה אנושי'),
        limit: z.number().int().min(1).max(50).default(15).optional(),
      }),
      async ({ status = 'all', state, needsAttentionOnly = false, limit = 15 }) => {
        const su = await getSuperuserClient()

        const filterParts: string[] = []
        if (status && status !== 'all') {
          filterParts.push(`status = "${status}"`)
        }
        if (state) {
          filterParts.push(`state = "${state}"`)
        }

        const filter = filterParts.length > 0 ? filterParts.join(' && ') : ''

        const convList = await su.collection('conversations').getList(1, Math.min(Math.max(limit * 2, 20), 50), {
          filter: filter || undefined,
          sort: '-last_message_at',
          expand: 'customer,active_project',
        })

        let items = convList.items.map((c) => {
          const customer = c.expand?.customer as Record<string, unknown> | undefined
          const project = c.expand?.active_project as Record<string, unknown> | undefined
          const attention = attentionLabel({
            state: c.state as string,
            status: c.status as string,
            staffCallReason: c.staff_call_reason as string,
          })
          return {
            conversationId: c.id,
            customerId: c.customer as string,
            customerName: (customer?.name as string) || 'ללא שם',
            customerPhone: (customer?.phone as string) || '',
            status: c.status as string,
            state: c.state as string,
            stateLabel: conversationStateLabel((c.state as string) || 'NEW'),
            attentionReason: attention,
            needsAttention: Boolean(attention || c.status === 'staff_handling' || Number(c.unread_count) > 0),
            projectTitle: (project?.title as string) || null,
            lastMessagePreview: (c.last_message_preview as string) || '',
            lastMessageAt: (c.last_message_at as string) || (c.updated as string),
          }
        })

        if (needsAttentionOnly) {
          items = items.filter((i) => i.needsAttention)
        }

        const finalItems = items.slice(0, limit)
        return {
          status: 'success',
          message: `נמצאו ${finalItems.length} שיחות.`,
          data: finalItems,
        }
      },
    ),

    search_conversation_messages: mcpReadTool(
      'מחפש הודעות טקסט בתוך שיחות וואטסאפ לפי מילת חיפוש חופשית (למשל: סקיצה, מחיר, צמיד).',
      z.object({
        query: z.string().min(2).max(100).describe('מילת חיפוש בתוכן ההודעות'),
        customerId: z.string().optional().describe('אופציונלי: להגביל חיפוש ללקוח/ה ספציפי/ת'),
        limit: z.number().int().min(1).max(30).default(10).optional(),
      }),
      async ({ query, customerId, limit = 10 }) => {
        const su = await getSuperuserClient()

        let convFilter = ''
        if (customerId) {
          const conv = await su.collection('conversations').getFirstListItem(`customer = "${customerId}"`).catch(() => null)
          if (!conv) {
            return { status: 'error', message: 'לא נמצאה שיחה עבור הלקוח/ה הזה/ו.' }
          }
          convFilter = `conversation = "${conv.id}" && `
        }

        const safeQuery = query.replace(/["\\]/g, '')
        const filter = `${convFilter}body ~ "${safeQuery}"`

        const msgList = await su.collection('messages').getList(1, Math.min(Math.max(limit * 2, 20), 50), {
          filter,
          sort: '-created',
          expand: 'conversation.customer',
        })

        const lowerQuery = query.toLowerCase()
        const matched = msgList.items.filter((m) => ((m.body as string) || '').toLowerCase().includes(lowerQuery))

        const results = matched.slice(0, limit).map((m) => {
          const conv = m.expand?.conversation as (Record<string, unknown> & { expand?: { customer?: Record<string, unknown> } }) | undefined
          const customer = conv?.expand?.customer
          return {
            messageId: m.id,
            conversationId: m.conversation as string,
            customerId: (conv?.customer as string) || null,
            customerName: (customer?.name as string) || 'לקוח ללא שם',
            senderType: (m.sender_type as string) || 'customer',
            direction: (m.direction as string) || 'inbound',
            body: m.body as string,
            timestamp: (m.timestamp as string) || (m.created as string),
          }
        })

        return {
          status: 'success',
          message: `נמצאו ${results.length} הודעות תואמות.`,
          data: results,
        }
      },
    ),

    // ==========================================
    // WRITE TOOLS: WhatsApp Outbound (HITL)
    // ==========================================

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

/** The only place messaging write tools actually send */
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
  let wamid = ''
  try {
    const res = await client.sendText({ to: customer.phone as string, body: text })
    wamid = res.wamid
  } catch (error) {
    if (error instanceof WhatsAppApiError && error.code === ERROR_REENGAGEMENT_REQUIRED) {
      throw new Error(
        'לא ניתן לשלוח הודעה — הלקוח/ה מחוץ לחלון 24 השעות של וואטסאפ. יש ליצור קשר באמצעות תבנית מאושרת או בדרך אחרת.',
      )
    }
    throw error
  }

  // Bug 49: Record outbound MCP message in messages collection and sync conversation
  let conv = await su.collection('conversations').getFirstListItem(`customer = "${customer.id}"`).catch(() => null)
  if (!conv) {
    conv = await su
      .collection('conversations')
      .create({
        customer: customer.id,
        channel: 'whatsapp',
        state: 'COLLECTING_INFO',
        ...stateAttribution('staff', 'mcp_started_conversation'),
        status: 'staff_active',
        last_message_at: new Date().toISOString(),
      })
      .catch(() => null)
  }

  if (conv) {
    await su
      .collection('messages')
      .create({
        conversation: conv.id,
        whatsapp_message_id: wamid,
        direction: 'outbound',
        sender_type: 'staff',
        type: 'text',
        body: text,
        status: 'sent',
        timestamp: new Date().toISOString(),
        seen: true,
      })
      .catch(() => null)

    await su
      .collection('conversations')
      .update(conv.id, {
        last_message_at: new Date().toISOString(),
      })
      .catch(() => null)
  }

  return 'ההודעה נשלחה בהצלחה.'
}

export const MESSAGING_WRITE_TOOLS = new Set(['send_reminder', 'send_update_message', 'request_review'])
