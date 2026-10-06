import { z } from 'zod'
import type { ToolFactoryContext } from './types'
import { getStudioPolicyForBot } from '@/features/settings/server/policy'
import { DETERMINISTIC_TEMPLATES, sendDeterministicMessage } from '../engine/deterministic-templates'

const RESEND_COOLDOWN_MS = 3 * 60 * 60 * 1000 // 3h — enough to stop every "אוקיי"/photo re-triggering a resend

export function buildHealthDeclarationTools(ctx: ToolFactoryContext) {
  const { su, conversationId, waClient, customerPhone, botTool } = ctx

  return {
    send_health_declaration_notice: botTool(
      "שולח ללקוח הודעת תבנית עם קישור למילוי הצהרת בריאות. קרא לכלי הזה בלבד כשצריך למסור ללקוח את הקישור או להסביר את שלב הצהרת הבריאות — אל תכתוב את הקישור או את ההסבר בעצמך בטקסט חופשי.",
      z.object({}),
      async () => {
        if (!waClient || !customerPhone) {
          return { status: 'error', message: 'לא ניתן לשלוח תבנית כרגע — הסבר ללקוח שהצוות ישלח את הקישור בהקדם.' }
        }

        const recent = await su.collection('messages').getList(1, 1, {
          filter: su.filter('conversation = {:cid} && direction = "outbound" && (type = "template" || body ~ {:snippet})', {
            cid: conversationId,
            snippet: 'הצהרת בריאות',
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

        const policy = await getStudioPolicyForBot(su).catch(() => ({
          healthDeclarationFormUrl: null,
        }))
        const healthFormUrl =
          policy.healthDeclarationFormUrl?.trim() ||
          process.env.HEALTH_DECLARATION_URL?.trim() ||
          ''

        if (!healthFormUrl) {
          return {
            status: 'error',
            message: 'טרם הוגדר קישור לטופס הצהרת בריאות במערכת — הודע ללקוח שהצוות יעביר לו קישור בהקדם.',
          }
        }

        const templateText = DETERMINISTIC_TEMPLATES.healthDeclarationNotice({ formUrl: healthFormUrl })
        const { sent } = await sendDeterministicMessage(ctx, templateText)

        return {
          status: 'success',
          message: sent
            ? 'תבנית הצהרת הבריאות נשלחה ללקוח בוואטסאפ. אל תסביר או תחזור על תוכנה — המשך/י ישירות בשיחה.'
            : 'לא ניתן לשלוח את ההודעה כרגע — הסבר ללקוח שהצוות ישלח את הקישור בהקדם.',
        }
      },
    ),
  }
}
