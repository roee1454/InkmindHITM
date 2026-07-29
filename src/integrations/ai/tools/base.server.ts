import { z } from 'zod'
import type { ToolFactoryContext } from './types'

export function buildBaseTools(ctx: ToolFactoryContext) {
  const {
    su,
    conversationId,
    customerId,
    conversationState,
    waClient,
    customerPhone,
    transitionState,
    botTool,
  } = ctx

  return {
    start_conversation: botTool(
      'מאתחל שיחה חדשה עם לקוח ומעביר לשלב איסוף פרטי הקעקוע. קראו לכלי זה מיד כשהלקוח פונה בפעם הראשונה.',
      z.object({}),
      async () => {
        if (conversationState !== 'NEW' && conversationState !== 'COMPLETED') {
          return {
            status: 'error',
            message: `השיחה כבר נמצאת בתהליך עבודה פעיל במצב ${conversationState}. אל תאתחל אותה מחדש.`,
          }
        }
        await transitionState('COLLECTING_INFO', { reason: 'start_conversation' })
        return { status: 'success', message: 'השיחה אותחלה. המשך לשאול על רעיון הקעקוע.' }
      }
    ),

    save_client_name: botTool(
      'שומר את שם הלקוח שנמסר בשיחה בכרטיס הלקוח.',
      z.object({
        fullName: z.string().min(1).max(50).describe('השם המלא של הלקוח בלבד (שם פרטי ומשפחה, ללא תארים או תוספות, מקסימום 50 תווים)'),
      }),
      async ({ fullName }) => {
        await su.collection('customers').update(customerId, { name: fullName })
        return { status: 'success', message: 'שם הלקוח נשמר בהצלחה.' }
      }
    ),

    send_message: botTool(
      'שולח הודעת וואטסאפ נפרדת מיד, מבלי לסיים את התור שלך — לשימוש בתשובות מרובות-חלקים בלבד (למשל: תחילה פרופיל אמן, אחר כך שאלת המשך). אל תגזימו בשימוש.',
      z.object({
        text: z.string().min(1).describe('טקסט ההודעה שתישלח כבועה נפרדת'),
      }),
      async ({ text }) => {
        if (!waClient || !customerPhone) {
          return { status: 'error', message: 'לא ניתן לשלוח הודעה נפרדת כרגע — המשך/י עם תשובה סופית אחת בלבד.' }
        }
        const { wamid } = await waClient.sendText({ to: customerPhone, body: text })
        ctx.didSendMessage = true
        await su.collection('messages').create({
          conversation: conversationId,
          whatsapp_message_id: wamid,
          direction: 'outbound',
          sender_type: 'ai_bot',
          type: 'text',
          body: text,
          status: 'sent',
          timestamp: new Date().toISOString(),
          seen: true,
        })
        return {
          status: 'success',
          message: 'ההודעה כבר נשלחה ללקוח בוואצאפ! אל תציין/תחזור על תוכן הודעה זו בתשובתך הסופית. המשך ישירות לשלב הבא או סיים את התור.',
        }
      }
    ),
  }
}
