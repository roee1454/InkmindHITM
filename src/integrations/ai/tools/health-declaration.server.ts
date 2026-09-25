import { z } from 'zod'
import type { ToolFactoryContext } from './types'

/** Distinguishes this template's rows in `messages` from any other `type: 'template'` send
 *  (e.g. a lifecycle reminder template) so the cooldown guard below only looks at its own kind. */
const TEMPLATE_LABEL = '[תבנית] הצהרת בריאות'
const TEMPLATE_NAME = 'health_declaration_notice'
const RESEND_COOLDOWN_MS = 3 * 60 * 60 * 1000 // 3h — enough to stop every "אוקיי"/photo re-triggering a resend

export function buildHealthDeclarationTools(ctx: ToolFactoryContext) {
  const { su, conversationId, customerId, waClient, customerPhone, botTool } = ctx

  return {
    send_health_declaration_notice: botTool(
      "שולח ללקוח הודעת תבנית מאושרת של וואטסאפ עם קישור למילוי הצהרת בריאות. קרא לכלי הזה בלבד כשצריך למסור ללקוח את הקישור או להסביר את שלב הצהרת הבריאות — אל תכתוב את הקישור או את ההסבר בעצמך בטקסט חופשי.",
      z.object({}),
      async () => {
        if (!waClient || !customerPhone) {
          return { status: 'error', message: 'לא ניתן לשלוח תבנית כרגע — הסבר ללקוח שהצוות ישלח את הקישור בהקדם.' }
        }

        const recent = await su.collection('messages').getList(1, 1, {
          filter: su.filter('conversation = {:cid} && type = "template" && body = {:label}', {
            cid: conversationId,
            label: TEMPLATE_LABEL,
          }),
          sort: '-timestamp',
        })
        const lastSent = recent.items[0]
        if (lastSent && Date.now() - new Date(lastSent.timestamp as string).getTime() < RESEND_COOLDOWN_MS) {
          return {
            status: 'skipped',
            message: 'ההודעה כבר נשלחה ללקוח לאחרונה. אל תשלח שוב ואל תסביר את הקישור בעצמך — אם הלקוח מתעקש, הצע לקרוא ל-call_staff.',
          }
        }

        const customer = await su.collection('customers').getOne(customerId).catch(() => null)
        const customerName = (customer?.name as string) || 'לקוח/ה יקר/ה'

        const { wamid } = await waClient.sendTemplate({
          to: customerPhone,
          templateName: TEMPLATE_NAME,
          languageCode: 'he',
          components: [{ type: 'body', parameters: [{ type: 'text', text: customerName }] }],
        })
        ctx.didSendMessage = true

        await su.collection('messages').create({
          conversation: conversationId,
          whatsapp_message_id: wamid,
          direction: 'outbound',
          sender_type: 'ai_bot',
          type: 'template',
          body: TEMPLATE_LABEL,
          status: 'sent',
          timestamp: new Date().toISOString(),
          seen: true,
        })

        return {
          status: 'success',
          message: 'תבנית הצהרת הבריאות נשלחה ללקוח בוואטסאפ. אל תסביר או תחזור על תוכנה — המשך/י ישירות בשיחה.',
        }
      },
    ),
  }
}
