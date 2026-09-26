import { timingSafeEqual } from 'node:crypto'
import { statusChange } from '@/features/calendar/utils/appointment-transitions'
import { customerCancellationPolicyText } from '@/lib/cancellation-policy'
import type PocketBase from 'pocketbase'
import type { RecordModel } from 'pocketbase'
import { z } from 'zod'
import { getActiveAppointmentForBot } from '@/features/calendar/server/bot-appointments.server'
import { transition } from '@/features/conversations/server/state-machine'
import { addSystemNotification } from '@/features/notifications/server/notifications'
import { createWhatsAppClient, WhatsAppApiError } from '@/integrations/whatsapp-cloud-api/client'
import { getWhatsAppSettings } from '@/integrations/whatsapp-cloud-api/settings.server'
import { getStudioPolicyForBot } from '@/features/settings/server/policy'
import { cancelPendingBotTurn } from '@/integrations/ai/agent.server'
import { extractPhoneCandidates, toCanonicalE164Phone } from '@/lib/phone'
import { isSurveySourceQuestion, extractSourceFromSurveyAnswer } from '@/features/analytics/utils/attribution'
import type { CustomerSource } from '@/features/customers/types'

export { extractPhoneCandidates, toCanonicalE164Phone }

/** Validates shared secret from header in constant time. */
export function isValidHealthWebhookSecret(headerValue: string | null): boolean {
  const expected = process.env.HEALTH_DECLARATION_WEBHOOK_SECRET ?? ''
  if (!expected) return true
  if (!headerValue) return false
  const expectedBuf = Buffer.from(expected)
  const actualBuf = Buffer.from(headerValue)
  if (expectedBuf.length !== actualBuf.length) return false
  return timingSafeEqual(expectedBuf, actualBuf)
}

export {
  DEFAULT_HEALTH_DECLARATION_VALIDITY_MONTHS,
  HEALTH_DECLARATION_VALIDITY_DAYS,
  isHealthDeclarationValid,
} from '../utils/validity'

function extractField(
  record: Record<string, unknown>,
  keys: string[],
): { value: string; matchedKey: string | null } {
  for (const k of keys) {
    if (record[k] != null && String(record[k]).trim() !== '') {
      return { value: String(record[k]).trim(), matchedKey: k }
    }
  }
  for (const [key, val] of Object.entries(record)) {
    if (val == null || String(val).trim() === '') continue
    const lower = key.trim().toLowerCase()
    if (keys.some((k) => lower.includes(k.toLowerCase()))) {
      return { value: String(val).trim(), matchedKey: key }
    }
  }
  return { value: '', matchedKey: null }
}

function formatAnswer(val: unknown): string {
  if (val == null) return ''
  if (Array.isArray(val)) return val.map((item) => String(item).trim()).filter(Boolean).join(', ')
  if (typeof val === 'boolean') return val ? 'כן' : 'לא'
  return String(val).trim()
}

export interface NormalizedHealthPayload {
  name: string
  phone: string
  notes: string
  idNumber?: string
  birthDate?: string
  medicalConditions?: string
  medications?: string
  allergies?: string
  isPregnantOrNursing?: string
  alcoholOrDrugs24h?: string
  signature?: string
  termsAccepted: boolean
  ageConfirmed: boolean
  formUrl?: string
  submittedAt: string
  rawAnswers: Record<string, unknown>
}

const METADATA_KEYS = new Set([
  'timestamp',
  'form_response_id',
  'formResponseId',
  'form_url',
  'formUrl',
  'rawAnswers',
  'raw_answers',
  'termsAccepted',
  'terms_accepted',
  'ageConfirmed',
  'age_confirmed',
])

