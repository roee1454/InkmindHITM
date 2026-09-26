import type PocketBase from 'pocketbase'
import { canChangeAppointmentStatus, changeAttribution, statusChange } from '../utils/appointment-transitions'
import { ClientResponseError } from 'pocketbase'
import type { RecordModel } from 'pocketbase'
import { customerCancellationPolicyText } from '@/lib/cancellation-policy'
import { getSuperuserClient } from '@/integrations/pocketbase/superuser.server'
import { requireAuth } from '@/features/settings/server/helpers.server'
import { toYmd, minutesToTime } from '../utils/date-utils'
import { HEBREW_DAYS_LONG, formatDurationHebrew } from '@/lib/date-utils'
import { toCanonicalE164Phone } from '@/lib/phone'
import { formatDatabaseError } from '@/lib/pocketbase-error'
import { checkAvailabilityForBot } from './bot-appointments.server'
import type { ApiAppointment, AppointmentKind, AppointmentStatus, ApiGoogleConnection } from '../types'
import { STATUS_LABELS } from '../types'
import { computeProjectPositions } from '../utils/project-position'
import { computeProjectBalance } from '@/features/payments/utils/balance'
import { toLedgerAppointment, toLedgerPayment } from '@/features/payments/server/project-finance.server'
import type { ProjectBalance } from '@/features/payments/types'
import { parseIntegrityViolation } from '@/features/database/utils/integrity-codes'
import { recordProjectQuote } from '@/features/projects/server/project-milestones.server'

import { disconnectGoogleCalendar, newOAuthClient } from '@/integrations/google-calendar/server/google-auth.server'
import { cleanupStaffGoogleCalendarEvents, syncAppointmentToGoogle } from '@/integrations/google-calendar/server/google-sync.server'
import { addSystemNotification } from '@/features/notifications/server/notifications'
import {
  createWhatsAppClient,
  WhatsAppApiError,
  ERROR_REENGAGEMENT_REQUIRED,
} from '@/integrations/whatsapp-cloud-api/client'
import { getWhatsAppSettings } from '@/integrations/whatsapp-cloud-api/settings.server'
import { getStudioPolicyForBot } from '@/features/settings/server/policy'
import { canTransition, toConversationState, transition } from '@/features/conversations/server/state-machine'
import { quoteTargetState } from '../utils/price-quote'
import { applyConversationAdvance, findConversationWaitingOn, isConsultation, planConversationAdvance } from '@/features/conversations/server/after-appointment.server'
import { reconcileCustomerConversation } from '@/features/conversations/server/reconciler.server'
import { loadProjectPolicy } from '@/features/settings/server/project-policy'
import { buildPriceQuoteMessage } from '../utils/price-quote-message'
import { cancelPendingBotTurn } from '@/integrations/ai/agent.server'
import { isHealthDeclarationValid } from '@/features/health-declaration/server/health-service'

export async function getGoogleCalendarConnectionsHandler(): Promise<ApiGoogleConnection[]> {
  await requireAuth()
  const su = await getSuperuserClient()

  const credentialsList = await su
    .collection('credentials')
    .getFullList({
      filter: 'provider = "google_calendar"',
      expand: 'staff',
    })
    .catch(() => [])

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
          void su
            .collection('credentials')
            .update(c.id, {
              google_account_picture: userInfo.picture,
              google_account_email: userInfo.email || c.google_account_email,
            })
            .catch(() => null)
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
}

export async function handleDisconnectStaffGoogleCalendar(
  staffId: string,
  session?: { staff?: { id?: string; role?: string } },
) {
  if (
    session?.staff &&
    session.staff.role !== 'admin' &&
    session.staff.role !== 'owner' &&
    session.staff.id !== staffId
  ) {
    throw new Error('אין הרשאה לנתק יומן של עובד אחר.')
  }
  await cleanupStaffGoogleCalendarEvents(staffId)
  await disconnectGoogleCalendar(staffId)
  return { ok: true }
}

