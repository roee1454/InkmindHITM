import { CalendarDays, Users, Zap } from 'lucide-react'

interface MetricsSummaryProps {
  appointmentsTodayCount: number
  newLeadsCount: number
  totalLeads: number
}

export function MetricsSummary({ appointmentsTodayCount, newLeadsCount, totalLeads }: MetricsSummaryProps) {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-6">
      <div className="flex h-24 flex-col justify-between rounded-2xl border border-border bg-card p-4 md:h-36 md:p-6">
        <div className="flex items-center justify-between">
          <span className="font-assistant text-sm font-bold text-muted-foreground">תורים היום</span>
          <span className="rounded-xl border border-border bg-muted p-2 text-emerald-500">
            <CalendarDays size={18} />
          </span>
        </div>
        <div>
          <div className="font-assistant text-2xl font-black text-foreground md:text-3xl">{appointmentsTodayCount}</div>
          <div className="mt-1 font-assistant text-micro text-muted-foreground hidden md:block">תורים מאושרים/פעילים להיום</div>
        </div>
      </div>

      <div className="flex h-24 flex-col justify-between rounded-2xl border border-border bg-card p-4 md:h-36 md:p-6">
        <div className="flex items-center justify-between">
          <span className="font-assistant text-sm font-bold text-muted-foreground">פניות חדשות</span>
          <span className="rounded-xl border border-border bg-muted p-2 text-primary">
            <Zap size={18} />
          </span>
        </div>
        <div>
          <div className="font-assistant text-2xl font-black text-foreground md:text-3xl">{newLeadsCount}</div>
          <div className="mt-1 font-assistant text-micro text-muted-foreground hidden md:block">לידים חדשים שממתינים לטיפול</div>
        </div>
      </div>

      {/* Odd tile out in the 2-col mobile grid — span the row rather than leave a gap. */}
      <div className="flex h-24 flex-col justify-between rounded-2xl border border-border bg-card p-4 max-md:col-span-2 md:h-36 md:p-6">
        <div className="flex items-center justify-between">
          <span className="font-assistant text-sm font-bold text-muted-foreground">לידים פעילים</span>
          <span className="rounded-xl border border-border bg-muted p-2 text-purple-500">
            <Users size={18} />
          </span>
        </div>
        <div>
          <div className="font-assistant text-2xl font-black text-foreground md:text-3xl">{totalLeads}</div>
          <div className="mt-1 font-assistant text-micro text-muted-foreground hidden md:block">לידים שלא הסתיימו במעקב</div>
        </div>
      </div>
    </div>
  )
}
export default MetricsSummary