export function parseHealthSubmission(raw: unknown): NormalizedHealthPayload {
  const record: Record<string, unknown> =
    typeof raw === 'string'
      ? (() => {
          try {
            return JSON.parse(raw)
          } catch {
            return {}
          }
        })()
      : raw && typeof raw === 'object'
        ? (raw as Record<string, unknown>)
        : {}

  const nameMatch = extractField(record, ['שם מלא', 'name', 'שם', 'full_name'])
  const phoneMatch = extractField(record, ['מספר טלפון נייד', 'phone', 'טלפון', 'נייד'])

  const consumedKeys = new Set<string>()
  if (nameMatch.matchedKey) consumedKeys.add(nameMatch.matchedKey)
  if (phoneMatch.matchedKey) consumedKeys.add(phoneMatch.matchedKey)

  // Dynamically extract all other questions into formatted notes lines
  const notesLines: string[] = []
  for (const [key, val] of Object.entries(record)) {
    if (consumedKeys.has(key) || METADATA_KEYS.has(key)) continue
    const formatted = formatAnswer(val)
    if (formatted) {
      notesLines.push(`${key}: ${formatted}`)
    }
  }

  // Also support specific fields for backward compatibility
  const idNumber =
    extractField(record, ['תעודת זהות', 'ת.ז', 'ת"ז', 'idNumber', 'id_number']).value || undefined
  const birthDate =
    extractField(record, ['תאריך לידה', 'birthDate', 'birth_date', 'dob']).value || undefined
  const medicalConditions =
    extractField(record, [
      'האם אתה סובל מאחת מהבעיות הרפואיות הבאות?',
      'medicalConditions',
      'medical_conditions',
    ]).value || undefined
  const medications =
    extractField(record, [
      'האם אתה נוטל תדרויות באופן קבוע או מדללי דם?',
      'האם אתה נוטל תרופות באופן קבוע או מדללי דם?',
      'medications',
    ]).value || undefined
  const allergies = extractField(record, ['allergies', 'אלרגיות', 'רגישויות']).value || undefined
  const isPregnantOrNursing =
    extractField(record, ['האם את בהריון או תקופת הנקה?', 'isPregnantOrNursing', 'הריון', 'הנקה']).value || undefined
  const alcoholOrDrugs24h =
    extractField(record, ['האם השתמשת באלכוהול או בסמים ב-24 השעות האחרונות?', 'alcoholOrDrugs24h', 'אלכוהול', 'סמים']).value || undefined
  const signature =
    extractField(record, ['חתימה דיגיטלית או אישור הצהרה', 'signature', 'חתימה', 'אישור הצהרה']).value || undefined

  const ageConfirmed =
    record.ageConfirmed !== undefined
      ? Boolean(record.ageConfirmed)
      : record.age_confirmed !== undefined
        ? Boolean(record.age_confirmed)
        : true

  const termsAccepted =
    record.termsAccepted !== undefined
      ? Boolean(record.termsAccepted)
      : record.terms_accepted !== undefined
        ? Boolean(record.terms_accepted)
        : true

  const formUrl = extractField(record, ['formUrl', 'form_url']).value || undefined
  const submittedAt =
    extractField(record, ['submittedAt', 'submitted_at', 'timestamp']).value ||
    new Date().toISOString()

  const rawAnswersObj = ((record.rawAnswers || record.raw_answers || record) ?? {}) as Record<string, unknown>
  const keysOrder = Object.keys(record).filter(
    (k) => !METADATA_KEYS.has(k) && k !== '_order' && record[k] != null && String(record[k]).trim() !== '',
  )
  const rawAnswers: Record<string, unknown> = {
    ...rawAnswersObj,
    _order: Array.isArray(rawAnswersObj._order) ? rawAnswersObj._order : keysOrder,
  }

  return {
    name: nameMatch.value,
    phone: phoneMatch.value,
    notes: notesLines.join('\n'),
    idNumber,
    birthDate,
    medicalConditions,
    medications,
    allergies,
    isPregnantOrNursing,
    alcoholOrDrugs24h,
    signature,
    ageConfirmed,
    termsAccepted,
    formUrl,
    submittedAt,
    rawAnswers,
  }
}

