import { z } from 'zod'
import { getSuperuserClient } from '@/integrations/pocketbase/superuser.server'
import { mcpReadTool } from './shared'

export function buildAnalyticsTools() {
  return {
    get_business_summary: mcpReadTool(
      'מציג סיכום עסקי לטווח תאריכים: הכנסות בפועל מול לחיוב, מספר תורים לפי סטטוס, ואחוז אי-הגעות.',
      z.object({
        fromDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        toDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      }),
      async ({ fromDate, toDate }) => {
        const su = await getSuperuserClient()
        const rangeStart = `${fromDate}T00:00:00`
        const rangeEnd = `${toDate}T23:59:59`
        const rangeFilter = `start_time >= "${new Date(rangeStart).toISOString()}" && start_time <= "${new Date(rangeEnd).toISOString()}"`

        const [records, payments] = await Promise.all([
          su.collection('appointments').getFullList({ filter: rangeFilter }),
          su
            .collection('payments')
            .getFullList({
              filter: `status = "verified" && received_at >= "${new Date(rangeStart).toISOString()}" && received_at <= "${new Date(rangeEnd).toISOString()}"`,
            })
            .catch(() => []),
        ])

        const countsByStatus: Record<string, number> = {}
        let revenue = 0
        let billedRevenueIls = 0

        for (const item of records) {
          const status = (item.status as string) || 'pending'
          countsByStatus[status] = (countsByStatus[status] || 0) + 1
          if (item.deposit_paid) revenue += Number(item.deposit_amount) || 0
          if (item.status === 'completed' && item.final_price) {
            billedRevenueIls += Number(item.final_price) || 0
          }
        }

        let collectedRevenueIls = 0
        if (payments.length > 0) {
          for (const p of payments) {
            const amount = Number(p.amount) || 0
            if (p.kind === 'refund') {
              collectedRevenueIls -= amount
            } else {
              collectedRevenueIls += amount
            }
          }
        } else {
          // Fallback to deposit revenue if payments ledger has no records in range
          collectedRevenueIls = revenue
        }

        const resolvedCount = (countsByStatus.completed || 0) + (countsByStatus.no_show || 0)
        const noShowRate = resolvedCount > 0 ? Math.round(((countsByStatus.no_show || 0) / resolvedCount) * 100) : 0

        return {
          status: 'success',
          message: `סיכום עסקי מ-${fromDate} עד ${toDate}.`,
          data: {
            totalAppointments: records.length,
            countsByStatus,
            depositRevenueIls: revenue,
            collectedRevenueIls,
            billedRevenueIls,
            noShowRatePercent: noShowRate,
          },
        }
      },
    ),
  }
}
