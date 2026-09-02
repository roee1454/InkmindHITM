import { z } from 'zod'
import { getSuperuserClient } from '@/integrations/pocketbase/superuser.server'
import { getActiveAppointmentForBot } from '@/features/calendar/server/bot-appointments'
import { createWhatsAppClient, WhatsAppApiError, ERROR_REENGAGEMENT_REQUIRED } from '@/integrations/whatsapp-cloud-api/client'
import { getWhatsAppSettings } from '@/integrations/whatsapp-cloud-api/settings.server'
import { toYmd, minutesToTime } from '@/lib/date-utils'
import { mcpReadTool, mcpWriteTool } from './shared'
import type { McpToolContext } from './shared'
import type { McpActionDiff } from '../types'

const WAITLIST_STATUS_LABELS: Record<string, string> = {
  watching: 'ממתין/ה למשבצת מוקדמת',
  offered: 'הוצעה משבצת — ממתין לתשובה',
  customer_accepted: 'הלקוח/ה אישר/ה',
  customer_declined: 'הלקוח/ה דחה/תה',
  booked: 'נקבע תור',
  cancelled: 'הוסר/ה מהרשימה',
  expired: 'פג תוקף',
}

export function buildWaitlistTools(ctx: McpToolContext) {
  return {
    add_to_waitlist: mcpWriteTool(
      ctx,
      'add_to_waitlist',
      'מציע להוסיף לקוח/ה שיש לו/ה כבר תור, לרשימת המתנה למשבצת מוקדמת יותר. לעולם לא מוסיף מיד — רק מציג הצעה לאישור.',
      z.object({
        customerId: z.string(),
        preferredStaffId: z.string().optional().describe('אמן/ית מועדפ/ת — אם לא צוין, כל אמן/ית'),
        notBefore: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().describe('לא לפני תאריך זה — ברירת מחדל היום'),
      }),
      async ({ customerId, notBefore }) => {
        const su = await getSuperuserClient()
        const customer = await su.collection('customers').getOne(customerId)
        const activeAppointment = await getActiveAppointmentForBot(su, customerId)
        if (!activeAppointment) throw new Error('ללקוח/ה הזה/ו אין תור פעיל כרגע — אי אפשר להוסיף לרשימת המתנה למועד מוקדם יותר.')
        const start = new Date(activeAppointment.start_time as string)
        return {
          summary: `הוספה לרשימת המתנה — ${(customer.name as string) || customer.phone}`,
          rows: [
            {
              label: (customer.name as string) || (customer.phone as string) || 'לקוח',
              before: `תור קיים: ${toYmd(start)} ${minutesToTime(start.getHours() * 60 + start.getMinutes())}`,
              after: `ברשימת המתנה למועד מוקדם יותר${notBefore ? ` (מ-${notBefore})` : ''}`,
            },
          ],
        } satisfies McpActionDiff
      },
    ),

    list_waitlist: mcpReadTool(
      'מציג את רשימת ההמתנה למשבצות מוקדמות יותר, עם אפשרות סינון לפי סטטוס.',
      z.object({
        status: z.enum(['watching', 'offered', 'customer_accepted', 'customer_declined', 'booked', 'cancelled', 'expired']).optional(),
      }),
      async ({ status }) => {
        const su = await getSuperuserClient()
        const filter = status ? `status = "${status}"` : ''
        const entries = await su.collection('waitlist_entries').getFullList({
          filter,
          expand: 'customer,current_appointment',
          sort: '-created',
        })
        return {
          status: 'success',
          message: `נמצאו ${entries.length} רשומות ברשימת ההמתנה.`,
          data: entries.map((entry) => {
            const customer = entry.expand?.customer
            const appointment = entry.expand?.current_appointment
            const start = appointment ? new Date(appointment.start_time as string) : null
            return {
              id: entry.id,
              customerName: (customer?.name as string) || (customer?.phone as string) || null,
              currentAppointment: start
                ? `${toYmd(start)} ${minutesToTime(start.getHours() * 60 + start.getMinutes())}`
                : null,
              status: entry.status,
              statusLabel: WAITLIST_STATUS_LABELS[entry.status as string] || entry.status,
            }
          }),
        }
      },
    ),

    remove_from_waitlist: mcpWriteTool(
      ctx,
      'remove_from_waitlist',
      'מציע להסיר לקוח/ה מרשימת ההמתנה למועד מוקדם יותר. לעולם לא מסיר מיד — רק מציג הצעה לאישור.',
      z.object({ waitlistEntryId: z.string() }),
      async ({ waitlistEntryId }) => {
        const su = await getSuperuserClient()
        const entry = await su.collection('waitlist_entries').getOne(waitlistEntryId, { expand: 'customer' })
        const customerName = (entry.expand?.customer?.name as string) || 'לקוח'
        return {
          summary: `הסרה מרשימת ההמתנה — ${customerName}`,
          rows: [{ label: customerName, before: WAITLIST_STATUS_LABELS[entry.status as string] || entry.status, after: 'הוסר/ה' }],
        } satisfies McpActionDiff
      },
    ),

    // Deliberately `mcpReadTool`, not `mcpWriteTool` — this only records what staff already told
    // the assistant in plain language (the customer's own yes/no, relayed by staff), so it has no
    // independent side effect worth gating behind another approval card. Its *consequences*
    // (booking, or offering the next candidate) each go through their own normal write-tool/
    // approval flow. A deliberate, narrow exception to "every write proposes."
    record_waitlist_response: mcpReadTool(
      'רושם את תשובת הלקוח/ה (שהבעלים דיווח/ה עליה בצ׳אט) להצעת משבצת מוקדמת יותר — האם אישר/ה או דחה/תה.',
      z.object({
        waitlistEntryId: z.string(),
        customerAccepted: z.boolean(),
      }),
      async ({ waitlistEntryId, customerAccepted }) => {
        const su = await getSuperuserClient()
        const entry = await su
          .collection('waitlist_entries')
          .getOne(waitlistEntryId, { expand: 'customer,current_appointment,offered_appointment' })
        const customerName = (entry.expand?.customer?.name as string) || 'לקוח'
        const offered = entry.expand?.offered_appointment

        if (customerAccepted) {
          await su.collection('waitlist_entries').update(waitlistEntryId, { status: 'customer_accepted' })
          if (!offered) return { status: 'error', message: 'לא נמצאה משבצת מוצעת פעילה עבור רשומה זו.' }
          const start = new Date(offered.start_time as string)
          return {
            status: 'success',
            message:
              `${customerName} אישר/ה. יש להשתמש בכלי create_appointment כדי להציע ליצור עבור ${customerName} תור חדש ` +
              `בתאריך ${toYmd(start)} שעה ${minutesToTime(start.getHours() * 60 + start.getMinutes())} ` +
              `(משך ${offered.duration_minutes} דק', אצל staffId "${offered.staff}", customerId "${entry.customer}") — ` +
              `זהו האישור הסופי שהבעלים צריכ/ה לתת לפני שהתור נקבע בפועל. אחרי אישור התור, יש להשתמש ב-remove_from_waitlist כדי לסגור את רשומת ההמתנה.`,
            data: {
              customerId: entry.customer,
              staffId: offered.staff,
              date: toYmd(start),
              timeSlot: minutesToTime(start.getHours() * 60 + start.getMinutes()),
              durationMinutes: offered.duration_minutes,
            },
          }
        }

        await su.collection('waitlist_entries').update(waitlistEntryId, { status: 'customer_declined', offered_appointment: null })
        if (!offered) {
          return { status: 'success', message: `${customerName} דחה/תה את ההצעה.` }
        }
        // Dynamic import to break a cycle: waitlist-matcher.ts imports `createPendingAction`
        // from approval.ts, which imports `commitWaitlistAction` from *this* file.
        const { runWaitlistMatching } = await import('../waitlist-matcher')
        await runWaitlistMatching({
          id: offered.id as string,
          staff: offered.staff as string,
          startTime: offered.start_time as string,
          durationMinutes: Number(offered.duration_minutes) || 120,
        })
        return {
          status: 'success',
          message: `${customerName} דחה/תה את ההצעה. אם נמצא/ה עוד לקוח/ה מתאימ/ה ברשימת ההמתנה, נפתחה עבורו/ה הצעה חדשה בשיחה נפרדת. אם הבעלים מבקש/ת להפסיק להציע את המשבצת הזו, אין צורך בפעולה נוספת.`,
        }
      },
    ),
  }
}