export const healthDeclarationInputSchema: z.ZodType<NormalizedHealthPayload> = z.preprocess(
  (val: unknown) => {
    try {
      return parseHealthSubmission(val)
    } catch {
      return val
    }
  },
  z.object({
    name: z.string().min(1, 'Name is required'),
    phone: z.string().min(1, 'Phone is required'),
    notes: z.string().default(''),
    idNumber: z.string().optional(),
    birthDate: z.string().optional(),
    medicalConditions: z.string().optional(),
    medications: z.string().optional(),
    allergies: z.string().optional(),
    isPregnantOrNursing: z.string().optional(),
    alcoholOrDrugs24h: z.string().optional(),
    signature: z.string().optional(),
    ageConfirmed: z.boolean().default(true),
    termsAccepted: z.boolean().default(true),
    formUrl: z.string().optional(),
    submittedAt: z.string().default(() => new Date().toISOString()),
    rawAnswers: z.record(z.string(), z.unknown()).default({}),
  }),
)

/** Looks up customer across candidate phone formats, falling back to name. */
export async function findCustomer(
  su: PocketBase,
  phone: string,
  name?: string,
): Promise<RecordModel | null> {
  const candidates = extractPhoneCandidates(phone)
  for (const cand of candidates) {
    try {
      const cust = await su
        .collection('customers')
        .getFirstListItem(
          su.filter('phone = {:phone} || whatsapp_chat_id = {:phone}', { phone: cand }),
        )
      if (cust) return cust
    } catch {
      // Continue search
    }
  }

  if (name && name.trim().length >= 2) {
    try {
      const match = await su
        .collection('customers')
        .getFirstListItem(su.filter('name = {:name}', { name: name.trim() }))
      if (match) return match
    } catch {
      // Not found by name
    }
  }

  return null
}

export const findCustomerByPhone = (su: PocketBase, phone: string) => findCustomer(su, phone)
export const findCustomerByPhoneOrName = findCustomer

export interface ProcessHealthDeclarationResult {
  customer: RecordModel
  appointment: RecordModel | null
  conversation: RecordModel | null
  stateTransitioned: boolean
  messageDelivery: {
    channel: 'whatsapp' | 'none'
    type: 'free_text' | 'window_closed_alert' | 'whatsapp_unconfigured'
    success: boolean
    error?: string
  }
}

/**
 * Main service handler for processing digital health declarations:
 * 1. Identifies or creates customer by phone/name.
 * 2. Updates customer with medical notes and signed status.
 * 3. Updates active appointment if found.
 * 4. Advances state machine and sends WhatsApp ONLY if in AWAIT_HEALTH_NOTICE with active appointment.
 * 5. Issues staff system notifications.
 */
