import { getSuperuserClient } from '@/integrations/pocketbase/superuser.server'
import { requireAuth } from '@/features/settings/server/helpers.server'
import { SOURCE_LABELS } from '@/features/customers/types'
import type { CustomerSource } from '@/features/customers/types'
import { detectTattooStyle } from '../utils/styles'
import type {
  AnalyticsSummary,
  AnalyticsTimeRange,
  ArtistStat,
  ConversionFunnelStage,
  SourceBreakdownItem,
  StudioHealthStats,
  TattooStyleStat,
} from '../types'

export function getStartDateForRange(range: AnalyticsTimeRange, now: Date = new Date()): Date | null {
  if (range === 'all') return null
  const d = new Date(now)
  if (range === '30d') {
    d.setDate(d.getDate() - 30)
    d.setHours(0, 0, 0, 0)
    return d
  }
  if (range === 'this_month') {
    return new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0)
  }
  if (range === 'last_month') {
    return new Date(d.getFullYear(), d.getMonth() - 1, 1, 0, 0, 0, 0)
  }
  return null
}

export function getEndDateForRange(range: AnalyticsTimeRange, now: Date = new Date()): Date | null {
  if (range === 'last_month') {
    const d = new Date(now)
    return new Date(d.getFullYear(), d.getMonth(), 0, 23, 59, 59, 999)
  }
  return null
}

const CANONICAL_SOURCES: CustomerSource[] = [
  'instagram',
  'tiktok',
  'website',
  'google',
  'facebook',
  'referral',
  'walk-in',
  'unknown',
]

const POST_INFO_STATES = new Set([
  'AWAIT_PRICE_OFFER',
  'AWAIT_HEALTH_NOTICE',
  'AWAIT_PAYMENT',
  'AWAIT_FINAL_CONFIRMATION',
  'AWAITING_APPOINTMENT',
  'PROJECT_IN_PROGRESS',
  'AWAIT_NPS_SCORE',
  'COMPLETED',
])