/** The only place `add_to_waitlist`/`remove_from_waitlist` actually mutate `waitlist_entries`,
 *  and where the autonomously-created `offer_waitlist_slot` action (see `waitlist-matcher.ts`)
 *  actually sends the WhatsApp question once staff approves it. */
export async function commitWaitlistAction(toolName: string, args: Record<string, unknown>): Promise<string> {
  const su = await getSuperuserClient()

  if (toolName === 'add_to_waitlist') {
    const { customerId, preferredStaffId, notBefore } = args as {
      customerId: string
      preferredStaffId?: string
      notBefore?: string
    }
    const activeAppointment = await getActiveAppointmentForBot(su, customerId)
    if (!activeAppointment) throw new Error('ללקוח/ה הזה/ו אין תור פעיל כרגע.')
    await su.collection('waitlist_entries').create({
      customer: customerId,
      current_appointment: activeAppointment.id,
      preferred_staff: preferredStaffId || null,
      not_before: notBefore ? new Date(`${notBefore}T00:00:00`).toISOString() : null,
      status: 'watching',
      source: 'staff_manual',
    })
    return 'הלקוח/ה נוסף/ה לרשימת ההמתנה.'
  }

  if (toolName === 'remove_from_waitlist') {
    const { waitlistEntryId } = args as { waitlistEntryId: string }
    await su.collection('waitlist_entries').update(waitlistEntryId, { status: 'cancelled', offered_appointment: null })
    return 'הוסר/ה מרשימת ההמתנה.'
  }

  if (toolName === 'offer_waitlist_slot') {
    const { waitlistEntryId } = args as { waitlistEntryId: string; freedAppointmentId: string }
    const entry = await su.collection('waitlist_entries').getOne(waitlistEntryId, { expand: 'customer,offered_appointment' })
    const customer = entry.expand?.customer
    const offered = entry.expand?.offered_appointment
    if (!customer?.phone) throw new Error('ללקוח/ה הזה/ו אין מספר טלפון שמור.')
    if (!offered) throw new Error('המשבצת המוצעת כבר אינה זמינה.')
    const waSettings = await getWhatsAppSettings()
    if (!waSettings?.phoneNumberId || !waSettings.accessToken) {
      throw new Error('הוואטסאפ של הסטודיו אינו מחובר — לא ניתן לשלוח הודעה כרגע.')
    }
    const start = new Date(offered.start_time as string)
    const text = `היי! התפנתה אצלנו משבצת ב-${toYmd(start)} בשעה ${minutesToTime(start.getHours() * 60 + start.getMinutes())} — מעוניינ/ת להעביר את התור שלך למועד הזה? תשמח/י לענות לנו כאן 🙂`
    const client = createWhatsAppClient({ phoneNumberId: waSettings.phoneNumberId, accessToken: waSettings.accessToken })
    try {
      await client.sendText({ to: customer.phone as string, body: text })
    } catch (error) {
      if (error instanceof WhatsAppApiError && error.code === ERROR_REENGAGEMENT_REQUIRED) {
        throw new Error('לא ניתן לשלוח הודעה — הלקוח/ה מחוץ לחלון 24 השעות של וואטסאפ. יש ליצור קשר בדרך אחרת.')
      }
      throw error
    }
    await su.collection('waitlist_entries').update(waitlistEntryId, { status: 'offered' })
    return 'ההודעה נשלחה ללקוח/ה בהצלחה.'
  }

  throw new Error(`Unknown waitlist action: ${toolName}`)
}

export const WAITLIST_WRITE_TOOLS = new Set(['add_to_waitlist', 'remove_from_waitlist', 'offer_waitlist_slot'])
