import { CalendarDays, Users, Zap } from 'lucide-react'

interface MetricsSummaryProps {
  appointmentsTodayCount: number
  newLeadsCount: number
  totalLeads: number
}

export function MetricsSummary({ appointmentsTodayCount, newLeadsCount, totalLeads }: MetricsSummaryProps) {
  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
      <div className="flex h-36 flex-col justify-between rounded-2xl border border-border bg-card p-6">
        <div className="flex items-center justify-between">
          <span className="font-assistant text-xs font-semibold text-muted-foreground">תורים היום</span>
          <span className="rounded-xl border border-border bg-muted p-2 text-emerald-500">
            <CalendarDays size={18} />
          </span>
        </div>
        <div>
          <div className="font-assistant text-3xl font-black text-foreground">{appointmentsTodayCount}</div>
          <div className="mt-1 font-assistant text-[10px] text-muted-foreground">תורים מאושרים/פעילים להיום</div>
        </div>
      </div>

      <div className="flex h-36 flex-col justify-between rounded-2xl border border-border bg-card p-6">
        <div className="flex items-center justify-between">
          <span className="font-assistant text-xs font-semibold text-muted-foreground">פניות חדשות</span>
          <span className="rounded-xl border border-border bg-muted p-2 text-primary">
            <Zap size={18} />
          </span>
        </div>
        <div>
          <div className="font-assistant text-3xl font-black text-foreground">{newLeadsCount}</div>
          <div className="mt-1 font-assistant text-[10px] text-muted-foreground">לידים חדשים שממתינים לטיפול</div>
        </div>
      </div>

      <div className="flex h-36 flex-col justify-between rounded-2xl border border-border bg-card p-6">
        <div className="flex items-center justify-between">
          <span className="font-assistant text-xs font-semibold text-muted-foreground">לידים פעילים</span>
          <span className="rounded-xl border border-border bg-muted p-2 text-purple-500">
            <Users size={18} />
          </span>
        </div>
        <div>
          <div className="font-assistant text-3xl font-black text-foreground">{totalLeads}</div>
          <div className="mt-1 font-assistant text-[10px] text-muted-foreground">לידים שלא הסתיימו במעקב</div>
        </div>
      </div>
    </div>
  )
}
export default MetricsSummary
