import type { TemplateComponent } from '@/integrations/whatsapp-cloud-api/client'

/**
 * The lifecycle's messages to customers, and the Meta template each one falls back to when the
 * 24-hour window is closed (docs/projects-payments/meta-templates.md lists them for approval).
 * The template's body variables are listed with it; the free text and the template say the same.
 */
export interface LifecycleMessage {
  body: string
  templateName: string
  templateComponents: TemplateComponent[]
}

function bodyParams(...values: string[]): TemplateComponent[] {
  return [{ type: 'body', parameters: values.map((text) => ({ type: 'text', text })) }]
}

function greetingName(name: string | null): string {
  return name?.trim() || 'לקוח/ה יקר/ה'
}

/** Late in the healing period of a session; between sessions it also invites booking the next one. */
export function healingCheckMessage(input: { name: string | null; inviteNextSession: boolean }): LifecycleMessage {
  const name = input.name?.trim() ? ` ${input.name.trim()}` : ''
  const lines = [
    `היי${name}! עבר זמן מאז הסשן שלך בסטודיו 💫`,
    '',
    'איך הקעקוע החלים? הכל מרגיש רגוע וטוב?',
    'נשמח אם תשלח/י לנו תמונה של התוצאה ✨',
    input.inviteNextSession ? 'וכשתרגיש/י מוכן/ה, נשמח לקבוע את הסשן הבא. אפשר פשוט לכתוב כאן.' : 'ואנחנו כאן לכל שאלה.',
  ]
  return {
    body: lines.join('\n'),
    templateName: input.inviteNextSession ? 'healing_check_next_session' : 'healing_check',
    templateComponents: bodyParams(greetingName(input.name)),
  }
}

/** At the end of a project, when the studio asks for reviews directly. */
export function reviewRequestMessage(input: { name: string | null; studioName: string; googleReviewLink: string | null; easyReviewLink: string | null }): LifecycleMessage {
  const links = [
    input.googleReviewLink ? `לחוות דעת בגוגל: ${input.googleReviewLink}` : null,
    input.easyReviewLink ? `ובאיזי: ${input.easyReviewLink}` : null,
  ].filter((line): line is string => line !== null)
  const lines = [
    `תודה רבה שבחרת ב${input.studioName}! 💫`,
    'נשמח אם תשתף/י אותנו בחוויה ותעזור/י לנו להגיע ללקוחות חדשים.',
    ...links,
    '',
    'תודה על הזמן והפרגון, מצפים לראות אותך שוב!',
  ]
  return {
    body: lines.join('\n'),
    templateName: 'review_request',
    templateComponents: bodyParams(greetingName(input.name), input.googleReviewLink ?? ''),
  }
}

/** At the end of a project, when the studio asks for a 1–10 score first. */
export function npsRequestMessage(input: { name: string | null; studioName: string }): LifecycleMessage {
  const name = input.name?.trim() ? ` ${input.name.trim()}` : ''
  return {
    body: [
      `היי${name}! העבודה שלנו יחד הסתיימה, תודה שבחרת ב${input.studioName} 💫`,
      '',
      'שאלה קצרה: בסולם 1 עד 10, כמה סביר שתמליץ/י עלינו לחבר/ה?',
      'אפשר פשוט לענות במספר.',
    ].join('\n'),
    templateName: 'nps_request',
    templateComponents: bodyParams(greetingName(input.name)),
  }
}

/** A few days after a consultation with nothing booked. */
export function consultationFollowupMessage(input: { name: string | null; artistName: string | null }): LifecycleMessage {
  const name = input.name?.trim() ? ` ${input.name.trim()}` : ''
  const artist = input.artistName?.trim() ? ` עם ${input.artistName.trim()}` : ''
  return {
    body: [`היי${name}! איך היה בפגישת הייעוץ${artist}? ✨`, 'אם תרצה/י, נשמח לקבוע את הקעקוע. אפשר פשוט לכתוב כאן ונמצא מועד.'].join('\n'),
    templateName: 'consultation_followup',
    templateComponents: bodyParams(greetingName(input.name)),
  }
}
