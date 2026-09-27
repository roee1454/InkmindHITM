import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Skeleton } from '@/components/ui/skeleton'
import { StatStrip } from '@/components/StatStrip'
import { getStudioAnalytics } from './server/analytics'
import { SourceBreakdownChart } from './components/SourceBreakdownChart'
import { FunnelDropoffCard } from './components/FunnelDropoffCard'
import { ArtistsAndStylesCard } from './components/ArtistsAndStylesCard'
import type { AnalyticsTimeRange, AnalyticsSummary } from './types'
import { cn } from '@/lib/utils'

const TIME_RANGES: Array<{ id: AnalyticsTimeRange; label: string }> = [
  { id: '30d', label: '30 ימים אחרונים' },
  { id: 'this_month', label: 'החודש הנוכחי' },
  { id: 'last_month', label: 'חודש שעבר' },
  { id: 'all', label: 'כל הזמנים' },
]

export const AnalyticsPage: React.FC = () => {
  const [timeRange, setTimeRange] = useState<AnalyticsTimeRange>('30d')

  const { data: analytics, isLoading } = useQuery<AnalyticsSummary>({
    queryKey: ['studio-analytics', timeRange],
    queryFn: () => getStudioAnalytics({ data: { timeRange } }),
    staleTime: 60000,
  })

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-5 font-assistant pb-16 lg:gap-6" dir="rtl">
      {/* Header & Time Period Selector */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="page-head">
          <h1>אנליטיקות ומקורות הגעה</h1>
          <p>מעקב אחר לידים, שריון תורים, משפך נשירה וביצועים לפי מקעקע</p>
        </div>

        {/* Time range pills styled identically to LeadsFilters */}
        <div className="scrollbar-none -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0 sm:pb-0">
          {TIME_RANGES.map((r) => {
            const isActive = timeRange === r.id
            return (
              <button
                key={r.id}
                type="button"
                onClick={() => setTimeRange(r.id)}
                className={cn(
                  'flex h-[38px] shrink-0 cursor-pointer select-none items-center gap-1.5 whitespace-nowrap rounded-xl px-3.5 font-assistant text-sm font-bold transition-all duration-150 ease-native active:scale-[0.97]',
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-xs'
                    : 'border border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground',
                )}
              >
                {r.label}
              </button>
            )
          })}
        </div>
      </div>

      {isLoading || !analytics ? (
        <AnalyticsSkeleton />
      ) : (
        <>
          <StatStrip
            stats={[
              { label: 'לידים חדשים', value: analytics.totalLeads, hint: 'פניות ראשונות בוואטסאפ' },
              { label: 'תורים שנקבעו', value: analytics.totalBookedCustomers, hint: 'מאושרים או שבוצעו' },
              { label: 'המרה לתור', value: `${analytics.overallConversionRate}%`, hint: 'מכלל הפניות בתקופה' },
              { label: 'הכנסות מיוחסות', value: `₪${analytics.totalRevenueIls.toLocaleString()}`, hint: 'מקדמות ותשלומים שנגבו' },
            ]}
          />

          {/* Section 1: Source Breakdown Chart & Funnel Drop-off Side-by-Side on desktop */}
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 lg:gap-6">
            <SourceBreakdownChart
              sourceBreakdown={analytics.sourceBreakdown}
              totalLeads={analytics.totalLeads}
            />
            <FunnelDropoffCard
              funnel={analytics.funnel}
              totalLeads={analytics.totalLeads}
            />
          </div>

          {/* Section 2: Artists & Operational Health */}
          <ArtistsAndStylesCard
            artists={analytics.artists}
            health={analytics.health}
          />
        </>
      )}
    </div>
  )
}

function AnalyticsSkeleton() {
  return (
    <div className="flex flex-col gap-5 font-assistant lg:gap-6" dir="rtl">
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-border bg-border lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex flex-col gap-1.5 bg-card px-4 py-3.5 sm:px-5 sm:py-4">
            <Skeleton className="h-3.5 w-20" />
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-3 w-28" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 lg:gap-6">
        <div className="card-native h-80 overflow-hidden p-5">
          <Skeleton className="h-full w-full rounded-xl" />
        </div>
        <div className="card-native h-80 overflow-hidden p-5">
          <Skeleton className="h-full w-full rounded-xl" />
        </div>
      </div>
      <div className="card-native h-64 overflow-hidden p-5">
        <Skeleton className="h-full w-full rounded-xl" />
      </div>
    </div>
  )
}

export default AnalyticsPage