function projectBalances(appointments: RecordModel[], payments: RecordModel[]): Map<string, ProjectBalance> {
  const byProject = new Map<string, { appointments: RecordModel[]; payments: RecordModel[] }>()
  const bucket = (projectId: string) => {
    const existing = byProject.get(projectId)
    if (existing) return existing
    const created = { appointments: [] as RecordModel[], payments: [] as RecordModel[] }
    byProject.set(projectId, created)
    return created
  }
  for (const appointment of appointments) if (appointment.project) bucket(appointment.project as string).appointments.push(appointment)
  for (const payment of payments) if (payment.project) bucket(payment.project as string).payments.push(payment)

  const balances = new Map<string, ProjectBalance>()
  for (const [projectId, group] of byProject) {
    balances.set(projectId, computeProjectBalance(group.appointments.map(toLedgerAppointment), group.payments.map(toLedgerPayment)))
  }
  return balances
}

/** Records saved before pb_hooks/projects.pb.js existed may lack `kind`; derive it from `type`. */
function toAppointmentKind(record: RecordModel): AppointmentKind {
  const kind = record.kind as string
  if (kind === 'consultation' || kind === 'session' || kind === 'touch_up') return kind
  return record.type === 'sketch' ? 'consultation' : 'session'
}

export async function getAppointmentsHandler(): Promise<ApiAppointment[]> {
  await requireAuth()
  const su = await getSuperuserClient()

  const records = await su.collection('appointments').getFullList({
    expand: 'customer,staff',
    sort: '-start_time',
  })

  const payments = await su.collection('payments').getFullList({
    fields: 'id,project,appointment,kind,method,amount,status,received_at',
  })
  const balances = projectBalances(records, payments)

  const positions = computeProjectPositions(
    records.map((item) => ({
      id: item.id,
      projectId: (item.project as string) || null,
      kind: toAppointmentKind(item),
      status: (item.status as AppointmentStatus) || 'pending',
      startTime: item.start_time as string,
    })),
  )

  return records.map((item) => {
    const d = new Date(item.start_time)
    const customerObj = item.expand?.customer
    const staffObj = item.expand?.staff

    const dateStr = toYmd(d)
    const timeSlotStr = minutesToTime(d.getHours() * 60 + d.getMinutes())

    const referenceImages = Array.isArray(item.reference_images) && (item.reference_images as string[]).length > 0
      ? (item.reference_images as string[])
      : []
    const paymentReceiptUrl = (item.payment_receipt_url as string) || null

    return {
      id: item.id,
      projectId: (item.project as string) || null,
      kind: toAppointmentKind(item),
      projectPosition: positions.get(item.id) ?? null,
      finalPrice: typeof item.final_price === 'number' && item.final_price > 0 ? item.final_price : null,
      chargeWaived: Boolean(item.charge_waived),
      projectBalance: balances.get((item.project as string) || '') ?? null,
      customerId: (item.customer as string) || '',
      chatId: (customerObj?.whatsapp_chat_id as string) || null,
      staffId: (item.staff as string) || null,
      type: (item.type as 'tattoo' | 'sketch') || 'tattoo',
      date: dateStr,
      timeSlot: timeSlotStr,
      status: (item.status as AppointmentStatus) || 'pending',
      createdAt: item.created as string,
      leadName: (customerObj?.name as string) || (item.customer_name_override as string) || null,
      leadPhone: (customerObj?.phone as string) || (item.customer_phone_override as string) || null,
      staffName: (staffObj?.name as string) || null,
      style: (item.tattoo_description as string) || null,
      priceMin: item.price_min != null ? Number(item.price_min) : null,
      priceMax: item.price_max != null ? Number(item.price_max) : null,
      depositAmount: item.deposit_amount != null ? Number(item.deposit_amount) : null,
      hasDeposit: Boolean(item.deposit_paid),
      durationMinutes: Number(item.duration_minutes || 120),
      slotConfirmed: Boolean(item.slot_confirmed),
      notes: (item.notes as string) || null,
      isException: Boolean(item.is_exception),
      source: (item.source as 'ai_bot' | 'staff_manual') || 'staff_manual',
      referenceImages,
      paymentReceiptUrl,
      healthDeclarationSigned: Boolean(item.health_declaration_signed || customerObj?.health_declaration_signed),
      healthDeclarationDate: (item.health_declaration_date as string) || (customerObj?.health_declaration_date as string) || null,
      healthDeclarationFileUrl: (item.health_declaration_url as string) || (customerObj?.health_declaration_url as string) || null,
      medicalNotes: (customerObj?.medical_notes as string) || null,
      healthDeclarationAnswers:
        (item.health_declaration_answers as Record<string, string | number | boolean | null | string[]>) ||
        (customerObj?.health_declaration_answers as Record<string, string | number | boolean | null | string[]>) ||
        null,
      allergies: (customerObj?.allergies as string) || null,
      googleSyncStatus: (item.google_sync_status as 'synced' | 'push_failed' | null) || null,
      googleEventId: (item.google_event_id as string) || null,
    }
  })
}