export async function handleGetStudioAnalytics({
  data,
}: {
  data: { timeRange: AnalyticsTimeRange }
}): Promise<AnalyticsSummary> {
  const session = await requireAuth()
  const su = await getSuperuserClient()
  const isAdmin = session.staff.role === 'owner' || session.staff.role === 'admin'

  const now = new Date()
  const startDate = getStartDateForRange(data.timeRange, now)
  const endDate = getEndDateForRange(data.timeRange, now)

  const [allCustomers, allAppointments, allConversations, allStaff] = await Promise.all([
    su.collection('customers').getFullList({ sort: '-created' }),
    su.collection('appointments').getFullList({ sort: '-start_time' }),
    su.collection('conversations').getFullList({
      fields: 'id,customer,assigned_staff,state,status,tattoo_info,created',
    }),
    su.collection('staff').getFullList({ sort: 'name' }),
  ])

  // Scope appointments by staff member if not admin
  const staffAppointments = isAdmin
    ? allAppointments
    : allAppointments.filter((a) => a.staff === session.staff.id)

  // Filter customers by selected time range based on registration date
  const customers = allCustomers.filter((c) => {
    const created = new Date(c.created)
    if (startDate && created < startDate) return false
    if (endDate && created > endDate) return false
    return true
  })

  const customerIdsSet = new Set(customers.map((c) => c.id))

  // Map appointments to customer ID
  const customerAppointmentsMap: Record<
    string,
    Array<{
      id: string
      status: string
      type: string
      price: number
      deposit: number
      description: string
      staffId: string
      created: string
    }>
  > = {}

  let totalPeriodAppointmentsCount = 0
  let cancelledAppointmentsCount = 0
  let sketchAppointmentsCount = 0
  let tattooAppointmentsCount = 0

  for (const appt of staffAppointments) {
    const custId = appt.customer as string
    if (!custId || !customerIdsSet.has(custId)) continue

    totalPeriodAppointmentsCount++
    if (appt.status === 'cancelled') {
      cancelledAppointmentsCount++
    }

    const apptType = (appt.type as string) || 'tattoo'
    if (apptType === 'sketch') {
      sketchAppointmentsCount++
    } else {
      tattooAppointmentsCount++
    }

    if (!customerAppointmentsMap[custId]) {
      customerAppointmentsMap[custId] = []
    }

    const price = Number(appt.price_amount || appt.price_max || appt.price_min || 0)
    const deposit = appt.deposit_paid ? Number(appt.deposit_amount || 0) : 0
    customerAppointmentsMap[custId].push({
      id: appt.id,
      status: appt.status as string,
      type: apptType,
      price,
      deposit,
      description: (appt.tattoo_description as string) || '',
      staffId: (appt.staff as string) || '',
      created: appt.created as string,
    })
  }

  // Map conversations to customer ID
  const customerConversationMap: Record<
    string,
    {
      id: string
      state: string
      status: string
      assignedStaff: string
      tattooInfo?: Record<string, unknown>
      created: string
    }
  > = {}

  let humanTakeoverCount = 0

  for (const conv of allConversations) {
    const custId = conv.customer as string
    if (custId && customerIdsSet.has(custId) && !customerConversationMap[custId]) {
      const isTakeover = conv.status === 'escalated' || conv.status === 'staff_handling'
      if (isTakeover) humanTakeoverCount++

      customerConversationMap[custId] = {
        id: conv.id,
        state: (conv.state as string) || 'NEW',
        status: (conv.status as string) || 'bot_active',
        assignedStaff: (conv.assigned_staff as string) || '',
        tattooInfo: (conv.tattoo_info as Record<string, unknown>) || undefined,
        created: conv.created as string,
      }
    }
  }

  // Aggregate stats per source
  const sourceStats: Record<
    CustomerSource,
    {
      leadsCount: number
      bookedCount: number
      revenueIls: number
    }
  > = {
    instagram: { leadsCount: 0, bookedCount: 0, revenueIls: 0 },
    tiktok: { leadsCount: 0, bookedCount: 0, revenueIls: 0 },
    website: { leadsCount: 0, bookedCount: 0, revenueIls: 0 },
    google: { leadsCount: 0, bookedCount: 0, revenueIls: 0 },
    facebook: { leadsCount: 0, bookedCount: 0, revenueIls: 0 },
    referral: { leadsCount: 0, bookedCount: 0, revenueIls: 0 },
    'walk-in': { leadsCount: 0, bookedCount: 0, revenueIls: 0 },
    unknown: { leadsCount: 0, bookedCount: 0, revenueIls: 0 },
  }

  // Staff map initialization
  const staffStatsMap: Record<
    string,
    {
      staffId: string
      name: string
      leadsCount: number
      bookedCount: number
      revenueIls: number
    }
  > = {}

  for (const st of allStaff) {
    staffStatsMap[st.id] = {
      staffId: st.id,
      name: (st.name as string) || 'מקעקע/ת',
      leadsCount: 0,
      bookedCount: 0,
      revenueIls: 0,
    }
  }

  // Tattoo styles count
  const styleCountMap: Record<string, { label: string; count: number }> = {}

  let totalRevenue = 0
  let totalBookedCustomers = 0
  let totalQuotesCount = 0
  let totalCompletedCustomers = 0
  let timeToBookHoursSum = 0
  let timeToBookCount = 0

  for (const cust of customers) {
    let rawSource = (cust.source as string || 'unknown').toLowerCase().trim()
    if (rawSource === 'whatsapp') rawSource = 'unknown'
    if (rawSource === 'google_form') rawSource = 'website'
    const source: CustomerSource = CANONICAL_SOURCES.includes(rawSource as CustomerSource)
      ? (rawSource as CustomerSource)
      : 'unknown'

    sourceStats[source].leadsCount++

    const conv = customerConversationMap[cust.id]
    const appts = customerAppointmentsMap[cust.id] || []

    // Attribute lead to assigned staff
    const assignedStaffId = conv?.assignedStaff || appts[0]?.staffId
    if (assignedStaffId) {
      const staffEntry = staffStatsMap[assignedStaffId]
      if (staffEntry) {
        staffEntry.leadsCount++
      }
    }

    // Check if reached quote stage
    const hasPriceQuote =
      (conv && POST_INFO_STATES.has(conv.state)) ||
      appts.some((a) => a.price > 0)
    if (hasPriceQuote) {
      totalQuotesCount++
    }

    // Check bookings
    const confirmedAppt = appts.find((a) => a.status === 'confirmed' || a.status === 'completed')
    const completedAppt = appts.find((a) => a.status === 'completed')

    if (confirmedAppt) {
      totalBookedCustomers++
      sourceStats[source].bookedCount++

      if (assignedStaffId) {
        const staffEntry = staffStatsMap[assignedStaffId]
        if (staffEntry) {
          staffEntry.bookedCount++
        }
      }

      // Calculate time to book in hours
      const custCreatedTime = new Date(cust.created).getTime()
      const apptCreatedTime = new Date(confirmedAppt.created).getTime()
      if (apptCreatedTime >= custCreatedTime) {
        const diffHours = (apptCreatedTime - custCreatedTime) / (1000 * 60 * 60)
        timeToBookHoursSum += diffHours
        timeToBookCount++
      }
    }

    if (completedAppt) {
      totalCompletedCustomers++
    }

    // Revenue calculation
    for (const a of appts) {
      const staffEntry = a.staffId ? staffStatsMap[a.staffId] : undefined
      if (a.status === 'completed') {
        const rev = a.price > 0 ? a.price : a.deposit
        sourceStats[source].revenueIls += rev
        totalRevenue += rev
        if (staffEntry) {
          staffEntry.revenueIls += rev
        }
      } else if (a.status === 'confirmed' && a.deposit > 0) {
        sourceStats[source].revenueIls += a.deposit
        totalRevenue += a.deposit
        if (staffEntry) {
          staffEntry.revenueIls += a.deposit
        }
      }

      // Style classification from appointment description
      if (a.description) {
        const detected = detectTattooStyle(a.description)
        const existing = styleCountMap[detected.key]
        if (existing) {
          existing.count++
        } else {
          styleCountMap[detected.key] = { label: detected.label, count: 1 }
        }
      }
    }

    // Fallback style detection from conversation tattoo_info if no appointment description exists
    if (appts.length === 0 && conv?.tattooInfo?.designDescription) {
      const detected = detectTattooStyle(String(conv.tattooInfo.designDescription))
      const existing = styleCountMap[detected.key]
      if (existing) {
        existing.count++
      } else {
        styleCountMap[detected.key] = { label: detected.label, count: 1 }
      }
    }
  }

  const totalLeads = customers.length
  const overallConversionRate =
    totalLeads > 0 ? Math.round((totalBookedCustomers / totalLeads) * 100) : 0

  // 1. Source breakdown & identify top converting source
  let highestConvRate = -1
  let topConvertingSource: CustomerSource | null = null

  for (const s of CANONICAL_SOURCES) {
    const stat = sourceStats[s]
    if (stat.leadsCount >= 2) {
      const rate = Math.round((stat.bookedCount / stat.leadsCount) * 100)
      if (rate > highestConvRate) {
        highestConvRate = rate
        topConvertingSource = s
      }
    }
  }

  const sourceBreakdown: SourceBreakdownItem[] = CANONICAL_SOURCES.map((s) => {
    const stat = sourceStats[s]
    const percent = totalLeads > 0 ? Math.round((stat.leadsCount / totalLeads) * 100) : 0
    const conversionRate =
      stat.leadsCount > 0 ? Math.round((stat.bookedCount / stat.leadsCount) * 100) : 0

    return {
      source: s,
      label: SOURCE_LABELS[s] || s,
      count: stat.leadsCount,
      percent,
      bookedCount: stat.bookedCount,
      conversionRate,
      revenueIls: stat.revenueIls,
      isTopConverting: s === topConvertingSource && highestConvRate > 0,
    }
  })
    .filter((s) => s.count > 0 || ['instagram', 'tiktok', 'website'].includes(s.source))
    .sort((a, b) => b.count - a.count)

  // 2. Funnel & Drop-off stages
  const preQuoteDropoff = Math.max(0, totalLeads - totalQuotesCount)
  const preQuoteDropoffPercent = totalLeads > 0 ? Math.round((preQuoteDropoff / totalLeads) * 100) : 0

  const postQuoteDropoff = Math.max(0, totalQuotesCount - totalBookedCustomers)
  const postQuoteDropoffPercent =
    totalQuotesCount > 0 ? Math.round((postQuoteDropoff / totalQuotesCount) * 100) : 0

  const apptDropoff = Math.max(0, totalBookedCustomers - totalCompletedCustomers)
  const apptDropoffPercent =
    totalBookedCustomers > 0 ? Math.round((apptDropoff / totalBookedCustomers) * 100) : 0

  const funnel: ConversionFunnelStage[] = [
    {
      id: 'leads',
      label: 'פניות ראשונות',
      sublabel: 'לידים שנכנסו למערכת',
      count: totalLeads,
      percentOfTotal: 100,
      dropoffCount: preQuoteDropoff,
      dropoffPercent: preQuoteDropoffPercent,
    },
    {
      id: 'quote',
      label: 'הצעת מחיר',
      sublabel: 'הבשילו למתן הערכת מחיר',
      count: totalQuotesCount,
      percentOfTotal: totalLeads > 0 ? Math.round((totalQuotesCount / totalLeads) * 100) : 0,
      dropoffCount: postQuoteDropoff,
      dropoffPercent: postQuoteDropoffPercent,
    },
    {
      id: 'booked',
      label: 'תור שוריין ומקדמה',
      sublabel: 'מועד ננעל ביומן ושולמה מקדמה',
      count: totalBookedCustomers,
      percentOfTotal: totalLeads > 0 ? Math.round((totalBookedCustomers / totalLeads) * 100) : 0,
      dropoffCount: apptDropoff,
      dropoffPercent: apptDropoffPercent,
    },
    {
      id: 'completed',
      label: 'תורים שבוצעו',
      sublabel: 'סשנים שהסתיימו בהצלחה',
      count: totalCompletedCustomers,
      percentOfTotal: totalLeads > 0 ? Math.round((totalCompletedCustomers / totalLeads) * 100) : 0,
      dropoffCount: 0,
      dropoffPercent: 0,
    },
  ]

  // 3. Artists breakdown
  const artists: ArtistStat[] = Object.values(staffStatsMap)
    .filter((st) => st.leadsCount > 0 || st.bookedCount > 0 || st.revenueIls > 0)
    .map((st) => ({
      staffId: st.staffId,
      name: st.name,
      leadsCount: st.leadsCount,
      bookedCount: st.bookedCount,
      conversionRate: st.leadsCount > 0 ? Math.round((st.bookedCount / st.leadsCount) * 100) : 0,
      revenueIls: st.revenueIls,
    }))
    .sort((a, b) => b.bookedCount - a.bookedCount || b.leadsCount - a.leadsCount)

  // 4. Popular Tattoo Styles
  const totalStylesCount = Object.values(styleCountMap).reduce((acc, curr) => acc + curr.count, 0)
  const popularStyles: TattooStyleStat[] = Object.entries(styleCountMap)
    .map(([styleKey, info]) => ({
      styleKey,
      label: info.label,
      count: info.count,
      percent: totalStylesCount > 0 ? Math.round((info.count / totalStylesCount) * 100) : 0,
    }))
    .sort((a, b) => b.count - a.count)

  // 5. Studio Health Stats
  const avgTimeToBookHours =
    timeToBookCount > 0 ? Math.round(timeToBookHoursSum / timeToBookCount) : 0
  const cancellationRate =
    totalPeriodAppointmentsCount > 0
      ? Math.round((cancelledAppointmentsCount / totalPeriodAppointmentsCount) * 100)
      : 0
  const humanTakeoverRate =
    customers.length > 0 ? Math.round((humanTakeoverCount / customers.length) * 100) : 0

  const health: StudioHealthStats = {
    avgTimeToBookHours,
    cancellationRate,
    cancelledAppointmentsCount,
    sketchAppointmentsCount,
    tattooAppointmentsCount,
    humanTakeoverRate,
  }

  return {
    timeRange: data.timeRange,
    totalLeads,
    totalBookedCustomers,
    overallConversionRate,
    totalRevenueIls: totalRevenue,
    sourceBreakdown,
    funnel,
    artists,
    popularStyles,
    health,
  }
}
