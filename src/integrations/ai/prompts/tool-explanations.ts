import type { ConversationState } from './types'
import { STATE_TOOLS } from './state-prompts'

const TOOL_EXPLANATIONS: Partial<Record<string, string>> = {
  start_conversation:
    "- 'start_conversation': קרא לכלי מיד כשהלקוח פונה בפעם הראשונה כדי לאתחל שיחה.",
  start_booking:
    "- 'start_booking': קרא לכלי כאשר הלקוח מביע רצון לתאם תור או לקבוע פגישה, כדי לעבור לשלב בירור מסלול התיאום.",
  suggest_artists:
    "- 'suggest_artists': מציג את אמני הסטודיו בהודעה מרוכזת עם שמותיהם, תחום התמחותם התמציתי (לפי ה-bio) וקישור לתיק העבודות, כדי שהלקוח יוכל לבחור או להתרשם.",
  check_availability:
    "- 'check_availability': בדוק זמינות אמיתית ביומן לפני שאתה מציע או מסכם מועד. מחזיר חלופות פנויות אם המשבצת תפוסה.",
  get_artist_schedule:
    "- 'get_artist_schedule': מחזיר שעות התחלה פנויות של אמן. הצע ללקוח 2-3 שעות התחלה בדידות, ללא טווח רציף.",
  get_available_slots:
    "- 'get_available_slots': מחזיר שעות התחלה פנויות של אמן. הצע ללקוח 2-3 שעות התחלה בדידות, ללא טווח רציף.",
  resolve_date:
    "- 'resolve_date': ממיר כל ביטוי תאריך ('ראשון הבא', 'עוד שבועיים', 'סופ״ש', '26.7') לתאריך מדויק. השתמש בו לכל ביטוי שאינו 'היום' או 'מחר'. אם מחזיר ambiguous — שאל שאלה מבהירה.",
  collect_tattoo_info:
    "- 'collect_tattoo_info': קרא לכלי לאחר שהצגת סיכום מלא וקיבלת אישור מפורש מהלקוח על הפרטים. העבר type: 'sketch' לפגישת סקיצה (0.75 שעות) או type: 'tattoo' לקעקוע ישיר.",
  join_waitlist:
    "- 'join_waitlist': רושם את הלקוח לרשימת ההמתנה ומעביר את השיחה ל-WAITLIST כשאין מועדים פנויים ביומן או לבקשת הלקוח.",
  answer_faq:
    "- 'answer_faq': מענה לשאלות כלליות (שעות, מיקום, מדיניות, כאב, טיפול, תשלום). בשאלות מחיר לקעקוע — הסבר שאין מחיר מדויק מראש והמשך בתיאום.",
  choose_booking_track:
    "- 'choose_booking_track': קרא לכלי כשהלקוח בוחר מסלול (סקיצה או סשן ישיר), או כשהוא מוסר פרטים על מועד או רעיון, כדי להעביר את השיחה לשלב איסוף הפרטים (COLLECTING_INFO).",
  call_staff:
    "- 'call_staff': מיועד לטיפול אנושי חיוני (אימות תשלום עם receipt_verification, סוגיות גיל/בריאות מיוחדות, תלונות, או חריגים). אין לפנות לצוות לתיאום תור רגיל או לבדיקת זמינות שגרתית.",
  send_message: "- 'send_message': לשליחת הודעות וואטסאפ מרובות במידת הצורך.",
  send_health_declaration_notice:
    "- 'send_health_declaration_notice': שולח תבנית וואטסאפ מאושרת עם קישור להצהרת בריאות. קרא לכלי הזה בלבד כשצריך למסור ללקוח את הקישור או להסביר את שלב הצהרת הבריאות — לעולם אל תכתוב את הקישור או את ההסבר בעצמך.",
  confirm_booking_final:
    "- 'confirm_booking_final': קרא לכלי אחרי שהלקוח אישר את הסיכום הסופי שנמסר לו.",
  request_reschedule:
    "- 'request_reschedule': בירור המועד המועדף תחילה, ואז העברת הבקשה לצוות.",
  request_cancel: "- 'request_cancel': העברת בקשת ביטול תור לצוות.",
  record_nps_score: "- 'record_nps_score': רישום ציון 1-10 שנמסר מהלקוח.",
  flag_earlier_preference:
    "- 'flag_earlier_preference': רישום רצון להקדים תור קיים ברשימת ההמתנה למשבצת מוקדמת.",
}

export function toolExplanations(names: readonly string[]): string {
  return names
    .map((n) => TOOL_EXPLANATIONS[n])
    .filter(Boolean)
    .join('\n')
}

/**
 * Which tools should actually be exposed to `generateText` this turn.
 * When escalated (`isEscalated: true`), tools are restricted to safe handoff helpers
 * based on the escalation reason (such as answering FAQs or suggesting artists).
 */
export function getAllowedToolNames(
  state: ConversationState,
  isEscalated: boolean,
  staffCallReason?: string | null,
  hasStaffOverride: boolean = false,
): string[] {
  if (isEscalated) {
    const tools: string[] = []
    if (staffCallReason === 'artist_assignment') {
      tools.push('answer_faq', 'suggest_artists', 'send_message')
    } else if (staffCallReason === 'reschedule_request') {
      tools.push('check_availability', 'get_available_slots', 'resolve_date', 'answer_faq', 'send_message')
    } else {
      tools.push('answer_faq', 'send_message')
    }
    if (hasStaffOverride || state === 'AWAIT_FINAL_CONFIRMATION') {
      if (!tools.includes('confirm_booking_final')) tools.push('confirm_booking_final')
    }
    return tools
  }
  return STATE_TOOLS[state]
}
