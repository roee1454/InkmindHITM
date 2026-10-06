import React from 'react'
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import type { ChartConfig } from '@/components/ui/chart'
import type { SourceBreakdownItem } from '../types'

interface SourceBreakdownChartProps {
  sourceBreakdown: SourceBreakdownItem[]
  totalLeads: number
}

const chartConfig = {
  count: {
    label: 'לידים',
    color: 'var(--primary)',
  },
} satisfies ChartConfig

export const SourceBreakdownChart: React.FC<SourceBreakdownChartProps> = ({
  sourceBreakdown,
  totalLeads,
}) => {
  const chartData = sourceBreakdown
    .filter((s) => s.count > 0)
    .map((s) => ({
      source: s.source,
      label: s.label,
      count: s.count,
      percent: s.percent,
    }))

  const topSource = sourceBreakdown.find((s) => s.isTopConverting)

  return (
    <div className="card-native overflow-hidden font-assistant">
      {/* Header */}
      <div className="flex flex-col gap-2 border-b border-border/60 px-5 pt-4 pb-3 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:pt-5">
        <div className="flex items-center gap-2">
          <h3 className="text-base font-extrabold text-foreground">התפלגות מקורות הגעה</h3>
          {totalLeads > 0 && (
            <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-bold text-muted-foreground tabular-nums">
              {totalLeads} לידים
            </span>
          )}
        </div>
        {topSource && (
          <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <span>ממיר מוביל:</span>
            <span className="font-bold text-foreground">{topSource.label}</span>
            <span className="rounded-md bg-muted px-1.5 py-0.5 font-bold tabular-nums text-foreground">
              {topSource.conversionRate}% המרה
            </span>
          </div>
        )}
      </div>

      {totalLeads > 0 && chartData.length > 0 ? (
        <>
          {/* Chart View */}
          <div className="p-4 sm:p-6">
            <ChartContainer config={chartConfig} className="h-[200px] w-full sm:h-[220px]">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-border/40" />
                <XAxis
                  dataKey="label"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  className="fill-muted-foreground font-assistant text-xs"
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                  className="fill-muted-foreground font-assistant text-xs"
                />
                <ChartTooltip
                  cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                  content={<ChartTooltipContent indicator="line" />}
                />
                <Bar dataKey="count" fill="var(--primary)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ChartContainer>
          </div>

          {/* List Breakdown - Responsive Mobile/Desktop */}
          <div className="divide-y divide-border/60 border-t border-border/60 font-assistant">
            {sourceBreakdown.map((item) => (
              <div
                key={item.source}
                className="flex flex-col gap-1.5 px-5 py-3 transition-colors hover:bg-muted/40 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-6 sm:py-3.5"
              >
                {/* Source Label & Badge */}
                <div className="flex items-center justify-between sm:justify-start sm:gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-foreground sm:text-xs">
                      {item.label}
                    </span>
                    {item.isTopConverting && (
                      <span className="rounded-md bg-muted px-1.5 py-0.5 text-micro font-extrabold text-foreground">
                        ממיר מוביל
                      </span>
                    )}
                  </div>
                  {/* Mobile-only count summary */}
                  <div className="sm:hidden flex items-center gap-1.5 text-xs tabular-nums">
                    <span className="font-extrabold text-foreground">{item.count} לידים</span>
                    <span className="text-muted-foreground">({item.percent}%)</span>
                  </div>
                </div>

                {/* Metrics */}
                <div className="flex items-center justify-between text-xs text-muted-foreground tabular-nums sm:justify-end sm:gap-7">
                  {/* Desktop-only lead counts */}
                  <span className="hidden font-semibold text-foreground sm:inline">
                    {item.count} לידים
                  </span>
                  <span className="hidden w-10 text-start font-medium text-muted-foreground sm:inline">
                    {item.percent}%
                  </span>

                  {/* Conversion & Revenue */}
                  <div className="flex items-center gap-1.5">
                    <span className="sm:hidden text-micro text-muted-foreground">המרה:</span>
                    <span className="font-bold text-foreground sm:w-16 sm:text-start">
                      {item.conversionRate}% המרה
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className="sm:hidden text-micro text-muted-foreground">הכנסה:</span>
                    <span className="font-bold text-foreground sm:w-20 sm:text-start">
                      {item.revenueIls > 0 ? `₪${item.revenueIls.toLocaleString()}` : '—'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
          <p className="text-sm font-bold text-foreground">אין נתוני פניות לתקופה שנבחרה</p>
          <p className="mt-1 text-xs font-medium text-muted-foreground">
            כשיתקבלו פניות חדשות בערוצי השיווק, הן יופיעו כאן אוטומטית
          </p>
        </div>
      )}
    </div>
  )
}