export interface CreateAppointmentServerInput {
  projectId?: string | null
  customerId?: string | null
  chatId?: string | null
  leadName?: string
  leadPhone?: string
  date: string
  timeSlot: string
  staffId?: string | null
  type?: 'tattoo' | 'sketch'
  durationMinutes?: number
  tattooDescription?: string
  priceMinIls?: number | null
  priceMaxIls?: number | null
  depositAmount?: number | null
  status?: 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'no_show'
  depositPaid?: boolean
  notes?: string
  allowException?: boolean
}

export async function createAppointmentHandler(data: CreateAppointmentServerInput) {
  await requireAuth()
  const su = await getSuperuserClient()
  const studio = await su.collection('studios').getFirstListItem('').catch(() => null)

  const [year = 2026, month = 1, day = 1] = data.date.split('-').map(Number)
  const [hour = 0, minute = 0] = data.timeSlot.split(':').map(Number)
  const startTimeIso = new Date(year, month - 1, day, hour, minute).toISOString()

  const created = await su.collection('appointments').create({
    studio: studio?.id || '',
    // Empty = a new project (pb_hooks/projects.pb.js); set when continuing an existing one.
    project: data.projectId || '',
    customer: data.customerId || null,
    staff: data.staffId || null,
    start_time: startTimeIso,
    duration_minutes: data.durationMinutes ?? 120,
    type: data.type ?? 'tattoo',
    ...statusChange(data.status ?? 'pending', 'staff', 'staff_created'),
    tattoo_description: data.tattooDescription || '',
    price_min: data.priceMinIls != null ? data.priceMinIls : null,
    price_max: data.priceMaxIls != null ? data.priceMaxIls : null,
    deposit_amount: data.depositAmount != null ? data.depositAmount : null,
    deposit_paid: data.depositPaid ?? false,
    slot_confirmed: data.status === 'confirmed',
    notes: data.notes || '',
    is_exception: data.allowException ?? false,
    customer_name_override: data.leadName || '',
    customer_phone_override: data.leadPhone ? toCanonicalE164Phone(data.leadPhone) : '',
    source: 'staff_manual',
  }).catch((err: unknown) => {
    if (err instanceof ClientResponseError && parseIntegrityViolation(err.response?.message) === 'project_customer_mismatch') {
      throw new Error('הפרויקט שנבחר שייך ללקוח אחר. יש לבחור את הלקוח של הפרויקט או ליצור תור ללא פרויקט.')
    }
    throw err
  })

  const dateFormatted = data.date.split('-').reverse().join('/')
  await addSystemNotification({
    title: 'נקבע תור חדש',
    message: `נקבע תור עבור ${data.leadName || 'לקוח'} לתאריך ${dateFormatted} בשעה ${data.timeSlot}`,
    type: 'success',
    link: '/dashboard/calendar',
  }).catch(() => null)

  if (created.customer) await reconcileCustomerConversation(su, created.customer as string)
  return { id: created.id }
}

export interface UpdateAppointmentServerInput {
  id: string
  customerId?: string | null
  chatId?: string | null
  leadName?: string
  leadPhone?: string
  date?: string
  timeSlot?: string
  staffId?: string | null
  type?: 'tattoo' | 'sketch'
  durationMinutes?: number
  tattooDescription?: string
  priceMinIls?: number | null
  priceMaxIls?: number | null
  depositAmount?: number | null
  status?: 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'no_show'
  depositPaid?: boolean
  notes?: string
  allowException?: boolean
  healthDeclarationSigned?: boolean
  healthDeclarationDate?: string | null
  healthDeclarationFileUrl?: string | null
}

