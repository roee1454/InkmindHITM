import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { getSuperuserClient } from '@/integrations/pocketbase/superuser.server'
import { requireAuth } from '@/features/settings/server/helpers.server'
import { toYmd, minutesToTime } from '../date-utils'
import { HEBREW_DAYS_LONG } from '@/lib/date-utils'
import { checkAvailabilityForBot } from './bot-appointments'
import type { ApiAppointment, AppointmentStatus, ApiGoogleConnection } from '../types'

import { disconnectGoogleCalendar, newOAuthClient } from '@/integrations/google-calendar/server/google-auth'
import {
  syncAppointmentToGoogle,
  deleteSyncedAppointmentFromGoogle,
  cleanupStaffGoogleCalendarEvents,
} from '@/integrations/google-calendar/server/google-sync'
import { addSystemNotification } from '@/features/notifications/server/notifications'
import {
  createWhatsAppClient,
  WhatsAppApiError,
  ERROR_REENGAGEMENT_REQUIRED,
} from '@/integrations/whatsapp-cloud-api/client'
import { getWhatsAppSettings } from '@/integrations/whatsapp-cloud-api/settings.server'
import { getStudioPolicyForBot } from '@/features/settings/server/policy'
import { transition } from '@/features/conversations/server/state-machine'

export const getGoogleCalendarConnections = createServerFn({ method: 'GET' }).handler(
  async (): Promise<ApiGoogleConnection[]> => {
    await requireAuth()
    const su = await getSuperuserClient()

    const credentialsList = await su.collection('credentials').getFullList({
      filter: 'provider = "google_calendar"',
      expand: 'staff',
    }).catch(() => [])

    const results: ApiGoogleConnection[] = []

    for (const c of credentialsList) {
      const staffObj = c.expand?.staff
      let picture = (c.google_account_picture as string) || null
      let email = (c.google_account_email as string) || (c.google_calendar_id as string) || null

      if (!picture && c.access_token) {
        try {
          const client = newOAuthClient()
          client.setCredentials({
            access_token: c.access_token as string,
            refresh_token: c.refresh_token as string,
          })
          const { data: userInfo } = await client.request<{ email?: string; picture?: string }>({
            url: 'https://www.googleapis.com/oauth2/v2/userinfo',
          })
          if (userInfo.picture) {
            picture = userInfo.picture
            email = userInfo.email || email
            void su.collection('credentials').update(c.id, {
              google_account_picture: userInfo.picture,
              google_account_email: userInfo.email || c.google_account_email,
            }).catch(() => null)
          }
        } catch {
          // Token expired or network issue - fallback to staff avatar
        }
      }

      results.push({
        staffId: (c.staff as string) || '',
        googleAccountEmail: email,
        googleAccountPicture: picture || (staffObj?.avatar as string) || null,
        status: 'connected' as const,
        lastError: null,
        lastSyncedAt: (c.updated as string) || (c.connected_at as string) || null,
      })
    }

    return results
  },
)

const disconnectSchema = z.object({
  staffId: z.string(),
})

export const disconnectStaffGoogleCalendar = createServerFn({ method: 'POST' })
  .validator(disconnectSchema)
  .handler(async ({ data }) => {
    await requireAuth()
    await cleanupStaffGoogleCalendarEvents(data.staffId)
    await disconnectGoogleCalendar(data.staffId)
    return { ok: true }
  })

export const getAppointments = createServerFn({ method: 'GET' }).handler(
  async (): Promise<ApiAppointment[]> => {
    await requireAuth()
    const su = await getSuperuserClient()

    const records = await su.collection('appointments').getFullList({
      expand: 'customer,staff',
      sort: '-start_time',
    })

    return records.map((item) => {
      const d = new Date(item.start_time)
      const customerObj = item.expand?.customer
      const staffObj = item.expand?.staff

      const dateStr = toYmd(d)
      const timeSlotStr = minutesToTime(d.getHours() * 60 + d.getMinutes())

      return {
        id: item.id,
        customerId: (item.customer as string) || '',
        chatId: (customerObj?.whatsapp_chat_id as string) || null,
        staffId: (item.staff as string) || null,
        date: dateStr,
        timeSlot: timeSlotStr,
        status: (item.status as AppointmentStatus) || 'pending',
        createdAt: item.created as string,
        leadName: (customerObj?.name as string) || (item.customer_name_override as string) || null,
        leadPhone: (customerObj?.phone as string) || (item.customer_phone_override as string) || null,
        staffName: (staffObj?.name as string) || null,
        style: (item.tattoo_description as string) || null,
        price: item.price_amount != null ? Number(item.price_amount) : null,
        depositAmount: item.deposit_amount != null ? Number(item.deposit_amount) : null,
        hasDeposit: Boolean(item.deposit_paid),
        durationHours: Number(item.duration_hours || 2.0),
        notes: (item.notes as string) || null,
        isException: Boolean(item.is_exception),
        source: (item.source as 'ai_bot' | 'staff_manual') || 'staff_manual',
      }
    })
  },
)

