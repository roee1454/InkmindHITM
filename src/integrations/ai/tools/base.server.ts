import { z } from 'zod'
import type { ToolFactoryContext } from './types'
import { ensureInquiryProject } from '@/features/projects/server/inquiry-project.server'

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
    start_booking: botTool(
      'מתחיל תהליך תיאום תור חדש ומעביר לשלב בירור מסלול התיאום (WANTS_TO_BOOK). קרא לכלי זה אך ורק כאשר הלקוח מביע במפורש רצון לתאם תור או לקבוע פגישה.',
      z.object({}),
      async () => {
        if (
          conversationState !== 'NEW' &&
          conversationState !== 'COMPLETED' &&
          conversationState !== 'AWAITING_APPOINTMENT'
        ) {
          return {
            status: 'error',
            message: `השיחה כבר נמצאת בתהליך עבודה פעיל במצב ${conversationState}.`,
          }
        }
        // A new booking is a new project (a second tattoo next to an upcoming one included).
        await ensureInquiryProject(su, conversationId, customerId, 'new')
        await transitionState('WANTS_TO_BOOK', {
          reason: 'start_booking',
          extraFields: { tattoo_info: null },
        })
        return {
          status: 'success',
          message: 'תהליך התיאום החל ומצב השיחה עודכן ל-WANTS_TO_BOOK. הצג ללקוח בטבעיות את שתי האפשרויות: פגישת ייעוץ וסקיצה אישית בסטודיו (כ-30 דק) או סשן קעקוע ישיר.',
        }
      }
    ),

    choose_booking_track: botTool(
      'מגדיר את מסלול התיאום שנבחר (sketch לפגישת סקיצה וייעוץ כ-30 דק\', או tattoo לסשן קעקוע ישיר) ומעביר את השיחה לשלב איסוף הפרטים (COLLECTING_INFO). קרא לכלי ברגע שהלקוח בוחר כיוון, או כשמוסר פרטים על מועד או רעיון.',
      z.object({
        track: z.enum(['sketch', 'tattoo']).describe('סוג התור שנבחר: sketch לסקיצה/ייעוץ, tattoo לקעקוע ישיר'),
      }),
      async ({ track }) => {
        // After a consultation the project is already active and the tattoo continues it.
        await ensureInquiryProject(su, conversationId, customerId, 'continue')
        await transitionState('COLLECTING_INFO', {
          reason: 'choose_booking_track',
          extraFields: {
            tattoo_info: { appointmentType: track },
          },
        })
        return {
          status: 'success',
          message: `מסלול התיאום נקבע כ-${track === 'sketch' ? 'פגישת סקיצה וייעוץ (כ-30 דק)' : 'סשן קעקוע ישיר'} ומצב השיחה עודכן ל-COLLECTING_INFO. המשך כעת בבירור אמן, מועדים ובדיקת זמינות לפי כללי COLLECTING_INFO.`,
        }
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
