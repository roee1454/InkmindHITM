import { createServerFn } from '@tanstack/react-start'
import { getSuperuserClient } from '@/integrations/pocketbase/superuser.server'
import { requireAuth } from '@/features/settings/server/helpers.server'
import { toYmd, minutesToTime } from '@/features/calendar/date-utils'

export interface DashboardMetrics {
  appointmentsTodayCount: number
  newLeadsCount: number
  totalActiveLeads: number
  totalCustomersCount: number
  awaitingPriceCount: number
  recentLeads: Array<{
    chatId: string
    name: string | null
    stage: string
    style: string | null
  }>
  closeAppointments: Array<{
    id: string
    date: string
    timeSlot: string
    status: 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'no_show'
    leadName: string | null
    style: string | null
  }>
}

export const getDashboardData = createServerFn({ method: 'GET' }).handler(
  async (): Promise<DashboardMetrics> => {
    await requireAuth()
    const su = await getSuperuserClient()

    const todayStr = toYmd(new Date())

    const [customerRecords, appointmentRecords] = await Promise.all([
      su.collection('customers').getFullList({ sort: '-updated' }),
      su.collection('appointments').getFullList({ expand: 'customer', sort: 'start_time' }),
    ])

    // Active leads = customers whose lead_stage is not 'expired' (or 'lost')
    const activeLeads = customerRecords.filter((c) => (c.lead_stage as string) !== 'expired')
    const newLeadsCount = activeLeads.filter((c) => (c.lead_stage as string) === 'new' || !c.lead_stage).length
    const awaitingPriceCount = activeLeads.filter((c) => (c.lead_stage as string) === 'awaiting_price').length
    const totalActiveLeads = activeLeads.length
    const totalCustomersCount = customerRecords.length

    const recentLeads = activeLeads.slice(0, 10).map((c) => ({
      chatId: (c.whatsapp_chat_id as string) || c.id,
      name: (c.name as string) || null,
      stage: (c.lead_stage as string) || 'new',
      style: (c.notes as string) || null,
    }))

    let appointmentsTodayCount = 0
    const closeAppointments: DashboardMetrics['closeAppointments'] = []

    for (const appt of appointmentRecords) {
      const d = new Date(appt.start_time)
      const dateStr = toYmd(d)
      const timeSlotStr = minutesToTime(d.getHours() * 60 + d.getMinutes())
      const customerObj = appt.expand?.customer
      const leadName = (customerObj?.name as string) || (appt.customer_name_override as string) || null

      if (dateStr === todayStr && appt.status !== 'cancelled') {
        appointmentsTodayCount++
      }

      if (appt.status !== 'cancelled' && dateStr >= todayStr) {
        closeAppointments.push({
          id: appt.id,
          date: dateStr,
          timeSlot: timeSlotStr,
          status: appt.status,
          leadName,
          style: (appt.tattoo_description as string) || null,
        })
      }
    }

    closeAppointments.sort((a, b) => `${a.date}${a.timeSlot}`.localeCompare(`${b.date}${b.timeSlot}`))

    return {
      appointmentsTodayCount,
      newLeadsCount,
      totalActiveLeads,
      totalCustomersCount,
      awaitingPriceCount,
      recentLeads,
      closeAppointments: closeAppointments.slice(0, 10),
    }
  },
)
