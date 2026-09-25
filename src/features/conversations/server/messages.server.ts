import type PocketBase from 'pocketbase'
import { statusChange } from '@/features/calendar/utils/appointment-transitions'
import { customerCancellationPolicyText } from '@/lib/cancellation-policy'
import type { RecordModel } from 'pocketbase'
import { getSuperuserClient } from '@/integrations/pocketbase/superuser.server'
import { getSession } from '@/lib/session.server'
import { getActiveAppointmentForBot } from '@/features/calendar/server/bot-appointments.server'
import { toYmd, minutesToTime } from '@/lib/date-utils'
import { transition } from './state-machine'
import { runBotTurn, cancelPendingBotTurn } from '@/integrations/ai/agent.server'
import { getStudioPolicyForBot } from '@/features/settings/server/policy'
import { isHealthDeclarationValid } from '@/features/health-declaration/server/health-service'
import { createWhatsAppClient } from '@/integrations/whatsapp-cloud-api/client'
import { getWhatsAppSettings } from './webhook'
import type { UIAppointmentSummary } from '@/features/conversations/types'
import { stampStaffInstruction } from '@/integrations/ai/engine/staff-instruction'

async function requireSession() {
  const session = await getSession()
  if (!session) throw new Error('לא מחובר.')
  return session
}

export async function handleGetActiveAppointmentSummary(
  data: { conversationId: string },
  suClient?: PocketBase,
): Promise<UIAppointmentSummary | null> {
  const su = (suClient ?? (await getSuperuserClient())) as unknown as PocketBase
  const [conversation, policy] = await Promise.all([
    su.collection('conversations').getOne(data.conversationId),
    getStudioPolicyForBot(su),
  ])
  const appointment = await getActiveAppointmentForBot(su, conversation.customer as string)
  if (!appointment) {
    if (conversation.customer && conversation.state === 'WANTS_TO_BOOK') {
      const recentSketch = await su
        .collection('appointments')
        .getFirstListItem(
          `customer = "${conversation.customer}" && type = "sketch" && status = "completed"`,
          { sort: '-updated' },
        )
        .catch(() => null)
      if (recentSketch) {
        const staffRecord = recentSketch.staff
          ? await su.collection('staff').getOne(recentSketch.staff as string).catch(() => null)
          : null
        const start = new Date(recentSketch.start_time as string)
        return {
          id: recentSketch.id,
          status: 'completed',
          type: 'sketch',
          tattooDescription: (recentSketch.tattoo_description as string) || '',
          staffName: (staffRecord?.name as string) || null,
          date: toYmd(start),
          timeSlot: minutesToTime(start.getHours() * 60 + start.getMinutes()),
          durationMinutes: Number(recentSketch.duration_minutes) || 45,
          priceMinIls: null,
          priceMaxIls: null,
          depositAmount:
            recentSketch.deposit_amount !== '' && recentSketch.deposit_amount != null
              ? Number(recentSketch.deposit_amount)
              : null,
          depositPaid: Boolean(recentSketch.deposit_paid),
          slotConfirmed: true,
          paymentReceiptUrl: (recentSketch.payment_receipt_url as string) || null,
          referenceImages: Array.isArray(recentSketch.reference_images) ? (recentSketch.reference_images as string[]) : [],
          createdAt: (recentSketch.created as string) || null,
        }
      }
    }
    return null
  }

  const staffRecord = appointment.staff
    ? await su.collection('staff').getOne(appointment.staff as string).catch(() => null)
    : null
  const start = new Date(appointment.start_time as string)
  const isSketchAppointment =
    appointment.type === 'sketch' ||
    (!appointment.type && Number(appointment.duration_minutes) <= 45)

  const customerRecord = conversation.customer
    ? await su.collection('customers').getOne(conversation.customer as string).catch(() => null)
    : null

  return {
    id: appointment.id,
    status: (appointment.status as string) || 'pending',
    type: isSketchAppointment ? 'sketch' : ((appointment.type as 'tattoo' | 'sketch') || 'tattoo'),
    tattooDescription: (appointment.tattoo_description as string) || '',
    staffName: (staffRecord?.name as string) || null,
    date: toYmd(start),
    timeSlot: minutesToTime(start.getHours() * 60 + start.getMinutes()),
    durationMinutes: Number(appointment.duration_minutes) || (isSketchAppointment ? 30 : 120),
    priceMinIls: appointment.price_min !== '' && appointment.price_min != null ? Number(appointment.price_min) : null,
    priceMaxIls: appointment.price_max !== '' && appointment.price_max != null ? Number(appointment.price_max) : null,
    depositAmount: appointment.deposit_amount !== '' && appointment.deposit_amount != null ? Number(appointment.deposit_amount) : null,
    depositPaid: Boolean(appointment.deposit_paid),
    slotConfirmed: Boolean(appointment.slot_confirmed),
    healthDeclarationSigned: Boolean(
      appointment.health_declaration_signed ||
      (customerRecord?.health_declaration_signed && isHealthDeclarationValid(customerRecord.health_declaration_date as string, policy.healthDeclarationValidityMonths))
    ),
    healthDeclarationDate:
      (appointment.health_declaration_date as string) ||
      (customerRecord?.health_declaration_date as string) ||
      null,
    healthDeclarationFileUrl:
      (appointment.health_declaration_file_url as string) ||
      (customerRecord?.health_declaration_url as string) ||
      null,
    medicalNotes: (customerRecord?.medical_notes as string) || null,
    healthDeclarationAnswers:
      (appointment.health_declaration_answers as Record<string, string | number | boolean | null | string[]>) ||
      (customerRecord?.health_declaration_answers as Record<string, string | number | boolean | null | string[]>) ||
      null,
    allergies: (customerRecord?.allergies as string) || null,
    paymentReceiptUrl: (appointment.payment_receipt_url as string) || null,
    referenceImages: Array.isArray(appointment.reference_images) ? (appointment.reference_images as string[]) : [],
    createdAt: (appointment.created as string) || null,
  }
}

