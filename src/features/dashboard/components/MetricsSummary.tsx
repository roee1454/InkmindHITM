import { StatStrip } from '@/components/StatStrip'

interface MetricsSummaryProps {
  appointmentsTodayCount: number
  newLeadsCount: number
  totalLeads: number
}

export function MetricsSummary({ appointmentsTodayCount, newLeadsCount, totalLeads }: MetricsSummaryProps) {
  return (
    <StatStrip
      stats={[
        { label: 'תורים היום', value: appointmentsTodayCount },
        { label: 'פניות חדשות', value: newLeadsCount },
        { label: 'לידים פעילים', value: totalLeads },
      ]}
    />
  )
}

export default MetricsSummary
