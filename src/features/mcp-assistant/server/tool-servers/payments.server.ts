import { z } from 'zod'
import { getSuperuserClient } from '@/integrations/pocketbase/superuser.server'
import { toYmd, minutesToTime } from '@/lib/date-utils'
import { mcpReadTool } from './shared'

const ACTIVE_STATUSES = '(status = "pending" || status = "confirmed")'

export function buildPaymentsTools() {
  return {
    list_unpaid_deposits: mcpReadTool(
      'מציג תורים ופרויקטים פעילים (ממתינים/מאושרים) שעדיין לא שולמה או אומתה עבורם מקדמה, בטווח תאריכים אופציונלי.',
      z.object({
        fromDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().describe('תאריך התחלה YYYY-MM-DD'),
        toDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().describe('תאריך סיום YYYY-MM-DD'),
      }),
      async ({ fromDate, toDate }) => {
        const su = await getSuperuserClient()
        const rangeFilter =
          fromDate && toDate
            ? ` && start_time >= "${new Date(`${fromDate}T00:00:00`).toISOString()}" && start_time <= "${new Date(`${toDate}T23:59:59`).toISOString()}"`
            : ''
        const records = await su.collection('appointments').getFullList({
          filter: `${ACTIVE_STATUSES} && deposit_paid = false${rangeFilter}`,
          expand: 'customer,project',
          sort: 'start_time',
        })
        const unpaid = records.filter((item) => !item.deposit_paid)
        const items = unpaid.map((item) => {
          const d = new Date(item.start_time as string)
          const project = item.expand?.project as Record<string, unknown> | undefined
          return {
            appointmentId: item.id,
            customerName: (item.expand?.customer?.name as string) || 'לקוח ללא שם',
            customerId: item.customer as string,
            projectId: (item.project as string) || null,
            projectTitle: (project?.title as string) || null,
            date: toYmd(d),
            timeSlot: minutesToTime(d.getHours() * 60 + d.getMinutes()),
            depositAmount: item.deposit_amount != null ? Number(item.deposit_amount) : null,
          }
        })
        return { status: 'success', message: `נמצאו ${items.length} תורים ללא מקדמה מאומתת.`, data: items }
      },
    ),

    list_payments: mcpReadTool(
      'מציג את ספר התקבולים של הסטודיו (מקדמות, תשלומים רגילים והחזרים) מתוך ledger התשלומים, בטווח תאריכים אופציונלי.',
      z.object({
        fromDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().describe('תאריך התחלה YYYY-MM-DD'),
        toDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().describe('תאריך סיום YYYY-MM-DD'),
        kind: z.enum(['deposit', 'payment', 'refund', 'all']).default('all').optional().describe('סוג התקבול'),
        method: z.enum(['bit', 'paybox', 'cash', 'credit_card', 'bank_transfer', 'other', 'all']).default('all').optional(),
        status: z.enum(['verified', 'pending_verification', 'rejected', 'voided', 'all']).default('verified').optional(),
      }),
      async ({ fromDate, toDate, kind = 'all', method = 'all', status = 'verified' }) => {
        const su = await getSuperuserClient()

        const filterParts: string[] = []
        if (status && status !== 'all') {
          filterParts.push(`status = "${status}"`)
        }
        if (kind && kind !== 'all') {
          filterParts.push(`kind = "${kind}"`)
        }
        if (method && method !== 'all') {
          filterParts.push(`method = "${method}"`)
        }

        const dateFilter =
          fromDate && toDate
            ? `(received_at >= "${new Date(`${fromDate}T00:00:00`).toISOString()}" && received_at <= "${new Date(`${toDate}T23:59:59`).toISOString()}")`
            : ''
        if (dateFilter) filterParts.push(dateFilter)

        const filter = filterParts.length > 0 ? filterParts.join(' && ') : ''

        // Query payments collection
        const paymentRecords = await su
          .collection('payments')
          .getFullList({
            filter: filter || undefined,
            expand: 'project.customer,appointment',
            sort: '-received_at',
          })
          .catch(() => [])

        // If payments records exist, map from payments ledger
        if (paymentRecords.length > 0) {
          let totalCollected = 0
          let totalRefunded = 0

          const items = paymentRecords.map((item) => {
            const project = item.expand?.project as (Record<string, unknown> & { expand?: { customer?: Record<string, unknown> } }) | undefined
            const customer = project?.expand?.customer
            const amount = Number(item.amount) || 0

            if (item.status === 'verified') {
              if (item.kind === 'refund') {
                totalRefunded += amount
              } else {
                totalCollected += amount
              }
            }

            const d = item.received_at ? new Date(item.received_at as string) : new Date(item.created as string)
            return {
              paymentId: item.id,
              projectId: (item.project as string) || null,
              projectTitle: (project?.title as string) || 'פרויקט כללי',
              customerId: (customer?.id as string) || null,
              customerName: (customer?.name as string) || 'לקוח ללא שם',
              appointmentId: (item.appointment as string) || null,
              kind: item.kind as string,
              method: item.method as string,
              amount,
              status: item.status as string,
              receivedAt: toYmd(d),
              receiptUrl: (item.receipt_url as string) || null,
              note: (item.note as string) || null,
            }
          })

          const netTotal = totalCollected - totalRefunded
          return {
            status: 'success',
            message: `נמצאו ${items.length} תקבולים בספר התשלומים · סה"כ נגבה ₪${totalCollected}, החזרים ₪${totalRefunded} (נטו: ₪${netTotal}).`,
            data: {
              items,
              summary: {
                totalCollected,
                totalRefunded,
                netTotal,
                count: items.length,
              },
            },
          }
        }

        // Fallback to appointments if payments table is empty (e.g. legacy data)
        const apptRangeFilter =
          fromDate && toDate
            ? ` && start_time >= "${new Date(`${fromDate}T00:00:00`).toISOString()}" && start_time <= "${new Date(`${toDate}T23:59:59`).toISOString()}"`
            : ''
        const apptRecords = await su.collection('appointments').getFullList({
          filter: `deposit_paid = true${apptRangeFilter}`,
          expand: 'customer',
          sort: 'start_time',
        })

        const paid = apptRecords.filter((item) => Boolean(item.deposit_paid))
        const items = paid.map((item) => {
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