export async function handleUpdateAppointment(
  data: UpdateAppointmentServerInput,
  suClient?: PocketBase,
  session?: { staff?: { id?: string; role?: string } },
) {
  const su = suClient ?? (await getSuperuserClient())

  const before = await su.collection('appointments').getOne(data.id).catch(() => null)
  if (before && session?.staff) {
    const isOwnerOrAdmin = session.staff.role === 'owner' || session.staff.role === 'admin'
    if (!isOwnerOrAdmin && before.staff && before.staff !== session.staff.id) {
      throw new Error('אין הרשאה לעדכן תור של מקעקע אחר.')
    }
  }

  const updateBody: Record<string, unknown> = {}

  if (data.customerId !== undefined) updateBody.customer = data.customerId
  if (data.staffId !== undefined) updateBody.staff = data.staffId
  if (data.type !== undefined) updateBody.type = data.type
  if (data.durationMinutes !== undefined) updateBody.duration_minutes = data.durationMinutes
  if (data.status !== undefined) {
    const from = (before?.status as AppointmentStatus | undefined) ?? data.status
    if (!canChangeAppointmentStatus(from, data.status)) {
      throw new Error(
        `לא ניתן לשנות תור מ"${STATUS_LABELS[from]}" ל"${STATUS_LABELS[data.status]}". תור שהתקיים לא מבוטל (זה החזר כספי), ותור שבוטל לא מסומן כמתקיים — אפשר להחזיר אותו לסטטוס ממתין או מאושר.`,
      )
    }
    Object.assign(updateBody, statusChange(data.status, 'staff', 'staff_edit'))
    if (data.status === 'confirmed') updateBody.slot_confirmed = true
  }
  if (data.tattooDescription !== undefined) updateBody.tattoo_description = data.tattooDescription
  if (data.priceMinIls !== undefined) updateBody.price_min = data.priceMinIls
  if (data.priceMaxIls !== undefined) updateBody.price_max = data.priceMaxIls
  if (data.depositAmount !== undefined) updateBody.deposit_amount = data.depositAmount
  if (data.depositPaid !== undefined) updateBody.deposit_paid = data.depositPaid
  if (data.notes !== undefined) updateBody.notes = data.notes
  if (data.allowException !== undefined) updateBody.is_exception = data.allowException
  if (data.leadName !== undefined) updateBody.customer_name_override = data.leadName
  if (data.leadPhone !== undefined) updateBody.customer_phone_override = data.leadPhone ? toCanonicalE164Phone(data.leadPhone) : ''
  if (data.healthDeclarationSigned !== undefined) updateBody.health_declaration_signed = data.healthDeclarationSigned
  if (data.healthDeclarationDate !== undefined) updateBody.health_declaration_date = data.healthDeclarationDate
  if (data.healthDeclarationFileUrl !== undefined) updateBody.health_declaration_file_url = data.healthDeclarationFileUrl
  if (data.date || data.timeSlot) {
    let baseDate: Date
    if (before?.start_time) {
      baseDate = new Date(before.start_time as string)
    } else {
      baseDate = new Date()
    }

    let year = baseDate.getFullYear()
    let month = baseDate.getMonth() + 1
    let day = baseDate.getDate()
    let hour = baseDate.getHours()
    let minute = baseDate.getMinutes()

    if (data.date) {
      const parts = data.date.split('-').map(Number)
      year = parts[0] ?? year
      month = parts[1] ?? month
      day = parts[2] ?? day
    }

    if (data.timeSlot) {
      const parts = data.timeSlot.split(':').map(Number)
      hour = parts[0] ?? hour
      minute = parts[1] ?? minute
    }

    updateBody.start_time = new Date(year, month - 1, day, hour, minute).toISOString()
    // Logged as a reschedule by the lifecycle hook; a status change in the same edit already attributes it.
    if (!('status_actor' in updateBody)) Object.assign(updateBody, changeAttribution('staff', 'staff_edit'))
  }

  try {
    await su.collection('appointments').update(data.id, updateBody)
  } catch (err) {
    if (err instanceof ClientResponseError && parseIntegrityViolation(err.response?.message) === 'completion_requires_final_price') {
      throw new Error('כדי לסמן סשן כ"הושלם" יש לסגור אותו עם מחיר סופי — כפתור "סגירת סשן" בחלון התור.')
    }
    throw new Error(formatDatabaseError(err, 'עדכון התור נכשל.'))
  }

  if (data.status === 'cancelled' && before?.status !== 'cancelled') {
    const watching = await su
      .collection('waitlist_entries')
      .getFullList({ filter: `current_appointment = "${data.id}" && status = "watching"` })
      .catch(() => [])
    for (const entry of watching) {
      await su.collection('waitlist_entries').update(entry.id, { status: 'cancelled' }).catch(() => null)
    }

    if (before?.start_time) {
      const { runWaitlistMatching } = await import('@/features/mcp-assistant/server/waitlist-matcher')
      await runWaitlistMatching({
        id: data.id,
        staff: (before.staff as string) || (data.staffId as string) || null,
        startTime: before.start_time as string,
        durationMinutes: Number(data.durationMinutes ?? before.duration_minutes) || 120,
      }).catch((err) => console.error('[updateAppointment] runWaitlistMatching error:', err))
    }
  }

  await syncAppointmentToGoogle(data.id).catch((err) => {
    console.error('[updateAppointment] Google sync error:', err)
  })

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

  // A manual status change moves the conversation only if it is waiting for this appointment
  // (findConversationWaitingOn): a customer booking another piece keeps that conversation.
  if (data.status === 'no_show' || data.status === 'completed') {
    const updated = await su.collection('appointments').getOne(data.id).catch(() => null)
    if (updated) await advanceConversationAfterManualStatus(su, updated, data.status)
  }

  // Whatever else changed (confirmed, cancelled, moved), the conversation follows the calendar now.
  const customerId = (before?.customer as string) || data.customerId
  if (customerId) await reconcileCustomerConversation(su, customerId)
  return { id: data.id }
}

