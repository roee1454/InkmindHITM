interface MetricsSummaryProps {
  appointmentsTodayCount: number
  newLeadsCount: number
  totalLeads: number
}

const TILES = [
  { key: 'appointments', label: 'תורים היום' },
  { key: 'leads', label: 'פניות חדשות' },
  { key: 'active', label: 'לידים פעילים' },
] as const

export function MetricsSummary({ appointmentsTodayCount, newLeadsCount, totalLeads }: MetricsSummaryProps) {
  const values = {
    appointments: appointmentsTodayCount,
    leads: newLeadsCount,
    active: totalLeads,
  }

  return (
    <div className="grid grid-cols-3 gap-3 font-assistant lg:gap-4" dir="rtl">
      {TILES.map((tile) => (
        <div
          key={tile.key}
          className="flex flex-col justify-center rounded-2xl border border-border/80 bg-card p-3.5 shadow-2xs transition-shadow duration-150 sm:p-5 lg:rounded-3xl lg:p-6"
        >
          <span className="text-2xl font-extrabold tracking-tight text-foreground tabular-nums sm:text-3xl lg:text-4xl">
            {values[tile.key]}
          </span>
          <span className="mt-1 text-xs font-semibold text-muted-foreground sm:text-sm">
            {tile.label}
          </span>
        </div>
      ))}
    </div>
  )
}

export default MetricsSummary
