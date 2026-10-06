import type PocketBase from 'pocketbase'
import { DEPOSIT_NOTICE_HOURS } from '@/lib/cancellation-policy'
import { SYSTEM_AI_MODEL, SYSTEM_AI_MAX_TOKENS } from './model/defaults'

export interface StudioAgentRuntimeConfig {
  studio: {
    name: string
    timezone: string
    currency: string
  }
  healthDeclaration: {
    formUrl: string | null
    validityMonths: number
    validitySummaryHebrew: string
  }
  cancellation: {
    cutoffHours: number
    summaryHebrew: string
  }
  deposit: {
    required: boolean
    defaultAmount: number | null
    paymentInstructions: string | null
  }
  reviewLink: string | null
  ironRules: {
    customInstructions: string | null
  }
  aiEngine: {
    enabled: boolean
    maxTokens: number | null
    model: string
  }
}

export function formatValiditySummaryHebrew(validityMonths: number): string {
  if (validityMonths === 0) return 'תקף לתור הנוכחי בלבד (חובה לחדש בכל תור חדש)'
  if (validityMonths === 3) return 'תקף ל-3 חודשים מיום החתימה'
  if (validityMonths === 6) return 'תקף לחצי שנה (6 חודשים) מיום החתימה'
  if (validityMonths === 12) return 'תקף לשנה אחת מיום החתימה'
  if (validityMonths === -1) return 'ללא תפוגה (תקף לצמיתות לאחר חתימה ראשונה)'
  return `תקף ל-${validityMonths} חודשים מיום החתימה`
}

export function formatCancellationSummaryHebrew(cutoffHours: number): string {
  const cutoffText =
    cutoffHours === 0
      ? 'הלקוח יכול לבטל עצמאית מולך בכל עת.'
      : `הלקוח יכול לבטל עצמאית מולך עד ${cutoffHours} שעות לפני מועד התור. ביטול בהתראה קצרה מ-${cutoffHours} שעות אינו מאושר אוטומטית על ידך וחובה להעבירו להחלטת נציג אנושי (call_staff עם הסיבה 'cancel_request').`

  return [
    'מדיניות ביטולים והחזר מקדמות בסטודיו:',
    `1. לפי מדיניות הסטודיו, בביטול פחות משבוע (${DEPOSIT_NOTICE_HOURS} שעות) מראש המקדמה אינה מוחזרת. עם זאת, לעולם אל תקבע/י בעצמך מול הלקוח שהמקדמה חולטה או שלא תוחזר: ההחלטה על החזר היא של נציג הסטודיו, ואת/ה מודיע/ה ללקוח שנציג יחזור אליו בנושא.`,
    '2. בביטול מעל שבוע מראש — המקדמה ניתנת להעברה לתור הבא או החזר לפי הנחיית נציג.',
    `3. ${cutoffText}`,
  ].join('\n')
}

