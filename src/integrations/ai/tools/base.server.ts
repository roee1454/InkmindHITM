import { z } from 'zod'
import type { ToolFactoryContext } from './types'
import { ensureInquiryProject } from '@/features/projects/server/inquiry-project.server'
import { loadProjectPolicy } from '@/features/settings/server/project-policy'
import type { ConversationState } from '../prompts'
import { BOOKING_SCOPES, defaultBookingScope, touchUpTerms } from './booking-scope'
import { findNextSessionProject, findTouchUpProject, hadConsultation } from './booking-scope.server'

/** The resting states a new booking can start from. */
const BOOKING_START_STATES: ConversationState[] = ['NEW', 'COMPLETED', 'AWAITING_APPOINTMENT', 'PROJECT_IN_PROGRESS']

export function buildBaseTools(ctx: ToolFactoryContext) {
  const {
    su,
    conversationId,
    customerId,
    conversationState,
    waClient,
    customerPhone,
    transitionState,
    updateConversation,
    notifyStaff,
    botTool,
  } = ctx

  /** The next session of the piece under way: same project, a tattoo session, no track question. */
  async function startNextSession() {
    const project = await findNextSessionProject(su, conversationId)
    if (!project) {
      return {
        status: 'error',
        message: "ללקוח אין קעקוע שנמצא באמצע עבודה. אם הוא רוצה קעקוע חדש, קרא ל-start_booking עם scope 'new_project'.",
      }
    }
    await transitionState('COLLECTING_INFO', {
      reason: 'start_booking_next_session',
      extraFields: { active_project: project.id, tattoo_info: { appointmentType: 'tattoo', bookingScope: 'next_session' } },
    })
    return {
      status: 'success',
      message: `קביעת הסשן הבא של "${String(project.title)}" החלה. זה סשן קעקוע באותו פרויקט: אל תשאל על פגישת ייעוץ. המשך באמן, מועדים ובדיקת זמינות, לפי המועד המומלץ בהקשר הפרויקט.`,
    }
  }

  /** A touch-up of a finished (or in-progress) piece, on the studio's terms. */
  async function startTouchUp() {
    const project = await findTouchUpProject(su, conversationId, customerId)
    if (!project) {
      return {
        status: 'error',
        message: "לא נמצא קעקוע קודם של הלקוח בסטודיו שאפשר לעשות לו טאץ'-אפ. שאל אם מדובר בקעקוע חדש, או קרא ל-call_staff.",
      }
    }
    const policy = await loadProjectPolicy(su)
    const terms = touchUpTerms(policy.touchUp, (project.completed_at as string) || null, new Date())
    if (terms === 'ask_staff') {
      await updateConversation({ status: 'escalated', is_staff_called: true, staff_call_reason: 'touch_up_request', active_project: project.id })
      await notifyStaff("בקשת טאץ'-אפ", `הלקוח מבקש טאץ'-אפ ל"${String(project.title)}". מדיניות הטאץ'-אפ של הסטודיו עוד לא הוגדרה, ולכן הבקשה עברה אליכם.`)
      return {
        status: 'success',
        message: "הבקשה לטאץ'-אפ הועברה לצוות. אמור ללקוח בקצרה שהצוות יחזור אליו לגבי הטאץ'-אפ. אל תבטיח מחיר או מועד.",
      }
    }
    await transitionState('COLLECTING_INFO', {
      reason: 'start_booking_touch_up',
      extraFields: { active_project: project.id, tattoo_info: { appointmentType: 'tattoo', bookingScope: 'touch_up', touchUpTerms: terms } },
    })
    return {
      status: 'success',
      message:
        terms === 'free'
          ? `קביעת טאץ'-אפ ל"${String(project.title)}" החלה. הטאץ'-אפ בתקופה שבה הוא ללא עלות לפי מדיניות הסטודיו. המשך באמן ומועד.`
          : `קביעת טאץ'-אפ ל"${String(project.title)}" החלה. הטאץ'-אפ בתשלום לפי מדיניות הסטודיו, והצוות יתמחר אותו. המשך באמן ומועד, ואל תנקוב במחיר.`,
    }
  }

  return {
    start_booking: botTool(
      "מתחיל תהליך תיאום תור. קרא לכלי אך ורק כשהלקוח מביע במפורש רצון לקבוע. scope: 'new_project' לקעקוע חדש ונפרד, 'next_session' לסשן הבא של קעקוע שבאמצע עבודה, 'touch_up' לטאץ'-אפ של קעקוע קיים. אם לא ברור, שאל את הלקוח.",
      z.object({
        scope: z.enum(BOOKING_SCOPES).optional().describe("ברירת מחדל: next_session כשהלקוח באמצע פרויקט, אחרת new_project"),
      }),
      async ({ scope }) => {
        if (!BOOKING_START_STATES.includes(conversationState)) {
          return {
            status: 'error',
            message: `השיחה כבר נמצאת בתהליך עבודה פעיל במצב ${conversationState}.`,
          }
        }
        const effective = scope ?? defaultBookingScope(conversationState)
        if (effective === 'next_session') return startNextSession()
        if (effective === 'touch_up') return startTouchUp()

        // A new booking is a new project (a second tattoo next to an upcoming one included).
        await ensureInquiryProject(su, conversationId, customerId, 'new')
        await transitionState('WANTS_TO_BOOK', {
          reason: 'start_booking',
          extraFields: { tattoo_info: null },
        })
        return {
          status: 'success',
          message: 'תהליך התיאום החל ומצב השיחה עודכן ל-WANTS_TO_BOOK. הצג ללקוח בטבעיות את שתי האפשרויות: פגישת ייעוץ וסקיצה אישית בסטודיו (עד שעה) או סשן קעקוע ישיר.',
        }
      }
    ),

    choose_booking_track: botTool(
      'מגדיר את מסלול התיאום שנבחר (sketch לפגישת סקיצה וייעוץ עד שעה, או tattoo לסשן קעקוע ישיר) ומעביר את השיחה לשלב איסוף הפרטים (COLLECTING_INFO). קרא לכלי ברגע שהלקוח בוחר כיוון, או כשמוסר פרטים על מועד או רעיון.',
      z.object({
        track: z.enum(['sketch', 'tattoo']).describe('סוג התור שנבחר: sketch לסקיצה/ייעוץ, tattoo לקעקוע ישיר'),
        customerAskedForConsultation: z
          .boolean()
          .optional()
          .describe('true רק אם הלקוח ביקש במפורש פגישת ייעוץ נוספת, אחרי שכבר עבר ייעוץ בפרויקט הזה'),
      }),
      async ({ track, customerAskedForConsultation }) => {
        // After a consultation the project is already active and the tattoo continues it.
        const projectId = await ensureInquiryProject(su, conversationId, customerId, 'continue')
        if (track === 'sketch' && !customerAskedForConsultation && (await hadConsultation(su, projectId))) {
          return {
            status: 'error',
            message:
              "הלקוח כבר עבר פגישת ייעוץ בפרויקט הזה, והמסלול הוא סשן קעקוע: קרא שוב עם tattoo. רק אם הלקוח ביקש במפורש ייעוץ נוסף, קרא עם sketch ו-customerAskedForConsultation: true.",
          }
        }
        await transitionState('COLLECTING_INFO', {
          reason: 'choose_booking_track',
          extraFields: {
            tattoo_info: { appointmentType: track },
          },
        })
        return {
          status: 'success',
          message: `מסלול התיאום נקבע כ-${track === 'sketch' ? 'פגישת סקיצה וייעוץ (עד שעה)' : 'סשן קעקוע ישיר'} ומצב השיחה עודכן ל-COLLECTING_INFO. המשך כעת בבירור אמן, מועדים ובדיקת זמינות לפי כללי COLLECTING_INFO.`,
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
