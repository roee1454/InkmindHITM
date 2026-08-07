import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { getSuperuserClient } from '@/integrations/pocketbase/superuser.server'
import { requireAuth, requireAdmin } from './helpers.server'
import { fetchJewishHolidays } from '@/integrations/hebcal/hebcal.server'
import type { HebcalHoliday } from '@/integrations/hebcal/hebcal.server'
import { matchClosureForDate } from '@/lib/closures'

export interface StudioClosure {
  id: string
  date: string
  reason: string | null
  isRecurring: boolean
  source: 'manual' | 'hebcal'
}

function toDateOnly(raw: string): string {
  return raw.includes('T') ? (raw.split('T')[0] ?? raw) : raw
}

export const getStudioClosures = createServerFn({ method: 'GET' }).handler(
  async (): Promise<StudioClosure[]> => {
    await requireAuth()
    const su = await getSuperuserClient()
    const list = await su.collection('studio_closures').getFullList({ sort: 'date' })

    return list.map((item) => ({
      id: item.id,
      date: toDateOnly((item.date as string) || ''),
      reason: (item.reason as string) || null,
      isRecurring: Boolean(item.is_recurring),
      source: item.source === 'hebcal' ? 'hebcal' : 'manual',
    }))
  },
)

const addClosureSchema = z.object({
  date: z.string().min(1, 'תאריך חובה'),
  reason: z.string().optional(),
  isRecurring: z.boolean().default(false),
  source: z.enum(['manual', 'hebcal']).default('manual'),
})

export const addStudioClosure = createServerFn({ method: 'POST' })
  .validator(addClosureSchema)
  .handler(async ({ data }) => {
    await requireAdmin()
    const su = await getSuperuserClient()
    const created = await su.collection('studio_closures').create({
      date: data.date,
      reason: data.reason || '',
      is_recurring: data.isRecurring,
      source: data.source,
    })
    return {
      id: created.id,
      date: toDateOnly(created.date as string),
      reason: (created.reason as string) || null,
      isRecurring: Boolean(created.is_recurring),
      source: created.source === 'hebcal' ? 'hebcal' : 'manual',
    }
  })

export const deleteStudioClosure = createServerFn({ method: 'POST' })
  .validator(z.object({ id: z.string() }))
  .handler(async ({ data }) => {
    await requireAdmin()
    const su = await getSuperuserClient()
    await su.collection('studio_closures').delete(data.id)
    return { ok: true }
  })

/** Read-only pass-through for the Add-closure modal's Hebcal holiday picker. */
export const getHebcalHolidays = createServerFn({ method: 'GET' })
  .validator(z.object({ year: z.number().int() }))
  .handler(async ({ data }): Promise<HebcalHoliday[]> => {
    await requireAuth()
    return fetchJewishHolidays(data.year)
  })

/**
 * Checks whether the studio is closed on a given date — recurring closures match on month/day
 * regardless of year; one-time closures match the exact date. Used by both the AI booking flow
 * (bot-appointments.ts) and staff-side manual booking (use-working-hours-check.ts) so closures
 * actually block bookings instead of being pure decoration.
 */
export async function isStudioClosedOn(
  su: Awaited<ReturnType<typeof getSuperuserClient>>,
  dateStr: string,
): Promise<{ closed: boolean; reason: string | null }> {
  const list = await su.collection('studio_closures').getFullList()
  const closures = list
    .map((item) => ({
      date: toDateOnly((item.date as string) || ''),
      reason: (item.reason as string) || null,
      isRecurring: Boolean(item.is_recurring),
    }))
    .filter((c) => c.date)

  return matchClosureForDate(closures, dateStr)
}