export async function getStudioAgentRuntimeConfig(
  su: PocketBase,
): Promise<StudioAgentRuntimeConfig> {
  const col = su.collection('settings')
  const list =
    typeof col?.getList === 'function'
      ? await col.getList(1, 1).catch(() => ({ items: [] }))
      : { items: [] }
  const record = list?.items?.[0]

  const rawCutoff = record?.cancellation_cutoff_hours
  const cutoffHours = typeof rawCutoff === 'number' ? rawCutoff : 48

  const rawValidity = record?.health_declaration_validity_months
  const validityMonths = typeof rawValidity === 'number' ? rawValidity : 6

  const rawDepositAmount = record?.deposit_amount
  const depositAmount = typeof rawDepositAmount === 'number' ? rawDepositAmount : null

  const rawInstructions = record?.ai_system_instructions as string | undefined
  const customInstructions = rawInstructions?.trim() ? rawInstructions.trim() : null

  return {
    studio: {
      name: (record?.studio_name as string)?.trim() || 'סטודיו לקעקועים',
      timezone: (record?.timezone as string)?.trim() || 'Asia/Jerusalem',
      currency: (record?.currency as string)?.trim() || 'ILS',
    },
    healthDeclaration: {
      formUrl: (record?.health_declaration_form_url as string)?.trim() || null,
      validityMonths,
      validitySummaryHebrew: formatValiditySummaryHebrew(validityMonths),
    },
    cancellation: {
      cutoffHours,
      summaryHebrew: formatCancellationSummaryHebrew(cutoffHours),
    },
    deposit: {
      required: Boolean(record?.deposit_required),
      defaultAmount: depositAmount,
      paymentInstructions: (record?.payment_instructions as string)?.trim() || null,
    },
    reviewLink: (record?.google_review_link as string)?.trim() || null,
    ironRules: {
      customInstructions,
    },
    aiEngine: {
      enabled: Boolean(record?.ai_enabled),
      maxTokens: SYSTEM_AI_MAX_TOKENS,
      model: (record?.ai_model as string)?.trim() || SYSTEM_AI_MODEL,
    },
  }
}

/**
 * Builds the top-level `<studio_operational_policies>` block with HIGHEST_OVERRIDE priority.
 * This guarantees the LLM strictly follows studio owner directives before any general rules.
 */
export function formatStudioPoliciesForPrompt(
  config: StudioAgentRuntimeConfig,
): string {
  const healthBlock = config.healthDeclaration.formUrl
    ? `- קישור רשמי ומחייב לטופס: ${config.healthDeclaration.formUrl}
- תוקף הצהרת בריאות: ${config.healthDeclaration.validitySummaryHebrew}.
- הנחיה מחייבת: בכל פעם שלקוח מבקש קישור, שואל על ההצהרה או היכן למלא — מסור אך ורק את הקישור המדויק הזה!`
    : `- קישור לטופס: טרם הוגדר קישור על ידי הסטודיו.
- איסור מוחלט להמציא קישור! מסור ללקוח בנעימות שהקישור יישלח אליו בהקדם על ידי הצוות.`

  const paymentBlock = config.deposit.paymentInstructions
    ? `- הוראות תשלום מקדמה רשמיות:
${config.deposit.paymentInstructions}`
    : `- הוראות תשלום מקדמה: טרם הוגדרו פרטי ביט/העברה בהגדרות (הסבר ללקוח שהצוות יעביר לו פרטי תשלום).`

  const depositRequiredLine = config.deposit.required
    ? `- חובת מקדמה: חובה לשלם מקדמה לשריון סופי של התור${config.deposit.defaultAmount ? ` (סכום ברירת מחדל: ₪${config.deposit.defaultAmount})` : ''}.`
    : `- חובת מקדמה: שריון תור אינו מחייב מקדמה מראש לפי מדיניות הסטודיו.`

  const reviewBlock = config.reviewLink
    ? `- קישור רשמי לכתיבת ביקורת ב-Google: ${config.reviewLink} (השתמש בקישור זה בעת סיום תור או שאלת לקוח).`
    : `- קישור לביקורת Google: לא הוגדר קישור.`

  return `<studio_operational_policies priority="HIGHEST_OVERRIDE">
ההגדרות והמדיניות להלן נקבעו ישירות על ידי הנהלת הסטודיו (${config.studio.name}) והן גוברות באופן מוחלט על כל הנחיה כללית, דוגמה או ברירת מחדל אחרת!
חל איסור מוחלט לפעול בניגוד לנתונים ולהגדרות הבאות:

1. שם הסטודיו: ${config.studio.name}
2. הצהרת בריאות דיגיטלית:
${healthBlock}
3. תשלום ומקדמות:
${paymentBlock}
${depositRequiredLine}
4. ביטולים ושינוי מועד:
${config.cancellation.summaryHebrew}
5. ביקורות ומשוב:
${reviewBlock}
</studio_operational_policies>`
}
