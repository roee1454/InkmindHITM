import { z } from 'zod'
import { getSuperuserClient } from '@/integrations/pocketbase/superuser.server'
import { toYmd, minutesToTime } from '@/lib/date-utils'
import { mcpReadTool } from './shared'

// No separate `payments` collection exists — deposit tracking lives on `appointments`
// (`deposit_amount`/`deposit_paid`), so "unpaid deposits" is a filter over that table, not a
// new one. Read-only: refunds are manual (doc's explicit call).
const ACTIVE_STATUSES = '(status = "pending" || status = "confirmed")'

export function buildPaymentsTools() {
  return {
    list_unpaid_deposits: mcpReadTool(
      'מציג תורים פעילים (ממתינים/מאושרים) שעדיין לא שולמה עבורם מקדמה, בטווח תאריכים אופציונלי.',
      z.object({
        fromDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
        toDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
      }),
      async ({ fromDate, toDate }) => {
        const su = await getSuperuserClient()
        const rangeFilter =
          fromDate && toDate
            ? ` && start_time >= "${new Date(`${fromDate}T00:00:00`).toISOString()}" && start_time <= "${new Date(`${toDate}T23:59:59`).toISOString()}"`
            : ''
        const records = await su.collection('appointments').getFullList({
          filter: `${ACTIVE_STATUSES} && deposit_paid = false${rangeFilter}`,
          expand: 'customer',
          sort: 'start_time',
        })
        const items = records.map((item) => {
          const d = new Date(item.start_time as string)
          return {
            appointmentId: item.id,
            customerName: (item.expand?.customer?.name as string) || 'לקוח ללא שם',
            customerId: item.customer as string,
            date: toYmd(d),
            timeSlot: minutesToTime(d.getHours() * 60 + d.getMinutes()),
            depositAmount: item.deposit_amount != null ? Number(item.deposit_amount) : null,
          }
        })
        return { status: 'success', message: `נמצאו ${items.length} תורים ללא מקדמה.`, data: items }
      },
    ),

    list_payments: mcpReadTool(
      'מציג תורים ששולמה עבורם מקדמה, בטווח תאריכים אופציונלי — לסיכומי הכנסות.',
      z.object({
        fromDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
        toDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
      }),
      async ({ fromDate, toDate }) => {
        const su = await getSuperuserClient()
        const rangeFilter =
          fromDate && toDate
            ? ` && start_time >= "${new Date(`${fromDate}T00:00:00`).toISOString()}" && start_time <= "${new Date(`${toDate}T23:59:59`).toISOString()}"`
            : ''
        const records = await su.collection('appointments').getFullList({
          filter: `deposit_paid = true${rangeFilter}`,
          expand: 'customer',
          sort: 'start_time',
        })
        const items = records.map((item) => {
          const d = new Date(item.start_time as string)
          return {
            appointmentId: item.id,
            customerName: (item.expand?.customer?.name as string) || 'לקוח ללא שם',
            date: toYmd(d),
            depositAmount: item.deposit_amount != null ? Number(item.deposit_amount) : null,
            priceMin: item.price_min != null ? Number(item.price_min) : null,
            priceMax: item.price_max != null ? Number(item.price_max) : null,
          }
        })
        const total = items.reduce((sum, i) => sum + (i.depositAmount || 0), 0)
        return { status: 'success', message: `נמצאו ${items.length} תשלומים · סה"כ מקדמות ₪${total}.`, data: items }
      },
    ),
  }
}