const createAppointmentSchema = z.object({
  customerId: z.string().nullable().optional(),
  chatId: z.string().nullable().optional(),
  leadName: z.string().optional(),
  leadPhone: z.string().optional(),
  date: z.string().min(1, 'תאריך נדרש'),
  timeSlot: z.string().min(1, 'שעה נדרשת'),
  staffId: z.string().nullable().optional(),
  durationHours: z.number().default(2.0),
  tattooDescription: z.string().optional(),
  priceIls: z.number().nullable().optional(),
  depositAmount: z.number().nullable().optional(),
  status: z.enum(['pending', 'confirmed', 'cancelled', 'completed', 'no_show']).default('pending'),
  depositPaid: z.boolean().default(false),
  notes: z.string().optional(),
  allowException: z.boolean().default(false),
})

export const createAppointment = createServerFn({ method: 'POST' })
  .validator(createAppointmentSchema)
  .handler(async ({ data }) => {
    await requireAuth()
    const su = await getSuperuserClient()
    const studio = await su.collection('studios').getFirstListItem('').catch(() => null)

    const [year = 2026, month = 1, day = 1] = data.date.split('-').map(Number)
    const [hour = 0, minute = 0] = data.timeSlot.split(':').map(Number)
    const startTimeIso = new Date(year, month - 1, day, hour, minute).toISOString()

    const created = await su.collection('appointments').create({
      studio: studio?.id || '',
      customer: data.customerId || null,
      staff: data.staffId || null,
      start_time: startTimeIso,
      duration_hours: data.durationHours,
      status: data.status,
      tattoo_description: data.tattooDescription || '',
      price_amount: data.priceIls != null ? data.priceIls : null,
      deposit_amount: data.depositAmount != null ? data.depositAmount : null,
      deposit_paid: data.depositPaid,
      notes: data.notes || '',
      is_exception: data.allowException,
      customer_name_override: data.leadName || '',
      customer_phone_override: data.leadPhone || '',
      source: 'staff_manual',
    })

    await syncAppointmentToGoogle(created.id)

    // Trigger system notification
    const dateFormatted = data.date.split('-').reverse().join('/')
    await addSystemNotification({
      title: 'נקבע תור חדש',
      message: `נקבע תור עבור ${data.leadName || 'לקוח'} לתאריך ${dateFormatted} בשעה ${data.timeSlot}`,
      type: 'success',
      link: '/dashboard/calendar',
    }).catch(() => null)

    return { id: created.id }
  })

const updateAppointmentSchema = z.object({
  id: z.string(),
  customerId: z.string().nullable().optional(),
  chatId: z.string().nullable().optional(),
  leadName: z.string().optional(),
  leadPhone: z.string().optional(),
  date: z.string().optional(),
  timeSlot: z.string().optional(),
  staffId: z.string().nullable().optional(),
  durationHours: z.number().optional(),
  tattooDescription: z.string().optional(),
  priceIls: z.number().nullable().optional(),
  depositAmount: z.number().nullable().optional(),
  status: z.enum(['pending', 'confirmed', 'cancelled', 'completed', 'no_show']).optional(),
  depositPaid: z.boolean().optional(),
  notes: z.string().optional(),
  allowException: z.boolean().optional(),
})