export async function handleResumeBotWithInstruction(data: {
  conversationId: string
  instruction?: string
  triggerTurn?: boolean
  suClient?: PocketBase
}) {
  const session = await requireSession()
  const su = (data.suClient ?? (await getSuperuserClient())) as unknown as PocketBase

  const conversation = await su
    .collection('conversations')
    .getOne(data.conversationId, { expand: 'customer' })
  const customer = conversation.expand?.customer as RecordModel | undefined
  if (!customer?.id) throw new Error('לשיחה אין לקוח תקין.')

  const windowExpiresAt = conversation.whatsapp_window_expires_at as string | undefined
  const isExpired = windowExpiresAt && new Date(windowExpiresAt).getTime() < Date.now()

  if (data.triggerTurn && isExpired) {
    throw new Error(
      'חלון 24 השעות של וואטסאפ נסגר — אי אפשר לשלוח מענה יזום של הבוט עד שהלקוח ישלח הודעה חדשה.',
    )
  }

  const nowIso = new Date().toISOString()
  const instructionText = data.instruction?.trim()

  if (instructionText) {
    const stampedInstruction = stampStaffInstruction(instructionText)
    await su.collection('messages').create({
      conversation: conversation.id,
      whatsapp_message_id: `internal_staff_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`,
      direction: 'outbound',
      sender_type: 'staff',
      sender_staff: session.staff.id,
      type: 'text',
      body: stampedInstruction,
      status: 'sent',
      timestamp: nowIso,
      seen: true,
    })
  }

  await su.collection('conversations').update(data.conversationId, {
    status: 'bot_active',
    is_staff_called: false,
    staff_call_reason: '',
    ...(instructionText ? { last_message_at: nowIso } : {}),
  })

  if (data.triggerTurn) {
    runBotTurn({
      su: su as unknown as PocketBase,
      conversationId: conversation.id,
      customerId: customer.id,
      force: true,
    }).catch((err) => console.error('[Agent] runBotTurn on resume failed:', err))
  }

  return { ok: true }
}