async function advanceConversationAfterManualStatus(su: PocketBase, appointment: RecordModel, status: 'no_show' | 'completed'): Promise<void> {
  const now = new Date()
  try {
    if (status === 'no_show') {
      const conversation = await findConversationWaitingOn(su, appointment, now)
      if (!conversation) return
      await transition(su, conversation.id, 'COMPLETED', {
        actor: 'staff',
        reason: 'appointment_no_show',
        extraFields: { status: 'closed', is_staff_called: false, staff_call_reason: 'no_show' },
      })
      return
    }
    // A finished session waits for its close-out (the lifecycle moves the conversation); a finished
    // consultation hands the conversation back to the bot to book the tattoo.
    if (!isConsultation(appointment)) return
    const advance = await planConversationAdvance(su, appointment, { upcomingAfter: now, reason: 'sketch_completed_loop_to_tattoo' })
    if (advance) await applyConversationAdvance(su, advance, 'staff')
  } catch (err) {
    console.error(`[appointments] moving the conversation after ${status} of ${appointment.id} failed:`, err)
  }
}

export async function retrySyncAppointmentToGoogleHandler(appointmentId: string) {
  await requireAuth()
  await syncAppointmentToGoogle(appointmentId)
  const su = await getSuperuserClient()
  const record = await su.collection('appointments').getOne(appointmentId).catch(() => null)
  return {
    ok: record?.google_sync_status === 'synced',
    syncStatus: record?.google_sync_status || null,
  }
}

export interface SendPriceQuoteServerInput {
  appointmentId: string
  priceMinIls: number
  priceMaxIls: number
  depositAmount: number
  durationMinutes?: number
  date?: string
  timeSlot?: string
  /** The artist's estimate of how many sessions the tattoo takes; null = not known yet. Defaults to 1. */
  estimatedSessions?: number | null
}