export const updateAppointment = createServerFn({ method: 'POST' })
  .validator(updateAppointmentSchema)
  .handler(async ({ data }) => {
    await requireAuth()
    const su = await getSuperuserClient()

    const updateBody: Record<string, unknown> = {}

    if (data.customerId !== undefined) updateBody.customer = data.customerId
    if (data.staffId !== undefined) updateBody.staff = data.staffId
    if (data.durationHours !== undefined) updateBody.duration_hours = data.durationHours
    if (data.status !== undefined) updateBody.status = data.status
    if (data.tattooDescription !== undefined) updateBody.tattoo_description = data.tattooDescription
    if (data.priceIls !== undefined) updateBody.price_amount = data.priceIls
    if (data.depositAmount !== undefined) updateBody.deposit_amount = data.depositAmount
    if (data.depositPaid !== undefined) updateBody.deposit_paid = data.depositPaid
    if (data.notes !== undefined) updateBody.notes = data.notes
    if (data.allowException !== undefined) updateBody.is_exception = data.allowException
    if (data.leadName !== undefined) updateBody.customer_name_override = data.leadName
    if (data.leadPhone !== undefined) updateBody.customer_phone_override = data.leadPhone

    if (data.date && data.timeSlot) {
      const [year = 2026, month = 1, day = 1] = data.date.split('-').map(Number)
      const [hour = 0, minute = 0] = data.timeSlot.split(':').map(Number)
      updateBody.start_time = new Date(year, month - 1, day, hour, minute).toISOString()
    }
    const before = await su.collection('appointments').getOne(data.id).catch(() => null)
    await su.collection('appointments').update(data.id, updateBody)
    await syncAppointmentToGoogle(data.id)

    // Trigger system notification
    if (before) {
      const customerName = before.customer_name_override || 'לקוח'
      let changeMsg = `התור של ${customerName} עודכן.`
      if (data.status && data.status !== before.status) {
        const statusLabels: Record<string, string> = {
          pending: 'ממתין',
          confirmed: 'אושר',
          cancelled: 'בוטל',
          completed: 'הושלם',
          no_show: 'לא הגיע',
        }
        changeMsg = `הסטטוס של ${customerName} שונה ל"${statusLabels[data.status] || data.status}".`
      }
      await addSystemNotification({
        title: 'עדכון תור',
        message: changeMsg,
        type: data.status === 'cancelled' ? 'warning' : 'info',
        link: '/dashboard/calendar',
      }).catch(() => null)
    }

    return { id: data.id }
  })

const deleteAppointmentSchema = z.object({
  id: z.string(),
})

export const deleteAppointment = createServerFn({ method: 'POST' })
  .validator(deleteAppointmentSchema)
  .handler(async ({ data }) => {
    await requireAuth()
    const su = await getSuperuserClient()

    const existing = await su.collection('appointments').getOne(data.id).catch(() => null)
    if (existing) {
      await deleteSyncedAppointmentFromGoogle(existing)
      await su.collection('appointments').delete(data.id)
    }

    return { ok: true }
  })

const sendPriceQuoteSchema = z.object({
  appointmentId: z.string(),
  priceIls: z.number().min(0),
  depositAmount: z.number().min(0),
  // Optional quick-reschedule from the inline pricing card (HITL-7): staff adjusts the
  // proposed slot without leaving the conversation.
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  timeSlot: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).optional(),
})

/** Sends the price + deposit quote to the customer for a bot-created pending hold, once staff
 *  has filled them in on the appointment record. Deterministic template, not LLM-composed —
 *  a quoted price is exact information that must never be paraphrased or invented by a model.
 *  Persists as `sender_type: 'ai_bot'` (it's the automated quote channel, even though a human
 *  decided the number) and moves the conversation to AWAIT_PAYMENT so the agent's existing
 *  prompt/tool-gating for that state takes over from here (receipt screenshot -> call_staff). */
