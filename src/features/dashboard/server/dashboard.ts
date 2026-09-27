import { createServerFn } from '@tanstack/react-start'
import { getSuperuserClient } from '@/integrations/pocketbase/superuser.server'
import { requireAuth } from '@/features/settings/server/helpers.server'
import { toYmd, minutesToTime } from '#/features/calendar/utils/date-utils'
import { loadCustomerLifecycles } from '@/features/customers/server/customer-lifecycle.server'
import { awaitsReceiptApproval } from '../utils/alerts'

export interface DashboardMetrics {
  appointmentsTodayCount: number
  newLeadsCount: number
  totalActiveLeads: number
  totalCustomersCount: number
  awaitingPriceCount: number
  receiptApprovalCount: number
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
    const session = await requireAuth()
    const su = await getSuperuserClient()
    const isAdmin = session.staff.role === 'owner' || session.staff.role === 'admin'

    const todayStr = toYmd(new Date())

    const [rawCustomers, rawAppointments, conversations, lifecycleOf] = await Promise.all([
      su.collection('customers').getFullList({ sort: '-updated' }),
      su.collection('appointments').getFullList({ expand: 'customer', sort: 'start_time' }),
      su.collection('conversations').getFullList({ fields: 'id,customer,assigned_staff,state' }),
      loadCustomerLifecycles(su),
    ])

    const appointmentRecords = isAdmin
      ? rawAppointments
      : rawAppointments.filter((a) => a.staff === session.staff.id)

    let customerRecords = rawCustomers
    if (!isAdmin) {
      const assignedCustomerIds = new Set<string>()
      for (const conv of conversations) {
        if (conv.assigned_staff === session.staff.id && conv.customer) {
          assignedCustomerIds.add(conv.customer as string)
        }
      }
      for (const appt of appointmentRecords) {
        if (appt.customer) assignedCustomerIds.add(appt.customer as string)
      }
      customerRecords = rawCustomers.filter((c) => assignedCustomerIds.has(c.id))
    }

    // Interim until track-b B6.4 counts by project stage: a lead is a customer who never had a
    // session (lifecycle lead/prospect) and whose conversation isn't closed; the bot's dialogue
    // state stands in for where they are.
    const stateByCustomer = new Map(conversations.map((c) => [c.customer as string, (c.state as string) || 'NEW']))
    const activeLeads = customerRecords.filter((c) => {
      const lifecycle = lifecycleOf(c.id)
      return (lifecycle === 'lead' || lifecycle === 'prospect') && stateByCustomer.get(c.id) !== 'COMPLETED'
    })
    const newLeadsCount = activeLeads.filter((c) => lifecycleOf(c.id) === 'lead').length
    const awaitingPriceCount = activeLeads.filter((c) => stateByCustomer.get(c.id) === 'AWAIT_PRICE_OFFER').length
    const totalActiveLeads = activeLeads.length
    const totalCustomersCount = customerRecords.length

    const recentLeads = activeLeads.slice(0, 10).map((c) => ({
      chatId: (c.whatsapp_chat_id as string) || c.id,
      name: (c.name as string) || null,
      stage: stateByCustomer.get(c.id) ?? 'NEW',
      style: (c.notes as string) || null,
    }))

    let appointmentsTodayCount = 0
    let receiptApprovalCount = 0
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

      if (awaitsReceiptApproval(appt)) receiptApprovalCount++

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
      receiptApprovalCount,
      recentLeads,
      closeAppointments: closeAppointments.slice(0, 10),
    }
  },
)
