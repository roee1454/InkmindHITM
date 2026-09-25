import { formatShortSlot } from '../utils/format'
import type { ProjectDetails } from '../types'

const ACTOR_LABELS: Record<string, string> = { customer: 'הלקוח', bot: 'הבוט', staff: 'הצוות', system: 'המערכת' }

/** When appointments in this project were moved, and by whom. */
export function RescheduleHistory({ reschedules }: { reschedules: ProjectDetails['reschedules'] }) {
  if (reschedules.length === 0) return null
  return (
    <section className="rounded-2xl border border-border p-3" aria-label="דחיות">
      <h3 className="mb-2 text-xs font-extrabold text-foreground">דחיות</h3>
      <ul className="flex flex-col gap-1 text-xs text-muted-foreground">
        {reschedules.map((r) => (
          <li key={`${r.appointmentId}-${r.at}`}>
            נדחה מ-<span className="text-foreground">{formatShortSlot(r.fromStart)}</span> ל-<span className="text-foreground">{formatShortSlot(r.toStart)}</span>
            {ACTOR_LABELS[r.actor] ? ` · ${ACTOR_LABELS[r.actor]}` : ''}
          </li>
        ))}
      </ul>
    </section>
  )
}