export const sendPriceQuoteToCustomer = createServerFn({ method: 'POST' })
  .validator(sendPriceQuoteSchema)
  .handler(async ({ data }) => {
    await requireAuth()
    const su = await getSuperuserClient()

    const appointment = await su.collection('appointments').getOne(data.appointmentId, { expand: 'customer' })
    const customer = appointment.expand?.customer as { id: string; phone?: string } | undefined
    if (!customer?.phone) throw new Error('לתור הזה אין לקוח עם מספר טלפון תקין.')

    // Fetched before sending (used to be after) so the 24h-window gate below can run
    // first — a closed window used to surface as a raw Graph 131047 error (HITL-4).
    const conversation = await su.collection('conversations')
      .getFirstListItem(`customer = "${customer.id}"`)
      .catch(() => null)
    const windowExpiresAt = conversation?.whatsapp_window_expires_at as string | undefined
    if (windowExpiresAt && new Date(windowExpiresAt).getTime() < Date.now()) {
      throw new Error('חלון 24 השעות של וואטסאפ נסגר — אי אפשר לשלוח הצעת מחיר עד שהלקוח יכתוב שוב. אפשר להתקשר אליו או להמתין להודעה ממנו.')
    }

    // Quick-reschedule from the pricing card (HITL-7): validate the new slot the same
    // way the bot does before moving it. Staff who need to override (outside working
    // hours, deliberate double-book) still have the full calendar editor for that.
    let start = new Date(appointment.start_time as string)
    if (data.date && data.timeSlot) {
      const availability = await checkAvailabilityForBot(su, {
        staffId: (appointment.staff as string) || '',
        date: data.date,
        timeSlot: data.timeSlot,
        durationHours: Number(appointment.duration_hours) || 2,
      })
      const currentSlot = `${toYmd(start)}|${minutesToTime(start.getHours() * 60 + start.getMinutes())}`
      const isSameSlot = currentSlot === `${data.date}|${data.timeSlot}`
      if (!availability.available && !isSameSlot) {
        const blockReasons: Record<string, string> = {
          date_in_past: 'המועד החדש כבר עבר.',
          slot_taken: 'המשבצת החדשה תפוסה אצל האמן.',
          outside_working_hours: 'המועד החדש מחוץ לשעות העבודה של האמן.',
          no_working_hours_configured: 'לאמן לא הוגדרו שעות עבודה.',
          invalid_staff_id: 'לתור אין אמן משויך תקין.',
        }
        throw new Error(`${blockReasons[availability.reason] ?? 'המשבצת החדשה אינה זמינה.'} לשינוי בכל זאת, ערוך את התור דרך היומן.`)
      }
      const [y = 2026, m = 1, d = 1] = data.date.split('-').map(Number)
      const [hh = 0, mm = 0] = data.timeSlot.split(':').map(Number)
      start = new Date(y, m - 1, d, hh, mm)
    }

    await su.collection('appointments').update(data.appointmentId, {
      price_amount: data.priceIls,
      deposit_amount: data.depositAmount,
      start_time: start.toISOString(),
    })

    const waSettings = await getWhatsAppSettings(su)
    if (!waSettings?.phoneNumberId || !waSettings.accessToken) {
      throw new Error('וואטסאפ אינו מוגדר. יש להזין פרטי חיבור בהגדרות.')
    }
    const policy = await getStudioPolicyForBot(su)
    const waClient = createWhatsAppClient({
      phoneNumberId: waSettings.phoneNumberId,
      accessToken: waSettings.accessToken,
    })

    const dayName = HEBREW_DAYS_LONG[start.getDay()]
    const messageBody = [
      '✨ קיבלנו את הבקשה שלך ואישרנו את הפרטים!',
      `מועד: ${dayName}, ${start.getDate()}.${start.getMonth() + 1} בשעה ${minutesToTime(start.getHours() * 60 + start.getMinutes())}`,
      `מחיר הקעקוע: ₪${data.priceIls}`,
      `מקדמה לשריון התור: ₪${data.depositAmount}`,
      policy.paymentInstructions || '',
      'ברגע ששולחים צילום מסך של התשלום, נאשר את התור 🙌',
    ].filter(Boolean).join('\n')

    let wamid: string
    try {
      ;({ wamid } = await waClient.sendText({ to: customer.phone, body: messageBody }))
    } catch (err) {
      if (err instanceof WhatsAppApiError && err.code === ERROR_REENGAGEMENT_REQUIRED) {
        throw new Error('החלון של 24 שעות פג — יש לחכות להודעה חדשה מהלקוח לפני שליחת הצעת מחיר.')
      }
      throw new Error(err instanceof WhatsAppApiError ? `שליחת הצעת המחיר נכשלה: ${err.message}` : 'שליחת הצעת המחיר נכשלה.')
    }

    const nowIso = new Date().toISOString()
    if (conversation) {
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
      await transition(su, conversation.id, 'AWAIT_PAYMENT', {
        actor: 'staff',
        reason: 'sendPriceQuoteToCustomer',
        extraFields: { last_message_at: nowIso },
      })
    }

    return { ok: true }
  })