export async function processHealthDeclaration(
  su: PocketBase,
  payload: NormalizedHealthPayload,
): Promise<ProcessHealthDeclarationResult> {
  const canonicalPhone = toCanonicalE164Phone(payload.phone)

  // Construct notes dynamically from payload.notes (or legacy fallback)
  const customerNotes =
    payload.notes ||
    [
      payload.idNumber ? `ת.ז: ${payload.idNumber}` : '',
      payload.medicalConditions ? `מצב רפואי: ${payload.medicalConditions}` : '',
      payload.medications ? `תרופות: ${payload.medications}` : '',
      payload.allergies ? `אלרגיות: ${payload.allergies}` : '',
    ]
      .filter(Boolean)
      .join('\n')

  // Check if rawAnswers contains a source attribution question ("איך שמעת עלינו?")
  let surveySource: CustomerSource | null = null
  if (payload.rawAnswers && typeof payload.rawAnswers === 'object') {
    for (const [key, value] of Object.entries(payload.rawAnswers)) {
      if (isSurveySourceQuestion(key)) {
        const detected = extractSourceFromSurveyAnswer(value)
        if (detected !== 'unknown') {
          surveySource = detected
          break
        }
      }
    }
  }

  // 1. Find or create customer
  let customerRecord: RecordModel
  const existingCustomer = await findCustomer(su, payload.phone, payload.name)
  if (!existingCustomer) {
    customerRecord = await su.collection('customers').create({
      name: payload.name,
      phone: canonicalPhone,
      whatsapp_chat_id: canonicalPhone,
      source: surveySource || 'google_form',
      health_declaration_signed: true,
      health_declaration_date: payload.submittedAt,
      health_declaration_url: payload.formUrl || '',
      health_declaration_answers: payload.rawAnswers,
      allergies: payload.allergies || '',
      medical_notes: customerNotes,
    })
  } else {
    const combinedNotes = [existingCustomer.medical_notes as string | undefined, customerNotes]
      .filter(Boolean)
      .join('\n---\n')

    const updateFields: Record<string, unknown> = {
      health_declaration_signed: true,
      health_declaration_date: payload.submittedAt,
      health_declaration_url: payload.formUrl || (existingCustomer.health_declaration_url as string) || '',
      health_declaration_answers: payload.rawAnswers || existingCustomer.health_declaration_answers || {},
      allergies: payload.allergies || existingCustomer.allergies || '',
      medical_notes: combinedNotes,
    }

    if (
      surveySource &&
      (!existingCustomer.source ||
        existingCustomer.source === 'unknown' ||
        existingCustomer.source === 'whatsapp' ||
        existingCustomer.source === 'google_form')
    ) {
      updateFields.source = surveySource
    }

    customerRecord = await su.collection('customers').update(existingCustomer.id, updateFields)
  }

  // 2. Locate active or upcoming appointment (must not be cancelled)
  let appointment = await getActiveAppointmentForBot(su, customerRecord.id).catch(() => null)
  if (!appointment) {
    appointment = await su
      .collection('appointments')
      .getFirstListItem(
        su.filter('customer = {:cid} && status != "cancelled"', { cid: customerRecord.id }),
        { sort: '-start_time' },
      )
      .catch(() => null)
  }

  if (appointment) {
    appointment = await su.collection('appointments').update(appointment.id, {
      health_declaration_signed: true,
      health_declaration_date: payload.submittedAt,
      health_declaration_url: payload.formUrl || '',
      health_declaration_answers: payload.rawAnswers,
    })
  }

  // 3. Locate conversation
  const conversation = await su
    .collection('conversations')
    .getFirstListItem(su.filter('customer = {:cid}', { cid: customerRecord.id }))
    .catch(() => null)

  let stateTransitioned = false
  let deliveryResult: ProcessHealthDeclarationResult['messageDelivery'] = {
    channel: 'none',
    type: 'whatsapp_unconfigured',
    success: false,
  }

  // CRITICAL GUARD: Only advance state machine and send messages IF conversation is actively waiting for health notice AND has a valid appointment!
  const isAwaitingHealthNotice =
    conversation && conversation.state === 'AWAIT_HEALTH_NOTICE' && Boolean(appointment)

  if (isAwaitingHealthNotice && conversation && appointment) {
    const activeAppointment = appointment
    const isFreeSketch =
      activeAppointment.type === 'sketch' &&
      (activeAppointment.deposit_amount == null || Number(activeAppointment.deposit_amount) === 0)

    if (isFreeSketch) {
      appointment = await su.collection('appointments').update(activeAppointment.id, {
        ...statusChange('confirmed', 'system', 'health_declaration_free_sketch'),
        slot_confirmed: true,
      })
      await transition(su, conversation.id, 'AWAITING_APPOINTMENT', {
        actor: 'system',
        reason: 'google_form_health_declaration_submitted_free_sketch_confirmed',
      })
    } else {
      await transition(su, conversation.id, 'AWAIT_PAYMENT', {
        actor: 'system',
        reason: 'google_form_health_declaration_submitted',
        extraFields: {
          status: 'staff_handling',
        },
      })
    }
    stateTransitioned = true

    // 4. Send WhatsApp message (ONLY when in AWAIT_HEALTH_NOTICE)
    const windowExpiresAt = conversation.whatsapp_window_expires_at as string | undefined
    const isWindowOpen = Boolean(windowExpiresAt && new Date(windowExpiresAt).getTime() > Date.now())
    const settings = await getWhatsAppSettings()

    if (settings?.phoneNumberId && settings.accessToken) {
      cancelPendingBotTurn(conversation.id)

      if (isWindowOpen) {
        const client = createWhatsAppClient({
          phoneNumberId: settings.phoneNumberId,
          accessToken: settings.accessToken,
        })

        let textBody: string
        const locationLine = '📍 איפה: שוהם מרקט קומה מינוס אחת, יש חנייה בשפע במתחם INKMIND!'

        if (isFreeSketch) {
          textBody = [
            'איזה יופי, הצהרת הבריאות נקלטה בהצלחה! ✅',
            '',
            'פגישת הייעוץ מאושרת ביומן:',
            `🗓 מועד: ${activeAppointment.start_time ? activeAppointment.start_time.slice(0, 10) : ''}`,
            '⏱ משך משוער: כ-30 דקות',
            locationLine,
            '',
            'נשלח לך תזכורת מסודרת לפני המפגש. מחכים לראותך! ✨',
          ].filter(Boolean).join('\n')
        } else {
          const policy = await getStudioPolicyForBot(su).catch(() => ({
            paymentInstructions: null,
            cancellationCutoffHours: 48,
            depositAmount: 100,
          }))
          const depositAmount =
            activeAppointment.deposit_amount != null
              ? Number(activeAppointment.deposit_amount)
              : (policy.depositAmount ?? 100)
          const cancellationPolicyText = `📌 ${customerCancellationPolicyText(policy.cancellationCutoffHours ?? 48)}`

          textBody = [
            'איזה יופי, הצהרת הבריאות נקלטה בהצלחה! ✅',
            '',
            `נשאר לנו רק שריון סופי של התור באמצעות מקדמה על סך ₪${depositAmount}:`,
            locationLine,
            policy.paymentInstructions ? `\n📲 לתשלום (ביט / PayBox / העברה):\n${policy.paymentInstructions}` : '',
            `\n${cancellationPolicyText}`,
            '\nרק שולחים כאן צילום מסך של האסמכתה ונועלים את התור רשמית! 🙌',
          ]
            .filter(Boolean)
            .join('\n')
        }

        try {
          const { wamid } = await client.sendText({
            to: customerRecord.phone as string,
            body: textBody,
          })

          await su.collection('messages').create({
            conversation: conversation.id,
            whatsapp_message_id: wamid,
            direction: 'outbound',
            sender_type: 'bot',
            type: 'text',
            body: textBody,
            status: 'sent',
            timestamp: new Date().toISOString(),
            seen: true,
          })

          await su.collection('conversations').update(conversation.id, {
            last_message_at: new Date().toISOString(),
          })

          deliveryResult = { channel: 'whatsapp', type: 'free_text', success: true }
        } catch (err) {
          deliveryResult = {
            channel: 'whatsapp',
            type: 'free_text',
            success: false,
            error: err instanceof WhatsAppApiError ? err.message : String(err),
          }
        }
      } else {
        // 24h Window is closed: avoid error 131047 and alert staff in CRM
        await addSystemNotification({
          title: 'הצהרת בריאות נקלטה (חלון 24 שעות סגור)',
          message: `הצהרת בריאות מולאה על ידי ${payload.name}, אך חלון 24 השעות סגור. באפשרותך לפנות בוואטסאפ ווב.`,
          type: 'warning',
          link: `/dashboard/conversations?chatId=${conversation.id}`,
        }).catch(() => null)

        deliveryResult = { channel: 'whatsapp', type: 'window_closed_alert', success: true }
      }
    }

    // Staff success notification
    await addSystemNotification({
      title: 'הצהרת בריאות מולאה',
      message: `הצהרת בריאות נקלטה בהצלחה עבור ${payload.name}.`,
      type: 'success',
      link: appointment ? `/dashboard/calendar` : `/dashboard/customers`,
    }).catch(() => null)
  } else {
    // Conversation is NOT in AWAIT_HEALTH_NOTICE (or no active appointment)
    // ZERO messages sent to customer. Inform staff via CRM notification only.
    await addSystemNotification({
      title: 'הצהרת בריאות נקלטה (ללא שינוי סטטוס)',
      message: `הצהרת בריאות מולאה על ידי ${payload.name}, אך השיחה אינה ממתינה להצהרה (${conversation?.state || 'ללא שיחה'}). לא נשלחה הודעה ללקוח.`,
      type: 'info',
      link: appointment ? `/dashboard/calendar` : `/dashboard/customers`,
    }).catch(() => null)
  }

  return {
    customer: customerRecord,
    appointment,
    conversation,
    stateTransitioned,
    messageDelivery: deliveryResult,
  }
}