export async function handleStaffConfirmHealthDeclaration(
  data: { conversationId: string },
  suClient?: PocketBase,
) {
  cancelPendingBotTurn(data.conversationId)
  const su = (suClient ?? (await getSuperuserClient())) as unknown as PocketBase

  const conversation = await su.collection('conversations').getOne(data.conversationId, { expand: 'customer' })
  const customer = conversation.expand?.customer as RecordModel | undefined
  if (!customer?.id || !customer.phone) throw new Error('לשיחה אין לקוח תקין.')

  const nowIso = new Date().toISOString()

  // 1. Update customer
  await su.collection('customers').update(customer.id, {
    health_declaration_signed: true,
    health_declaration_date: nowIso,
  })

  // 2. Update active appointment if exists
  const appointment = await getActiveAppointmentForBot(su, customer.id).catch(() => null)
  if (appointment) {
    await su.collection('appointments').update(appointment.id, {
      health_declaration_signed: true,
      health_declaration_date: nowIso,
    }).catch(() => null)
  }

  const isSketch =
    appointment?.type === 'sketch' ||
    /סקיצה|ייעוץ/i.test((appointment?.tattoo_description as string) || '') ||
    Number(appointment?.duration_minutes) === 45
  const hasDeposit = appointment?.deposit_amount != null && Number(appointment.deposit_amount) > 0
  const isFreeSketch = isSketch && !hasDeposit

  const settings = await getWhatsAppSettings()
  const policy = await getStudioPolicyForBot(su).catch(() => ({
    paymentInstructions: null,
    cancellationCutoffHours: 48,
    depositRequired: true,
    depositAmount: 100,
    healthDeclarationFormUrl: null,
  }))

  const cancellationPolicyText = customerCancellationPolicyText(policy.cancellationCutoffHours ?? 48)

  let messageBody: string
  let targetState: 'AWAIT_PAYMENT' | 'AWAITING_APPOINTMENT'
  let reason: string

  const locationLine = '📍 איפה: שוהם מרקט קומה מינוס אחת, יש חנייה בשפע במתחם INKMIND!'

  if (isFreeSketch) {
    messageBody = [
      'הצהרת הבריאות אושרה במערכת הסטודיו. פגישת הסקיצה מאושרת וסגורה ביומן! ✨',
      locationLine,
      'מחכים לראותך בסטודיו.',
    ].join('\n')
    targetState = 'AWAITING_APPOINTMENT'
    reason = 'staffConfirmHealthDeclaration_free_sketch'
    if (appointment) {
      await su.collection('appointments').update(appointment.id, {
        ...statusChange('confirmed', 'staff', 'staff_confirmed_health_declaration_free_sketch'),
        slot_confirmed: true,
      }).catch(() => null)
    }
  } else {
    const depositAmount = appointment?.deposit_amount != null ? Number(appointment.deposit_amount) : (policy.depositAmount ?? 100)
    messageBody = [
      'איזה יופי, הצהרת הבריאות אושרה בהצלחה! ✅',
      '',
      `לשריון סופי של התור יש להעביר מקדמה בסך ₪${depositAmount}:`,
      locationLine,
      policy.paymentInstructions ? `\n📲 לתשלום (ביט / PayBox / העברה):\n${policy.paymentInstructions}` : '',
      `\n${cancellationPolicyText}`,
      '\nלאחר ההעברה יש לשלוח כאן צילום מסך של האסמכתה ונועלים את התור!',
    ].filter(Boolean).join('\n')
    targetState = 'AWAIT_PAYMENT'
    reason = 'staffConfirmHealthDeclaration_await_payment'
  }

  if (settings?.phoneNumberId && settings.accessToken) {
    const client = createWhatsAppClient({
      phoneNumberId: settings.phoneNumberId,
      accessToken: settings.accessToken,
    })
    try {
      const { wamid } = await client.sendText({ to: customer.phone as string, body: messageBody })
      await su.collection('messages').create({
        conversation: conversation.id,
        whatsapp_message_id: wamid,
        direction: 'outbound',
        sender_type: 'ai_bot',
        type: 'text',
        body: messageBody,
        status: 'sent',
        timestamp: nowIso,
        seen: true,
      })
    } catch (err) {
      console.warn('[staffConfirmHealthDeclaration] failed to send WhatsApp message:', err)
    }
  }

  await transition(su, conversation.id, targetState, {
    actor: 'staff',
    reason,
    extraFields: {
      last_message_at: nowIso,
      status: targetState === 'AWAIT_PAYMENT' ? 'staff_handling' : 'bot_active',
      is_staff_called: false,
      staff_call_reason: '',
    },
  })

  return { ok: true, success: true }
}

export async function handleResendHealthDeclarationLink(
  data: { conversationId: string },
  suClient?: PocketBase,
) {
  cancelPendingBotTurn(data.conversationId)
  const su = (suClient ?? (await getSuperuserClient())) as unknown as PocketBase

  const conversation = await su.collection('conversations').getOne(data.conversationId, { expand: 'customer' })
  const customer = conversation.expand?.customer as RecordModel | undefined
  if (!customer?.phone) throw new Error('לשיחה אין לקוח תקין.')

  const policy = await getStudioPolicyForBot(su).catch(() => ({
    healthDeclarationFormUrl: null,
  }))
  const healthFormUrl = policy.healthDeclarationFormUrl?.trim() || process.env.HEALTH_DECLARATION_URL?.trim() || ''
  if (!healthFormUrl) {
    throw new Error('טרם הוגדר קישור לטופס הצהרת בריאות בהגדרות הסטודיו (הגדרות מדיניות ותפעול).')
  }
  const messageBody = [
    'היי! תזכורת למילוי הצהרת הבריאות לקראת התור: 📝',
    '',
    'קישור למילוי קצר בדיגיטל:',
    healthFormUrl,
    '',
    'לאחר המילוי נוכל להעביר פרטי תשלום ולנעול את התור ביומן!',
  ].filter(Boolean).join('\n')

  const settings = await getWhatsAppSettings()
  if (settings?.phoneNumberId && settings.accessToken) {
    const client = createWhatsAppClient({
      phoneNumberId: settings.phoneNumberId,
      accessToken: settings.accessToken,
    })
    const nowIso = new Date().toISOString()
    try {
      const { wamid } = await client.sendText({ to: customer.phone as string, body: messageBody })
      await su.collection('messages').create({
        conversation: conversation.id,
        whatsapp_message_id: wamid,
        direction: 'outbound',
        sender_type: 'ai_bot',
        type: 'text',
        body: messageBody,
        status: 'sent',
        timestamp: nowIso,
        seen: true,
      })
    } catch (err) {
      console.warn('[resendHealthDeclarationLink] failed to send WhatsApp message:', err)
    }
  }

  return { ok: true, success: true }
}

