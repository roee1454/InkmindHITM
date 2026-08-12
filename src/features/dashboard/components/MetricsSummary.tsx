import { CalendarDays, Users, Zap } from 'lucide-react'

interface MetricsSummaryProps {
  appointmentsTodayCount: number
  newLeadsCount: number
  totalLeads: number
}

const TILES = [
  { key: 'appointments', label: 'תורים היום', icon: CalendarDays, chip: 'bg-success/12 text-success' },
  { key: 'leads', label: 'פניות חדשות', icon: Zap, chip: 'bg-primary/10 text-primary' },
  { key: 'active', label: 'לידים פעילים', icon: Users, chip: 'bg-warning/12 text-warning' },
] as const

export function MetricsSummary({ appointmentsTodayCount, newLeadsCount, totalLeads }: MetricsSummaryProps) {
  const values: Record<(typeof TILES)[number]['key'], number> = {
    appointments: appointmentsTodayCount,
    leads: newLeadsCount,
    active: totalLeads,
  }

  return (
    <div className="grid grid-cols-3 gap-3 lg:gap-4">
      {TILES.map((tile) => (
        <div key={tile.key} className="stat-native lg:p-[22px]">
          <span className={`flex size-[34px] shrink-0 items-center justify-center rounded-[12px] lg:size-10 ${tile.chip}`}>
            <tile.icon size={17} />
          </span>
          <div>
            <div className="stat-value lg:text-[38px]">{values[tile.key]}</div>
            <div className="stat-label">{tile.label}</div>
          </div>
        </div>
      ))}
    </div>
  )
}
export default MetricsSummary
