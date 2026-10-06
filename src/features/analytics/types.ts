import type { CustomerSource } from '@/features/customers/types'

export type AnalyticsTimeRange = '30d' | 'this_month' | 'last_month' | 'all'

export interface SourceBreakdownItem {
  source: CustomerSource
  label: string
  count: number
  percent: number
  bookedCount: number
  conversionRate: number
  revenueIls: number
  isTopConverting?: boolean
}

export interface ConversionFunnelStage {
  id: 'leads' | 'quote' | 'booked' | 'completed'
  label: string
  sublabel: string
  count: number
  percentOfTotal: number
  dropoffCount: number
  dropoffPercent: number
}

export interface ArtistStat {
  staffId: string
  name: string
  leadsCount: number
  bookedCount: number
  conversionRate: number
  revenueIls: number
}

export interface TattooStyleStat {
  styleKey: string
  label: string
  count: number
  percent: number
}

export interface StudioHealthStats {
  avgTimeToBookHours: number
  cancellationRate: number
  cancelledAppointmentsCount: number
  sketchAppointmentsCount: number
  tattooAppointmentsCount: number
  humanTakeoverRate: number
}

export interface AnalyticsSummary {
  timeRange: AnalyticsTimeRange
  totalLeads: number
  totalBookedCustomers: number
  overallConversionRate: number
  totalRevenueIls: number
  sourceBreakdown: SourceBreakdownItem[]
  funnel: ConversionFunnelStage[]
  artists: ArtistStat[]
  popularStyles: TattooStyleStat[]
  health: StudioHealthStats
}