export async function sendPriceQuoteToCustomerHandler(data: SendPriceQuoteServerInput) {
  await requireAuth()
  const su = await getSuperuserClient()

  const appointment = await su.collection('appointments').getOne(data.appointmentId, { expand: 'customer,staff' })
  const customer = appointment.expand?.customer as
    | { id: string; phone?: string; health_declaration_signed?: boolean; health_declaration_date?: string }
    | undefined
  if (!customer?.phone) throw new Error('לתור הזה אין לקוח עם מספר טלפון תקין.')

  const conversation = await su.collection('conversations')
    .getFirstListItem(`customer = "${customer.id}"`)
    .catch(() => null)
  const windowExpiresAt = conversation?.whatsapp_window_expires_at as string | undefined
  if (windowExpiresAt && new Date(windowExpiresAt).getTime() < Date.now()) {
    throw new Error('חלון 24 השעות של וואטסאפ נסגר — אי אפשר לשלוח הצעת מחיר עד שהלקוח יכתוב שוב. אפשר להתקשר אליו או להמתין להודעה ממנו.')
  }

  let start = new Date(appointment.start_time as string)
  if (data.date && data.timeSlot) {
    const availability = await checkAvailabilityForBot(su, {
      staffId: (appointment.staff as string) || '',
      date: data.date,
      timeSlot: data.timeSlot,
      durationHours: (Number(appointment.duration_minutes) || 120) / 60,
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

  const isSketch =
    appointment.type === 'sketch' ||
    (!appointment.type && Number(appointment.duration_minutes) <= 45)
  const staffRecord = appointment.expand?.staff as { name?: string } | undefined
  const staffName = staffRecord?.name || ''
  const effectiveDurationMinutes = data.durationMinutes ?? (Number(appointment.duration_minutes) || (isSketch ? 30 : 120))

  if (appointment.status === 'confirmed' || conversation?.state === 'AWAITING_APPOINTMENT') {
    throw new Error('התור כבר אושר ונסגר ביומן. לא ניתן לשלוח הצעת מחיר ראשונית לתור סגור.')
  }

  if (!isSketch && (!data.priceMinIls || data.priceMinIls <= 0 || !data.priceMaxIls || data.priceMaxIls <= 0)) {
    throw new Error('יש להזין טווח מחירים תקין (גבוה מ-0) עבור תור לקעקוע.')
  }

  await su.collection('appointments').update(data.appointmentId, {
    ...(isSketch ? { type: 'sketch' } : {}),
    price_min: isSketch ? null : data.priceMinIls,
    price_max: isSketch ? null : data.priceMaxIls,
    deposit_amount: data.depositAmount,
    start_time: start.toISOString(),
    ...changeAttribution('staff', 'price_quote_slot'),
    ...(data.durationMinutes != null ? { duration_minutes: data.durationMinutes } : {}),
  })

  const waSettings = await getWhatsAppSettings()
  if (!waSettings?.phoneNumberId || !waSettings.accessToken) {
    throw new Error('וואטסאפ אינו מוגדר. יש להזין פרטי חיבור בהגדרות.')
  }
  const policy = await getStudioPolicyForBot(su)
  const waClient = createWhatsAppClient({
    phoneNumberId: waSettings.phoneNumberId,
    accessToken: waSettings.accessToken,
  })

  const dayName = HEBREW_DAYS_LONG[start.getDay()]
  const timeFormatted = minutesToTime(start.getHours() * 60 + start.getMinutes())
  const dateFormatted = `${start.getDate()}.${start.getMonth() + 1}`

  const cancellationPolicyText = customerCancellationPolicyText(policy.cancellationCutoffHours ?? 48)
  const isHealthValid = Boolean(
    customer?.health_declaration_signed &&
    isHealthDeclarationValid(customer?.health_declaration_date, policy.healthDeclarationValidityMonths ?? 6)
  )
  const needsHealthDeclaration = !isHealthValid
  const healthFormUrl =
    policy.healthDeclarationFormUrl?.trim() ||
    process.env.HEALTH_DECLARATION_URL?.trim() ||
    ''

  if (needsHealthDeclaration && !healthFormUrl) {
    throw new Error('טרם הוגדר קישור לטופס הצהרת בריאות בהגדרות הסטודיו (הגדרות מדיניות ותפעול).')
  }

  // Decided before anything is sent: if the conversation can't take this step, nothing goes out.
  const target = quoteTargetState({ isSketch, hasDeposit: data.depositAmount != null && data.depositAmount > 0, isHealthValid })
  if (conversation && !canTransition(toConversationState(conversation.state), target.state, 'staff')) {
    throw new Error('השיחה עם הלקוח נמצאת בשלב שלא מאפשר לשלוח הצעת מחיר. ההודעה לא נשלחה. בדקו את השיחה (אפשר לאפס את שיחת הבוט) ונסו שוב.')
  }

  const projectPolicy = await loadProjectPolicy(su)
  // Not sent (an older caller) = one session; null = the artist doesn't know yet.
  const estimatedSessions = isSketch ? null : data.estimatedSessions === undefined ? 1 : data.estimatedSessions
  const messageBody = buildPriceQuoteMessage({
    isSketch,
    needsHealthDeclaration,
    when: `${dayName}, ${dateFormatted} בשעה ${timeFormatted}`,
    staffName,
    durationLabel: formatDurationHebrew(effectiveDurationMinutes),
    priceMin: data.priceMinIls,
    priceMax: data.priceMaxIls,
    depositAmount: data.depositAmount,
    estimatedSessions,
    healingPeriodDays: projectPolicy.healingPeriodDays,
    depositPerSession: projectPolicy.depositPerSession,
    paymentInstructions: policy.paymentInstructions ?? null,
    cancellationPolicyText,
    healthFormUrl,
  })

  let wamid: string
  try {
    ;({ wamid } = await waClient.sendText({ to: customer.phone, body: messageBody }))
  } catch (err) {
    if (err instanceof WhatsAppApiError && err.code === ERROR_REENGAGEMENT_REQUIRED) {
      throw new Error('החלון של 24 שעות פג — יש לחכות להודעה חדשה מהלקוח לפני שליחת הצעת מחיר.')
    }
    throw new Error(err instanceof WhatsAppApiError ? `שליחת הצעת המחיר נכשלה: ${err.message}` : 'שליחת הצעת המחיר נכשלה.')
  }

  const now = new Date()
  const nowIso = now.toISOString()
  // The quote belongs to the project (it moves the funnel to "quoted"); recorded only once the
  // message went out. A consultation's details aren't a price quote.
  if (!isSketch && appointment.project) {
    await recordProjectQuote(su, appointment.project as string, { min: data.priceMinIls, max: data.priceMaxIls, estimatedSessions: data.estimatedSessions }, now).catch((err: unknown) =>
      console.error(`[price-quote] recording the quote on project ${String(appointment.project)} failed:`, err),
    )
  }
  if (conversation) {
    cancelPendingBotTurn(conversation.id)
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

    const targetState = target.state
    const reason = target.reason
    if (targetState === 'AWAITING_APPOINTMENT') {
      await su.collection('appointments').update(data.appointmentId, {
        ...statusChange('confirmed', 'staff', 'free_sketch_quote_confirmed'),
        slot_confirmed: true,
      })
    }

    const nextStatus = targetState === 'AWAIT_PAYMENT' ? 'staff_handling' : 'bot_active'

    await transition(su, conversation.id, targetState, {
      actor: 'staff',
      reason,
      extraFields: {
        last_message_at: nowIso,
        status: nextStatus,
        is_staff_called: false,
        staff_call_reason: '',
        // The bot's next steps (payment, the next hold) belong to the quoted appointment's project.
        ...(appointment.project ? { active_project: appointment.project } : {}),
      },
    })
  }

  return { ok: true }
}

export async function confirmSlotHandler(appointmentId: string) {
  await requireAuth()
  const su = await getSuperuserClient()
  const appt = await su.collection('appointments').getOne(appointmentId).catch(() => null)
  if (!appt) throw new Error('תור לא נמצא.')

  let conv = null
  if (appt.customer) {
    conv = await su.collection('conversations')
      .getFirstListItem(`customer = "${appt.customer}"`)
      .catch(() => null)
    if (conv) {
      cancelPendingBotTurn(conv.id)
    }
  }

  await su.collection('appointments').update(appointmentId, {
    ...statusChange('confirmed', 'staff', 'confirm_slot'),
    slot_confirmed: true,
  })

  try {
    await syncAppointmentToGoogle(appointmentId)
  } catch (syncErr) {
    console.error('[confirmSlotHandler] Google sync failed:', syncErr)
  }

  if (conv) {
    await transition(su, conv.id, 'AWAITING_APPOINTMENT', {
      actor: 'staff',
      reason: 'confirmSlot_staff_final_lock',
      extraFields: {
        status: 'bot_active',
        is_staff_called: false,
        staff_call_reason: '',
      },
    })
  }

  return { ok: true }
}

