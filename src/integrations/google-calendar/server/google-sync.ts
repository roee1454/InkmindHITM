import type { RecordModel } from 'pocketbase'
import { getSuperuserClient } from '@/integrations/pocketbase/superuser.server'
import {
  createGoogleCalendarEvent,
  updateGoogleCalendarEvent,
  deleteGoogleCalendarEvent,
  type CalendarEventInput,
} from './google-auth'

const FALLBACK_NAME = 'לקוח'

function buildEventInput(data: {
  date: string
  timeSlot: string
  durationHours: number
  leadName?: string | null
  leadPhone?: string | null
  tattooDescription?: string | null
  priceIls?: number | null
  notes?: string | null
}): CalendarEventInput {
  const [yearStr, monthStr, dayStr] = data.date.split('-')
  const [hourStr, minuteStr] = (data.timeSlot || '12:00').split(':')

  const year = Number(yearStr) || new Date().getFullYear()
  const month = Number(monthStr) || 1
  const day = Number(dayStr) || 1
  const hour = Number(hourStr) || 0
  const minute = Number(minuteStr) || 0

  const start = new Date(year, month - 1, day, hour, minute, 0)
  const duration = data.durationHours || 2
  const end = new Date(start.getTime() + duration * 3600_000)

  const name = data.leadName || FALLBACK_NAME
  const descriptionLines = [
    data.leadPhone ? `טלפון: ${data.leadPhone}` : null,
    data.tattooDescription ? `תיאור: ${data.tattooDescription}` : null,
    data.priceIls != null ? `מחיר: ${data.priceIls} ₪` : null,
    data.durationHours ? `משך: ${data.durationHours} שעות` : null,
    data.notes ? `הערות: ${data.notes}` : null,
  ].filter((line): line is string => line !== null)

  return {
    title: `${name} — תור קעקוע`,
    startsAt: start.toISOString(),
    endsAt: end.toISOString(),
    description: descriptionLines.join('\n'),
  }
}

export async function syncAppointmentToGoogle(appointmentId: string): Promise<void> {
  try {
    const su = await getSuperuserClient()
    const record = await su.collection('appointments').getOne(appointmentId, { expand: 'customer' })
    if (!record) return

    const customer = record.expand?.customer as RecordModel | undefined
    const staffId = (record.staff as string) || null
    const status = record.status as string
    const depositPaid = Boolean(record.deposit_paid)
    const existingGoogleEventId = (record.google_event_id as string) || null

    const leadName = (customer?.name as string) || (record.customer_name_override as string) || null
    const leadPhone = (customer?.phone as string) || (record.customer_phone_override as string) || null

    const shouldSync = Boolean(staffId && status === 'confirmed' && depositPaid)

    if (shouldSync && staffId) {
      const d = new Date(record.start_time)
      const pad = (n: number) => String(n).padStart(2, '0')
      const dateStr = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
      const timeSlotStr = `${pad(d.getHours())}:${pad(d.getMinutes())}`

      const input = buildEventInput({
        date: dateStr,
        timeSlot: timeSlotStr,
        durationHours: Number(record.duration_minutes || 120) / 60,
        leadName,
        leadPhone,
        tattooDescription: (record.tattoo_description as string) || null,
        priceIls: record.price_max != null ? Number(record.price_max) : record.price_min != null ? Number(record.price_min) : null,
        notes: (record.notes as string) || null,
      })

      if (existingGoogleEventId) {
        try {
          await updateGoogleCalendarEvent(staffId, existingGoogleEventId, input)
          await su.collection('appointments').update(record.id, { google_sync_status: 'synced' })
        } catch (err) {
          console.error('[google-sync] Error updating Google event:', err)
          try {
            const newEventId = await createGoogleCalendarEvent(staffId, input)
            await su.collection('appointments').update(record.id, {
              google_event_id: newEventId,
              google_sync_status: 'synced',
            })
          } catch (recreateErr) {
            console.error('[google-sync] Error recreating Google event:', recreateErr)
          }
        }
      } else {
        try {
          const newEventId = await createGoogleCalendarEvent(staffId, input)
          await su.collection('appointments').update(record.id, {
            google_event_id: newEventId,
            google_sync_status: 'synced',
          })
        } catch (createErr) {
          console.error('[google-sync] Error creating Google event:', createErr)
        }
      }
    } else {
      if (existingGoogleEventId && staffId) {
        try {
          await deleteGoogleCalendarEvent(staffId, existingGoogleEventId)
        } catch (err) {
          console.error('[google-sync] Error deleting Google event:', err)
        }
        await su.collection('appointments').update(record.id, {
          google_event_id: null,
          google_sync_status: null,
        })
      }
    }
  } catch (err) {
    console.error('[google-sync] syncAppointmentToGoogle unexpected error:', err)
  }
}

export async function deleteSyncedAppointmentFromGoogle(record: RecordModel): Promise<void> {
  const staffId = (record.staff as string) || null
  const googleEventId = (record.google_event_id as string) || null

  if (staffId && googleEventId) {
    try {
      await deleteGoogleCalendarEvent(staffId, googleEventId)
    } catch (err) {
      console.error('[google-sync] Error deleting Google event on appointment removal:', err)
    }
  }
}

export async function syncAllConfirmedAppointmentsForStaff(staffId: string): Promise<void> {
  try {
    const su = await getSuperuserClient()
    const records = await su.collection('appointments').getFullList({
      filter: `staff = "${staffId}" && status = "confirmed" && deposit_paid = true`,
    })

    for (const record of records) {
      if (!record.google_event_id) {
        await syncAppointmentToGoogle(record.id)
      }
    }
  } catch (err) {
    console.error('[google-sync] syncAllConfirmedAppointmentsForStaff error:', err)
  }
}

export async function cleanupStaffGoogleCalendarEvents(staffId: string): Promise<void> {
  try {
    const su = await getSuperuserClient()
    const records = await su.collection('appointments').getFullList({
      filter: `staff = "${staffId}" && google_event_id != ""`,
    })

    for (const record of records) {
      if (record.google_event_id) {
        try {
          await deleteGoogleCalendarEvent(staffId, record.google_event_id as string)
        } catch (err) {
          console.error('[google-sync] Error deleting Google event on disconnect cleanup:', err)
        }
        await su.collection('appointments').update(record.id, {
          google_event_id: null,
          google_sync_status: null,
        })
      }
    }
  } catch (err) {
    console.error('[google-sync] cleanupStaffGoogleCalendarEvents error:', err)
  }
}
