import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2 } from '@/components/ui/icon'
import { appointmentKindLabel } from '@/features/calendar/utils/project-position'
import type { ProjectDetails } from '../types'
import { PROJECT_STAGE_LABELS } from '../utils/labels'

interface MoveAppointmentSectionProps {
  project: ProjectDetails
  isMoving: boolean
  error: string | null
  onMove: (appointmentId: string, target: string) => void
}

/** Fixes an appointment filed under the wrong piece: move it to another project of this customer, or split it out. */
export function MoveAppointmentSection({ project, isMoving, error, onMove }: MoveAppointmentSectionProps) {
  const [appointmentId, setAppointmentId] = useState('')
  const [target, setTarget] = useState('new')

  return (
    <section className="flex flex-col gap-2 rounded-2xl border border-border p-3" aria-label="העברת תור לפרויקט אחר">
      <h3 className="text-xs font-extrabold text-foreground">העברת תור לפרויקט אחר</h3>
      <div className="grid gap-2 sm:grid-cols-2">
        <Select value={appointmentId} onValueChange={setAppointmentId}>
          <SelectTrigger className="w-full" aria-label="התור להעברה">
            <SelectValue placeholder="בחירת תור" />
          </SelectTrigger>
          <SelectContent dir="rtl">
            {project.timeline.map((a) => (
              <SelectItem key={a.id} value={a.id}>
                {appointmentKindLabel(a.kind, a.projectPosition)} · {a.date.split('-').reverse().slice(0, 2).join('.')}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={target} onValueChange={setTarget}>
          <SelectTrigger className="w-full" aria-label="פרויקט היעד">
            <SelectValue />
          </SelectTrigger>
          <SelectContent dir="rtl">
            <SelectItem value="new">פרויקט חדש</SelectItem>
            {project.otherProjects.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.title} · {PROJECT_STAGE_LABELS[p.stage]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {error && <p className="rounded-xl border border-destructive/30 bg-destructive/10 p-2.5 text-xs text-destructive">{error}</p>}
      <Button type="button" variant="outline" size="sm" disabled={!appointmentId || isMoving} onClick={() => onMove(appointmentId, target)} className="gap-2 self-start">
        {isMoving && <Loader2 size={14} className="animate-spin" />}
        העברה
      </Button>
    </section>
  )
}
