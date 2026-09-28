import { createServerFn } from '@tanstack/react-start'
import { statusChange } from '@/features/calendar/utils/appointment-transitions'
import { z } from 'zod'
import { getSuperuserClient } from '@/integrations/pocketbase/superuser.server'
import { getSession } from '@/lib/session.server'
import {
  ERROR_REENGAGEMENT_REQUIRED,
  WhatsAppApiError,
  createWhatsAppClient
  
} from '@/integrations/whatsapp-cloud-api/client'
import type {TemplateComponent} from '@/integrations/whatsapp-cloud-api/client';
import { getWhatsAppSettings } from './webhook'
import type { UIMetaTemplate } from '@/integrations/whatsapp-cloud-api/types'
import type { RecordModel } from 'pocketbase'
import type {
  UIAppointmentSummary,
  UIConversation,
  UIMessage,
  WhatsAppConnectionStatus,
} from '@/features/conversations/types'
import { getActiveAppointmentForBot, cancelAppointmentForBot } from '@/features/calendar/server/bot-appointments.server'
import { toYmd, minutesToTime, formatDurationHebrew } from '@/lib/date-utils'
import { toCanonicalE164Phone, formatPhoneForDisplay } from '@/lib/phone'
import { createStaleReferenceError } from '@/lib/stale-reference'
import type { CustomerSource } from '@/features/customers/types'
import { shouldExcludeTemplate } from '../utils/templates'
import { stateAttribution, transition } from './state-machine'
import { cancelPendingBotTurn } from '@/integrations/ai/agent.server'
import {
  handleGetActiveAppointmentSummary,
  handleResumeBotWithInstruction,
  handleStaffConfirmHealthDeclaration,
  handleResendHealthDeclarationLink,
} from './messages.server'

const MESSAGE_PAGE_SIZE = 50

async function requireSession() {
  const session = await getSession()
  if (!session) throw new Error('לא מחובר.')
  return session
}


function toUIConversation(record: RecordModel): UIConversation {
  const customer = record.expand?.customer as RecordModel | undefined
  return {
    id: record.id,
    customerName: (customer?.name as string) || '',
    customerPhone: (customer?.phone as string) || '',
    customerSource: (customer?.source as CustomerSource) || null,
    status: (record.status as string) || 'staff_handling',
    state: (record.state as string) || 'NEW',
    staffCallReason: (record.staff_call_reason as string) || null,
    lastMessageAt: (record.last_message_at as string) || null,
    lastMessagePreview: (record.last_message_preview as string) || '',
    lastMessageSender: (record.last_message_sender as UIConversation['lastMessageSender']) || null,
    windowExpiresAt: (record.whatsapp_window_expires_at as string) || null,
    unreadCount: 0,
    botTurnPhase: (record.bot_turn_phase as UIConversation['botTurnPhase']) || '',
  }
}

function toUIMessage(record: RecordModel): UIMessage {
  return {
    id: record.id,
    direction: record.direction as UIMessage['direction'],
    senderType: record.sender_type as UIMessage['senderType'],
    type: record.type as UIMessage['type'],
    body: (record.body as string) || '',
    mediaFilename: (record.media as string) || null,
    status: (record.status as UIMessage['status']) || null,
    timestamp: (record.timestamp as string) || record.created,
    replyToWamid: (record.reply_to_wamid as string) || null,
    errorDetail: (record.error_detail as string) || null,
    seen: Boolean(record.seen),
    mediaCategory: (record.media_category as UIMessage['mediaCategory']) || null,
    whatsappMessageId: (record.whatsapp_message_id as string) || null,
  }
}

export const getWhatsAppConnectionStatus = createServerFn({ method: 'GET' }).handler(
  async (): Promise<WhatsAppConnectionStatus> => {
    await requireSession()
    const settings = await getWhatsAppSettings()
    return { configured: Boolean(settings?.phoneNumberId && settings.accessToken) }
  },
)

