import { z } from 'zod'
import { getSuperuserClient } from '@/integrations/pocketbase/superuser.server'
import { mcpReadTool } from './shared'

export function buildAnalyticsTools() {
  return {
    get_business_summary: mcpReadTool(
      'מציג סיכום עסקי לטווח תאריכים: הכנסות (סכום מקדמות ששולמו), מספר תורים לפי סטטוס, ואחוז אי-הגעות.',
      z.object({
        fromDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        toDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      }),
      async ({ fromDate, toDate }) => {
        const su = await getSuperuserClient()
        const rangeFilter = `start_time >= "${new Date(`${fromDate}T00:00:00`).toISOString()}" && start_time <= "${new Date(`${toDate}T23:59:59`).toISOString()}"`
        const records = await su.collection('appointments').getFullList({ filter: rangeFilter })

        const countsByStatus: Record<string, number> = {}
        // Revenue = sum of paid deposits in range. Full price totals aren't counted here since
        // `price_min`/`price_max` is a range the artist quotes, not a collected amount — the only
        // amount actually known to have changed hands is a paid deposit.
        let revenue = 0
        for (const item of records) {
          const status = (item.status as string) || 'pending'
          countsByStatus[status] = (countsByStatus[status] || 0) + 1
          if (item.deposit_paid) revenue += Number(item.deposit_amount) || 0
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
            noShowRatePercent: noShowRate,
          },
        }
      },
    ),
  }
}
