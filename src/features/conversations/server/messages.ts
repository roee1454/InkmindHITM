import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { getSuperuserClient } from '@/integrations/pocketbase/superuser.server'
import { getSession } from '@/lib/session.server'
import {
  ERROR_REENGAGEMENT_REQUIRED,
  WhatsAppApiError,
  createWhatsAppClient,
} from '@/integrations/whatsapp-cloud-api/client'
import { getWhatsAppSettings } from './webhook'
import type { RecordModel } from 'pocketbase'
import type {
  UIAppointmentSummary,
  UIConversation,
  UIMessage,
  WhatsAppConnectionStatus,
} from '@/features/conversations/types'
import { getActiveAppointmentForBot } from '@/features/calendar/server/bot-appointments'
import { toYmd, minutesToTime } from '@/lib/date-utils'
import { transition } from './state-machine'

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
    status: (record.status as string) || 'staff_handling',
    state: (record.state as string) || 'NEW',
    staffCallReason: (record.staff_call_reason as string) || null,
    lastMessageAt: (record.last_message_at as string) || null,
    windowExpiresAt: (record.whatsapp_window_expires_at as string) || null,
    unreadCount: 0,
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
    const su = await getSuperuserClient()
    const conversation = await su.collection('conversations').getOne(data.conversationId)
    const appointment = await getActiveAppointmentForBot(su, conversation.customer as string)
    if (!appointment) return null

    const staffRecord = appointment.staff
      ? await su.collection('staff').getOne(appointment.staff as string).catch(() => null)
      : null
    const start = new Date(appointment.start_time as string)
    return {
      id: appointment.id,
      status: (appointment.status as string) || 'pending',
      tattooDescription: (appointment.tattoo_description as string) || '',
      staffName: (staffRecord?.name as string) || null,
      date: toYmd(start),
      timeSlot: minutesToTime(start.getHours() * 60 + start.getMinutes()),
      durationMinutes: Number(appointment.duration_minutes) || 120,
      priceMinIls: appointment.price_min !== '' && appointment.price_min != null ? Number(appointment.price_min) : null,
      priceMaxIls: appointment.price_max !== '' && appointment.price_max != null ? Number(appointment.price_max) : null,
      depositAmount: appointment.deposit_amount !== '' && appointment.deposit_amount != null ? Number(appointment.deposit_amount) : null,
      depositPaid: Boolean(appointment.deposit_paid),
      slotConfirmed: Boolean(appointment.slot_confirmed),
    }
  })

/** Explicit staff takeover (HITL-6): silences the bot without sending a message.
 *  Until now the only way to stop a derailing bot was to send some message (sendMessage
 *  flips status as a side effect) or wait for the bot to escalate itself. */
export const takeOverConversation = createServerFn({ method: 'POST' })
  .validator(z.object({ conversationId: z.string() }))
  .handler(async ({ data }) => {
    await requireSession()
    const su = await getSuperuserClient()
    await su.collection('conversations').update(data.conversationId, {
      status: 'staff_handling',
    })
    return { ok: true }
  })

export const resumeBotForConversation = createServerFn({ method: 'POST' })
  .validator(z.object({ conversationId: z.string() }))
  .handler(async ({ data }) => {
    await requireSession()
    const su = await getSuperuserClient()
    await su.collection('conversations').update(data.conversationId, {
      status: 'bot_active',
      is_staff_called: false,
      staff_call_reason: '',
    })
    return { ok: true }
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

    const priceMin = appointment.price_min
    const priceMax = appointment.price_max
    const priceLabel = priceMin === priceMax ? `₪${priceMax}` : `₪${priceMin}–${priceMax}`
    const messageBody = [
      'קיבלנו את התשלום, תודה! 🎉',
      'רק לוודא לפני שנועלים את התור סופית:',
      `קעקוע: ${(appointment.tattoo_description as string) || '—'}`,
      staffRecord ? `עם: ${staffRecord.name as string}` : null,
      `תאריך: ${dateStr} בשעה ${timeStr}`,
      `מחיר: ${priceLabel}, מקדמה: ₪${appointment.deposit_amount}`,
      '',
      'הכל תקין? 🙏',
    ].filter((line) => line !== null).join('\n')

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

/** The muted "דחייה" action on the receipt-approve HITL block — the screenshot didn't hold up
 *  (wrong amount, wrong method, unreadable). No state change: stays in AWAIT_PAYMENT (a legal
 *  self-transition) and hands back to the bot so it can watch for a re-sent receipt. */
export const rejectDepositReceipt = createServerFn({ method: 'POST' })
  .validator(z.object({ conversationId: z.string() }))
  .handler(async ({ data }) => {
    await requireSession()
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

    const messageBody = 'לא הצלחנו לאמת את האסמכתה ששלחת. אפשר לשלוח צילום מסך ברור יותר של אישור התשלום? 🙏'

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

    await Promise.all(
      unseenMessages.map((msg) =>
        su.collection('messages').update(msg.id, { seen: true })
      )
    )
    return { ok: true }
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
    await su.collection('messages').update(data.messageId, {
      media_category: data.category,
    })
    return { ok: true }
  })