export const listConversations = createServerFn({ method: 'GET' }).handler(
  async (): Promise<UIConversation[]> => {
    await requireSession()
    const su = await getSuperuserClient()

    const records = await su.collection('conversations').getFullList({
      sort: '-last_message_at',
      expand: 'customer',
    })
    
    // Fetch all unseen inbound messages to count per conversation
    const unseenList = await su.collection('messages').getFullList({
      filter: 'seen != true && direction = "inbound"',
      fields: 'id,conversation',
    })
    
    const unseenMap = unseenList.reduce((acc, msg) => {
      const convId = msg.conversation as string
      acc[convId] = (acc[convId] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    return records.map((record) => {
      const ui = toUIConversation(record)
      ui.unreadCount = unseenMap[record.id] || 0
      return ui
    })
  },
)

export const listMessages = createServerFn({ method: 'GET' })
  .validator(
    z.object({
      conversationId: z.string(),
      limit: z.number().int().min(MESSAGE_PAGE_SIZE).max(1000).default(MESSAGE_PAGE_SIZE),
    }),
  )
  .handler(async ({ data }): Promise<{ messages: UIMessage[]; hasMore: boolean }> => {
    await requireSession()
    const su = await getSuperuserClient()

    // Keep the newest `limit` messages ("load older" grows the window). Fetch newest-first,
    // then reverse to chronological order for display. Simple and poll-friendly — the
    // whole visible window is one query, so refetchInterval just re-pulls it.
    const result = await su.collection('messages').getList(1, data.limit, {
      filter: `conversation = "${data.conversationId}"`,
      sort: '-timestamp',
    })
    const messages = result.items.map(toUIMessage).reverse()
    return { messages, hasMore: result.totalItems > data.limit }
  })

export const sendMessage = createServerFn({ method: 'POST' })
  .validator(
    z.object({
      conversationId: z.string(),
      body: z.string().max(4096).optional().default(''),
      replyToWamid: z.string().nullable().optional(),
      mediaData: z
        .object({
          base64: z.string(),
          filename: z.string(),
          mimeType: z.string(),
        })
        .nullable()
        .optional(),
    }),
  )
  .handler(async ({ data }): Promise<UIMessage> => {
    const session = await requireSession()
    cancelPendingBotTurn(data.conversationId)
    const su = await getSuperuserClient()

    const conversation = await su
      .collection('conversations')
      .getOne(data.conversationId, { expand: 'customer' })
    const customer = conversation.expand?.customer as RecordModel | undefined
    if (!customer?.phone) throw new Error('לשיחה אין מספר טלפון תקין.')

    const settings = await getWhatsAppSettings()
    if (!settings?.phoneNumberId || !settings.accessToken) {
      throw new Error('וואטסאפ אינו מוגדר. יש להזין פרטי חיבור בהגדרות.')
    }

    const client = createWhatsAppClient({
      phoneNumberId: settings.phoneNumberId,
      accessToken: settings.accessToken,
    })

    let wamid: string
    let messageType: UIMessage['type'] = 'text'

    try {
      if (data.mediaData) {
        // Upload media to Meta
        const rawBuffer = Buffer.from(data.mediaData.base64, 'base64')
        const blob = new Blob([rawBuffer], { type: data.mediaData.mimeType })
        const { mediaId } = await client.uploadMedia(blob, data.mediaData.mimeType)

        // Determine message type
        const mime = data.mediaData.mimeType.toLowerCase()
        if (mime.startsWith('image/')) {
          messageType = 'image'
        } else if (mime.startsWith('audio/')) {
          messageType = 'audio'
        } else if (mime.startsWith('video/')) {
          messageType = 'video'
        } else {
          messageType = 'document'
        }

        const result = await client.sendMedia({
          to: customer.phone as string,
          type: messageType,
          mediaId,
          caption: data.body || undefined,
          filename: data.mediaData.filename,
          replyToWamid: data.replyToWamid ?? undefined,
        })
        wamid = result.wamid
      } else {
        if (!data.body.trim()) throw new Error('גוף ההודעה ריק.')
        const result = await client.sendText({
          to: customer.phone as string,
          body: data.body,
          replyToWamid: data.replyToWamid ?? undefined,
        })
        wamid = result.wamid
      }
    } catch (err) {
      if (err instanceof WhatsAppApiError && err.code === ERROR_REENGAGEMENT_REQUIRED) {
        throw new Error('החלון של 24 שעות פג — יש לחכות להודעה חדשה מהלקוח לפני שליחת הודעה חופשית.')
      }
      throw new Error(
        err instanceof WhatsAppApiError ? `שליחת ההודעה נכשלה: ${err.message}` : 'שליחת ההודעה נכשלה.',
      )
    }

    const nowIso = new Date().toISOString()
    const createData = new FormData()
    createData.append('conversation', conversation.id)
    createData.append('whatsapp_message_id', wamid)
    createData.append('direction', 'outbound')
    createData.append('sender_type', 'staff')
    createData.append('sender_staff', session.staff.id)
    createData.append('type', messageType)
    createData.append('body', data.body || '')
    createData.append('status', 'sent')
    createData.append('timestamp', nowIso)
    createData.append('seen', 'true')
    if (data.replyToWamid) {
      createData.append('reply_to_wamid', data.replyToWamid)
    }

    if (data.mediaData) {
      const rawBuffer = Buffer.from(data.mediaData.base64, 'base64')
      const fileBlob = new Blob([rawBuffer], { type: data.mediaData.mimeType })
      createData.append('media', fileBlob, data.mediaData.filename)
    }

    const record = await su.collection('messages').create(createData)

    await su.collection('conversations').update(conversation.id, {
      last_message_at: nowIso,
      status: 'staff_handling',
    })

    return toUIMessage(record)
  })

/** The full payload behind the one-click HITL actions: what appointment is actually
 *  being priced/approved. Rendered on the inline pricing card and above the
 *  deposit-confirmation button, so staff never approves blind (HITL-2/3). */
export const getActiveAppointmentSummary = createServerFn({ method: 'GET' })
  .validator(z.object({ conversationId: z.string() }))
  .handler(async ({ data }): Promise<UIAppointmentSummary | null> => {
    await requireSession()
    return handleGetActiveAppointmentSummary(data)
  })

/** Explicit staff takeover (HITL-6): silences the bot without sending a message.
 *  Until now the only way to stop a derailing bot was to send some message (sendMessage
 *  flips status as a side effect) or wait for the bot to escalate itself. */
export const takeOverConversation = createServerFn({ method: 'POST' })
  .validator(z.object({ conversationId: z.string() }))
  .handler(async ({ data }) => {
    await requireSession()
    cancelPendingBotTurn(data.conversationId)
    const su = await getSuperuserClient()
    await su.collection('conversations').update(data.conversationId, {
      status: 'staff_handling',
    })
    return { ok: true }
  })

export const cancelBotTurnForConversation = createServerFn({ method: 'POST' })
  .validator(z.object({ conversationId: z.string() }))
  .handler(async ({ data }) => {
    await requireSession()
    cancelPendingBotTurn(data.conversationId)
    return { ok: true }
  })

export const resumeBotWithInstruction = createServerFn({ method: 'POST' })
  .validator(
    z.object({
      conversationId: z.string(),
      instruction: z.string().optional().default(''),
      triggerTurn: z.boolean().optional().default(true),
    }),
  )
  .handler(async ({ data }) => {
    return handleResumeBotWithInstruction(data)
  })

export const resumeBotForConversation = createServerFn({ method: 'POST' })
  .validator(z.object({ conversationId: z.string() }))
  .handler(async ({ data }) => {
    return handleResumeBotWithInstruction({
      conversationId: data.conversationId,
      instruction: '',
      triggerTurn: true,
    })
  })

/** Staff confirms they've personally verified the customer's payment screenshot — the one
 *  judgment call this flow never delegates to the model. Marks the deposit received, then sends
 *  a deterministic (not LLM-composed) message asking the customer for one last confirmation of
 *  the exact booking details before it locks in, and hands the conversation back to the bot in
 *  AWAIT_FINAL_CONFIRMATION — the `confirm_booking_final` tool is the only thing that can flip
 *  the appointment to `confirmed` from there, once the customer replies yes. */
export const confirmDepositReceived = createServerFn({ method: 'POST' })
  .validator(z.object({ conversationId: z.string() }))
  .handler(async ({ data }) => {
    await requireSession()
    cancelPendingBotTurn(data.conversationId)
    const su = await getSuperuserClient()

    const conversation = await su.collection('conversations').getOne(data.conversationId, { expand: 'customer' })
    const customer = conversation.expand?.customer as RecordModel | undefined
    if (!customer?.phone) throw new Error('לשיחה אין לקוח עם מספר טלפון תקין.')

    // 24h-window gate (HITL-4): fail with a clear Hebrew explanation instead of the
    // raw Graph 131047 the send below would produce.
    const windowExpiresAt = conversation.whatsapp_window_expires_at as string | undefined
    if (windowExpiresAt && new Date(windowExpiresAt).getTime() < Date.now()) {
      throw new Error('חלון 24 השעות של וואטסאפ נסגר — אי אפשר לשלוח את הודעת הסיכום עד שהלקוח יכתוב שוב. אפשר להתקשר אליו או להמתין להודעה ממנו.')
    }

    const appointment = await getActiveAppointmentForBot(su, customer.id)
    if (!appointment) throw new Error('לא נמצא תור פעיל ללקוח הזה לאישור תשלום.')

    await su.collection('appointments').update(appointment.id, { deposit_paid: true })

    const settings = await getWhatsAppSettings()
    if (!settings?.phoneNumberId || !settings.accessToken) {
      throw new Error('וואטסאפ אינו מוגדר. יש להזין פרטי חיבור בהגדרות.')
    }

    const client = createWhatsAppClient({
      phoneNumberId: settings.phoneNumberId,
      accessToken: settings.accessToken,
    })

    const staffRecord = appointment.staff
      ? await su.collection('staff').getOne(appointment.staff as string).catch(() => null)
      : null
    const start = new Date(appointment.start_time as string)
    const dateStr = toYmd(start)
    const timeStr = minutesToTime(start.getHours() * 60 + start.getMinutes())

    const isSketch =
      appointment.type === 'sketch' ||
      (!appointment.type && Number(appointment.duration_minutes) <= 45)

    const durationMins = Number(appointment.duration_minutes) || (isSketch ? 30 : 120)
    const durationText = formatDurationHebrew(durationMins)
    const locationLine = '📍 איפה: שוהם מרקט קומה מינוס אחת, יש חנייה בשפע במתחם INKMIND!'

    let messageBody: string
    if (isSketch) {
      messageBody = [
        'איזה כיף, המקדמה לפגישת הסקיצה נקלטה בהצלחה! 💳✨',
        '',
        'הנה סיכום הפרטים לאישור סופי שלך:',
        `🗓 מועד: ${dateStr} בשעה ${timeStr}${staffRecord ? ` עם ${staffRecord.name}` : ''}`,
        `⏱ משך משוער: ${durationText}`,
        `💳 מקדמה ששולמה: ₪${appointment.deposit_amount} (תקוזז מעלות הקעקוע)`,
        locationLine,
        '',
        'הפרטים נכונים לסגירת המועד?',
      ].filter(Boolean).join('\n')
    } else {
      const priceMin = appointment.price_min
      const priceMax = appointment.price_max
      const priceLabel = priceMin === priceMax ? `₪${priceMax}` : `₪${priceMin}–${priceMax}`
      messageBody = [
        'איזה כיף, המקדמה נקלטה בהצלחה! 💳✨',
        '',
        'הנה סיכום הפרטים לאישור סופי שלך:',
        `🗓 מועד: ${dateStr} בשעה ${timeStr}${staffRecord ? ` עם ${staffRecord.name as string}` : ''}`,
        `⏱ משך משוער: ${durationText}`,
        `💰 מחיר: ${priceLabel} (שולמה מקדמה ע״ס ₪${appointment.deposit_amount})`,
        locationLine,
        '',
        'הפרטים נכונים לסגירת התור?',
      ].filter((line) => line !== null).join('\n')
    }

    let wamid: string
    try {
      ;({ wamid } = await client.sendText({ to: customer.phone as string, body: messageBody }))
    } catch (err) {
      if (err instanceof WhatsAppApiError && err.code === ERROR_REENGAGEMENT_REQUIRED) {
        throw new Error('החלון של 24 שעות פג — יש לחכות להודעה חדשה מהלקוח לפני שליחת הודעת הסיכום.')
      }
      throw new Error(err instanceof WhatsAppApiError ? `שליחת הודעת הסיכום נכשלה: ${err.message}` : 'שליחת הודעת הסיכום נכשלה.')
    }

    const nowIso = new Date().toISOString()
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

    await transition(su, conversation.id, 'AWAIT_FINAL_CONFIRMATION', {
      actor: 'staff',
      reason: 'confirmDepositReceived',
      extraFields: {
        status: 'bot_active',
        is_staff_called: false,
        staff_call_reason: '',
        last_message_at: nowIso,
      },
    })

    return { ok: true }
  })

export const staffConfirmHealthDeclaration = createServerFn({ method: 'POST' })
  .validator(z.object({ conversationId: z.string() }))
  .handler(async ({ data }) => {
    await requireSession()
    return handleStaffConfirmHealthDeclaration(data)
  })

export const resendHealthDeclarationLink = createServerFn({ method: 'POST' })
  .validator(z.object({ conversationId: z.string() }))
  .handler(async ({ data }) => {
    await requireSession()
    return handleResendHealthDeclarationLink(data)
  })

/** Manual staff override to lock the appointment directly and transition the conversation to AWAITING_APPOINTMENT. */
export const manualFinalBookingConfirm = createServerFn({ method: 'POST' })
  .validator(z.object({ conversationId: z.string() }))
  .handler(async ({ data }) => {
    await requireSession()
    const su = await getSuperuserClient()

    const conversation = await su.collection('conversations').getOne(data.conversationId, { expand: 'customer' })
    const customer = conversation.expand?.customer as RecordModel | undefined
    if (!customer?.phone) throw new Error('לשיחה אין לקוח עם מספר טלפון תקין.')

    const appointment = await getActiveAppointmentForBot(su, customer.id)
    if (!appointment) throw new Error('לא נמצא תור פעיל ללקוח.')

    await su.collection('appointments').update(appointment.id, statusChange('confirmed', 'staff', 'manual_final_booking_confirm'))
    const { syncAppointmentToGoogle } = await import('@/integrations/google-calendar/server/google-sync.server')
    await syncAppointmentToGoogle(appointment.id).catch((syncErr) => {
      console.warn('[manualFinalBookingConfirm] failed to sync to Google Calendar:', syncErr)
    })

    const settings = await getWhatsAppSettings()
    if (settings?.phoneNumberId && settings.accessToken) {
      const client = createWhatsAppClient({
        phoneNumberId: settings.phoneNumberId,
        accessToken: settings.accessToken,
      })
      const messageBody = [
        'איזה כיף, התור שלך נקבע רשמית! 🎉',
        '',
        '📍 איפה: שוהם מרקט קומה מינוס אחת, יש חנייה בשפע במתחם INKMIND!',
        'מחכים לראותך בסטודיו!',
      ].join('\n')
      try {
        const { wamid } = await client.sendText({ to: customer.phone as string, body: messageBody })
        const nowIso = new Date().toISOString()
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
        console.warn('[manualFinalBookingConfirm] failed to send text message:', err)
      }
    }

    await transition(su, conversation.id, 'AWAITING_APPOINTMENT', {
      actor: 'staff',
      reason: 'manualFinalBookingConfirm',
      extraFields: {
        status: 'bot_active',
        is_staff_called: false,
        staff_call_reason: '',
      },
    })

    return { ok: true }
  })

/** The muted "דחייה" action on the receipt-approve HITL block — the screenshot didn't hold up
 *  (wrong amount, wrong method, unreadable). No state change: stays in AWAIT_PAYMENT (a legal
 *  self-transition) and hands back to the bot so it can watch for a re-sent receipt. */
export const rejectDepositReceipt = createServerFn({ method: 'POST' })
  .validator(z.object({ conversationId: z.string() }))
  .handler(async ({ data }) => {
    await requireSession()
    cancelPendingBotTurn(data.conversationId)
    const su = await getSuperuserClient()

    const conversation = await su.collection('conversations').getOne(data.conversationId, { expand: 'customer' })
    const customer = conversation.expand?.customer as RecordModel | undefined
    if (!customer?.phone) throw new Error('לשיחה אין לקוח עם מספר טלפון תקין.')

    const windowExpiresAt = conversation.whatsapp_window_expires_at as string | undefined
    if (windowExpiresAt && new Date(windowExpiresAt).getTime() < Date.now()) {
      throw new Error('חלון 24 השעות של וואטסאפ נסגר — אי אפשר לשלוח הודעה עד שהלקוח יכתוב שוב.')
    }

    const settings = await getWhatsAppSettings()
    if (!settings?.phoneNumberId || !settings.accessToken) {
      throw new Error('וואטסאפ אינו מוגדר. יש להזין פרטי חיבור בהגדרות.')
    }
    const client = createWhatsAppClient({ phoneNumberId: settings.phoneNumberId, accessToken: settings.accessToken })

    const messageBody = [
      'היי, ניסינו לבדוק את צילום המסך אך האסמכתה אינה קריאה 🙏',
      'נשמח אם תוכל/י לשלוח כאן צילום מסך חדש וברור של אישור ההעברה, כדי שנוכל לנעול את התור סופית!',
    ].join('\n')

    let wamid: string
    try {
      ;({ wamid } = await client.sendText({ to: customer.phone as string, body: messageBody }))
    } catch (err) {
      throw new Error(err instanceof WhatsAppApiError ? `שליחת ההודעה נכשלה: ${err.message}` : 'שליחת ההודעה נכשלה.')
    }

    const nowIso = new Date().toISOString()
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

    await su.collection('conversations').update(data.conversationId, {
      status: 'bot_active',
      is_staff_called: false,
      staff_call_reason: '',
      last_message_at: nowIso,
    })

    return { ok: true }
  })

export const markConversationAsSeen = createServerFn({ method: 'POST' })
  .validator(z.object({ conversationId: z.string() }))
  .handler(async ({ data }) => {
    await requireSession()
    const su = await getSuperuserClient()
    const unseenMessages = await su.collection('messages').getFullList({
      filter: `conversation = "${data.conversationId}" && seen != true && direction = "inbound"`,
      fields: 'id',
    })

    // The conversation's message notifications are read too: the WhatsApp tab of the notifications
    // screen would otherwise keep listing messages staff have already answered.
    const unreadNotifications = await su
      .collection('notifications')
      .getFullList({ filter: su.filter("kind = 'whatsapp_message' && read != true && link = {:link}", { link: `/dashboard/conversations?chatId=${data.conversationId}` }), fields: 'id' })
      .catch(() => [])

    await Promise.all([
      ...unseenMessages.map((msg) => su.collection('messages').update(msg.id, { seen: true })),
      ...unreadNotifications.map((n) => su.collection('notifications').update(n.id, { read: true })),
    ])
    return { ok: true, readNotifications: unreadNotifications.length }
  })

export const getUnseenMessagesCount = createServerFn({ method: 'GET' }).handler(
  async (): Promise<number> => {
    await requireSession()
    const su = await getSuperuserClient()
    const unseen = await su.collection('messages').getList(1, 1, {
      filter: 'seen != true && direction = "inbound"',
    })
    return unseen.totalItems
  }
)

export const setMessageMediaCategory = createServerFn({ method: 'POST' })
  .validator(
    z.object({
      messageId: z.string(),
      category: z.enum(['inspiration', 'verification']).nullable(),
    }),
  )
  .handler(async ({ data }) => {
    await requireSession()
    const su = await getSuperuserClient()
    const msg = await su.collection('messages').update(data.messageId, {
      media_category: data.category,
    }, { expand: 'conversation.customer' })

    const conversation = msg.expand?.conversation as RecordModel | undefined
    const customerId = (conversation?.customer as string) || (conversation?.expand?.customer as RecordModel)?.id

    if (customerId && msg.media) {
      const pbUrl = (process.env.VITE_POCKETBASE_URL || process.env.POCKETBASE_URL || 'http://127.0.0.1:8090').replace(/\/$/, '')
      const fileUrl = `${pbUrl}/api/files/messages/${msg.id}/${encodeURIComponent(msg.media as string)}`
      const appointment = await getActiveAppointmentForBot(su, customerId).catch(() => null)
      if (appointment) {
        if (data.category === 'verification') {
          await su.collection('appointments').update(appointment.id, {
            payment_receipt_url: fileUrl,
          }).catch(() => null)
        } else if (data.category === 'inspiration') {
          const currentRefImages = Array.isArray(appointment.reference_images)
            ? (appointment.reference_images as string[])
            : []
          if (!currentRefImages.includes(fileUrl)) {
            await su.collection('appointments').update(appointment.id, {
              reference_images: [...currentRefImages, fileUrl],
            }).catch(() => null)
          }
        }
      }
    }

    return { ok: true }
  })

export const staffConfirmCancellation = createServerFn({ method: 'POST' })
  .validator(
    z.object({
      conversationId: z.string(),
      appointmentId: z.string().optional(),
    }),
  )
  .handler(async ({ data }) => {
    await requireSession()
    const su = await getSuperuserClient()

    const conversation = await su.collection('conversations').getOne(data.conversationId, { expand: 'customer' })
    const customer = conversation.expand?.customer as RecordModel | undefined
    if (!customer?.id) throw new Error('לשיחה אין לקוח תקין.')

    const appointment = data.appointmentId
      ? await su.collection('appointments').getOne(data.appointmentId).catch(() => null)
      : await getActiveAppointmentForBot(su, customer.id)

    if (!appointment) throw new Error('לא נמצא תור פעיל לביטול.')

    // 1. Cancel appointment (syncs to Google & runs waitlist matching)
    await cancelAppointmentForBot(su, appointment, { actor: 'staff', reason: 'staff_confirmed_cancel_request', cancelledBy: 'customer' })

    // 2. Resolve escalated state and allow customer to rebook
    await transition(su, conversation.id, 'COLLECTING_INFO', {
      actor: 'staff',
      reason: 'staffConfirmCancellation',
      extraFields: {
        status: 'bot_active',
        is_staff_called: false,
        staff_call_reason: '',
        tattoo_info: null,
        booking_session_started_at: new Date().toISOString(),
      },
    })

    // 3. Cancel any pending bot turn
    cancelPendingBotTurn(data.conversationId)

    // 4. Send final confirmation WhatsApp message to customer
    const settings = await getWhatsAppSettings()
    if (settings?.phoneNumberId && settings.accessToken && customer.phone) {
      const client = createWhatsAppClient({
        phoneNumberId: settings.phoneNumberId,
        accessToken: settings.accessToken,
      })
      const messageBody = 'התור בוטל במערכת לבקשתך.'
      try {
        const { wamid } = await client.sendText({ to: customer.phone as string, body: messageBody })
        const nowIso = new Date().toISOString()
        await su.collection('messages').create({
          conversation: conversation.id,
          whatsapp_message_id: wamid,
          direction: 'outbound',
          sender_type: 'staff',
          type: 'text',
          body: messageBody,
          status: 'sent',
          timestamp: nowIso,
          seen: true,
        })
      } catch (err) {
        console.warn('[staffConfirmCancellation] failed to send text message:', err)
      }
    }

    return { ok: true }
  })

export const KNOWN_TEMPLATE_METADATA: Record<
  string,
  { label: string; description: string; paramLabels: string[] }
> = {
  appointment_reminder_3d: {
    label: 'תזכורת תור (3 ימים לפני)',
    description: 'הודעת תזכורת מוקדמת לתור עם תאריך, שעה ושם המקעקע',
    paramLabels: ['שם הלקוח/ה', 'יום ותאריך התור', 'שעת התור', 'שם המקעקע/ת'],
  },
  appointment_reminder_1d: {
    label: 'תזכורת תור (יום לפני)',
    description: 'תזכורת אחרונה יום לפני התור כולל הנחיות הגעה והיערכות',
    paramLabels: ['שם הלקוח/ה', 'שעת התור', 'שם המקעקע/ת'],
  },
  healing_check: {
    label: 'בדיקת החלמה',
    description: 'בסוף תקופת ההחלמה אחרי סשן',
    paramLabels: ['שם הלקוח/ה'],
  },
  healing_check_next_session: {
    label: 'בדיקת החלמה והזמנה לסשן הבא',
    description: 'בסוף תקופת ההחלמה, באמצע פרויקט של כמה מפגשים',
    paramLabels: ['שם הלקוח/ה'],
  },
  review_request: {
    label: 'בקשת ביקורת',
    description: 'בסוף הפרויקט, עם הקישור לביקורת בגוגל',
    paramLabels: ['שם הלקוח/ה', 'קישור לביקורת בגוגל'],
  },
  nps_request: {
    label: 'שאלת משוב (1–10)',
    description: 'בסוף הפרויקט, כשהסטודיו שואל קודם על דירוג',
    paramLabels: ['שם הלקוח/ה'],
  },
  consultation_followup: {
    label: 'מעקב אחרי פגישת ייעוץ',
    description: 'כמה ימים אחרי ייעוץ, כשלא נקבע קעקוע',
    paramLabels: ['שם הלקוח/ה'],
  },
  general_update: {
    label: 'עדכון כללי / יצירת קשר',
    description: 'פתיחה מחודשת של חלון ההודעות מול הלקוח/ה',
    paramLabels: ['שם הלקוח/ה', 'תוכן העדכון'],
  },
  health_declaration_notice: {
    label: 'קישור להצהרת בריאות',
    description: 'הודעת תבנית עם קישור למילוי הצהרת בריאות דיגיטלית',
    paramLabels: ['שם הלקוח/ה'],
  },
}

export function parseTemplateParameters(
  templateName: string,
  bodyText: string,
  exampleBodyText?: string[],
): Array<{ index: number; label: string; placeholder: string; example?: string }> {
  const matches = bodyText.match(/\{\{(\d+)\}\}/g) || []
  const uniqueIndexes = Array.from(new Set(matches.map((m) => parseInt(m.replace(/\D/g, ''), 10)))).sort(
    (a, b) => a - b,
  )

  const knownMeta = KNOWN_TEMPLATE_METADATA[templateName]

  return uniqueIndexes.map((idx, i) => {
    const label = knownMeta?.paramLabels[i] || `פרמטר {{${idx}}}`
    const example = exampleBodyText?.[i]
    const placeholder = example ? `למשל: ${example}` : `ערך עבור {{${idx}}}`
    return {
      index: idx,
      label,
      placeholder,
      example,
    }
  })
}

export { isMetaSampleTemplate, shouldExcludeTemplate } from '../utils/templates'

export const listApprovedTemplates = createServerFn({ method: 'GET' }).handler(
  async (): Promise<{ templates: UIMetaTemplate[]; hasApprovedTemplates: boolean }> => {
    await requireSession()
    const settings = await getWhatsAppSettings()
    if (!settings?.phoneNumberId || !settings.accessToken || !settings.businessAccountId) {
      return { templates: [], hasApprovedTemplates: false }
    }

    const client = createWhatsAppClient({
      phoneNumberId: settings.phoneNumberId,
      accessToken: settings.accessToken,
      businessAccountId: settings.businessAccountId,
    })

    try {
      const metaTemplates = await client.getApprovedTemplates()
      const userTemplates = metaTemplates.filter(
        (tpl) => !shouldExcludeTemplate({ name: tpl.name, language: tpl.language }),
      )
      const templates: UIMetaTemplate[] = userTemplates.map((tpl) => {
        const bodyComp = tpl.components?.find((c) => c.type === 'BODY')
        const bodyText = bodyComp?.text || ''
        const exampleValues = bodyComp?.example?.body_text?.[0]
        const known = KNOWN_TEMPLATE_METADATA[tpl.name]
        const params = parseTemplateParameters(tpl.name, bodyText, exampleValues)

        return {
          id: tpl.id || tpl.name,
          name: tpl.name,
          displayName: known?.label || tpl.name.replace(/_/g, ' '),
          description: known?.description || `תבנית מאושרת Meta (${tpl.category})`,
          language: tpl.language,
          category: tpl.category,
          status: tpl.status,
          bodyText,
          params,
        }
      })

      return {
        templates,
        hasApprovedTemplates: templates.length > 0,
      }
    } catch (err) {
      console.warn('[listApprovedTemplates] failed to fetch from Meta:', err)
      return { templates: [], hasApprovedTemplates: false }
    }
  },
)

interface ExecuteSendTemplateOptions {
  toPhone: string
  templateName: string
  languageCode: string
  parameters: string[]
  renderedBody?: string
  conversationId: string
  staffId: string
}

async function executeSendTemplate({
  toPhone,
  templateName,
  languageCode,
  parameters,
  renderedBody,
  conversationId,
  staffId,
}: ExecuteSendTemplateOptions): Promise<UIMessage> {
  const su = await getSuperuserClient()
  const settings = await getWhatsAppSettings()
  if (!settings?.phoneNumberId || !settings.accessToken) {
    throw new Error('וואטסאפ אינו מוגדר. יש להזין פרטי חיבור בהגדרות.')
  }

  const client = createWhatsAppClient({
    phoneNumberId: settings.phoneNumberId,
    accessToken: settings.accessToken,
  })

  const components: TemplateComponent[] | undefined =
    parameters.length > 0
      ? [
          {
            type: 'body',
            parameters: parameters.map((text) => ({ type: 'text', text })),
          },
        ]
      : undefined

  let wamid: string
  try {
    const result = await client.sendTemplate({
      to: toPhone,
      templateName,
      languageCode,
      components,
    })
    wamid = result.wamid
  } catch (err) {
    const msg = err instanceof WhatsAppApiError ? err.message : String(err)
    throw new Error(`שליחת תבנית וואטסאפ נכשלה: ${msg}`)
  }

  const nowIso = new Date().toISOString()
  const bodyText =
    renderedBody?.trim() ||
    `[תבנית: ${templateName}] ${parameters.join(' | ')}`.trim()

  const record = await su.collection('messages').create({
    conversation: conversationId,
    whatsapp_message_id: wamid,
    direction: 'outbound',
    sender_type: 'staff',
    sender_staff: staffId,
    type: 'template',
    body: bodyText,
    status: 'sent',
    timestamp: nowIso,
    seen: true,
  })

  await su.collection('conversations').update(conversationId, {
    last_message_at: nowIso,
  })

  return toUIMessage(record)
}

export const sendConversationTemplate = createServerFn({ method: 'POST' })
  .validator(
    z.object({
      conversationId: z.string(),
      templateName: z.string().min(1),
      languageCode: z.string().default('he'),
      parameters: z.array(z.string()).default([]),
      renderedBody: z.string().optional(),
    }),
  )
  .handler(async ({ data }): Promise<UIMessage> => {
    const session = await requireSession()
    const su = await getSuperuserClient()

    const conversation = await su
      .collection('conversations')
      .getOne(data.conversationId, { expand: 'customer' })
    const customer = conversation.expand?.customer as RecordModel | undefined
    if (!customer?.phone) throw new Error('לשיחה אין מספר טלפון תקין.')

    return executeSendTemplate({
      toPhone: customer.phone as string,
      templateName: data.templateName,
      languageCode: data.languageCode,
      parameters: data.parameters,
      renderedBody: data.renderedBody,
      conversationId: conversation.id,
      staffId: session.staff.id,
    })
  })

export const startConversationWithTemplate = createServerFn({ method: 'POST' })
  .validator(
    z.object({
      customerId: z.string().optional(),
      phone: z.string().optional(),
      customerName: z.string().optional(),
      templateName: z.string().min(1),
      languageCode: z.string().default('he'),
      parameters: z.array(z.string()).default([]),
      renderedBody: z.string().optional(),
      initialStatus: z.enum(['bot_active', 'staff_handling']).default('bot_active'),
    }),
  )
  .handler(async ({ data }): Promise<{ conversationId: string; message: UIMessage }> => {
    const session = await requireSession()
    const su = await getSuperuserClient()

    let customer: RecordModel | null = null
    if (data.customerId) {
      customer = await su.collection('customers').getOne(data.customerId).catch(() => null)
      // A customer picked in the UI that no longer exists means the client's list is stale. Never
      // fall through to the phone lookup below: it would create a duplicate of a deliberately
      // deleted customer. The error refreshes the client's customer list (see stale-reference.ts).
      if (!customer) {
        throw createStaleReferenceError('customers', 'הלקוח/ה שנבחר/ה כבר לא קיים/ת במערכת. רשימת הלקוחות רועננה, נא לבחור שוב.')
      }
    }

    if (!customer) {
      if (!data.phone) {
        throw new Error('יש לבחור לקוח/ה או להזין מספר טלפון.')
      }
      const canonicalPhone = toCanonicalE164Phone(data.phone)
      if (!canonicalPhone || canonicalPhone.length < 8) {
        throw new Error('מספר טלפון לא תקין.')
      }
      customer = await su
        .collection('customers')
        .getFirstListItem(`phone = "${canonicalPhone}"`)
        .catch(() => null)
      if (!customer) {
        customer = await su.collection('customers').create({
          phone: canonicalPhone,
          name: data.customerName?.trim() || formatPhoneForDisplay(canonicalPhone),
        })
      } else if (
        data.customerName?.trim() &&
        (!customer.name || customer.name === formatPhoneForDisplay(canonicalPhone) || customer.name === canonicalPhone)
      ) {
        await su.collection('customers').update(customer.id, {
          name: data.customerName.trim(),
        }).catch(() => null)
        customer.name = data.customerName.trim()
      }
    }

    if (!customer || !customer.phone) {
      throw new Error('ללקוח/ה אין מספר טלפון תקין לשליחת וואטסאפ.')
    }

    let conversation = await su
      .collection('conversations')
      .getFirstListItem(`customer = "${customer.id}"`)
      .catch(() => null)

    const nowIso = new Date().toISOString()
    if (!conversation) {
      conversation = await su.collection('conversations').create({
        customer: customer.id,
        status: data.initialStatus,
        state: 'COLLECTING_INFO',
        ...stateAttribution('staff', 'template_started_conversation'),
        last_message_at: nowIso,
      })
    } else {
      await su.collection('conversations').update(conversation.id, {
        status: data.initialStatus,
        last_message_at: nowIso,
      })
    }

    if (!conversation) {
      throw new Error('שגיאה ביצירת שיחה.')
    }

    const message = await executeSendTemplate({
      toPhone: customer.phone as string,
      templateName: data.templateName,
      languageCode: data.languageCode,
      parameters: data.parameters,
      renderedBody: data.renderedBody,
      conversationId: conversation.id,
      staffId: session.staff.id,
    })

    return {
      conversationId: conversation.id,
      message,
    }
  })

