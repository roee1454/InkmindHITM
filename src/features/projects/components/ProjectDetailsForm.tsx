import { useEffect, useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Loader2 } from '@/components/ui/icon'
import type { ProjectDetails } from '../types'

interface ProjectDetailsFormProps {
  project: ProjectDetails
  isSaving: boolean
  error: string | null
  onSave: (values: { title: string; quoteMin: number | null; quoteMax: number | null; estimatedSessions: number | null }) => void
  onCancel: () => void
}

function toNumber(value: string): number | null {
  const n = Number(value)
  return value.trim() && n > 0 ? n : null
}

function asText(value: number | null): string {
  return value === null ? '' : String(value)
}

/** Name, quote range and how many sessions the piece is expected to take — the panel's edit mode. */
export function ProjectDetailsForm({ project, isSaving, error, onSave, onCancel }: ProjectDetailsFormProps) {
  const [title, setTitle] = useState(project.title)
  const [quoteMin, setQuoteMin] = useState(asText(project.quoteMin))
  const [quoteMax, setQuoteMax] = useState(asText(project.quoteMax))
  const [sessions, setSessions] = useState(asText(project.estimatedSessions))

  useEffect(() => {
    setTitle(project.title)
    setQuoteMin(asText(project.quoteMin))
    setQuoteMax(asText(project.quoteMax))
    setSessions(asText(project.estimatedSessions))
  }, [project.id, project.title, project.quoteMin, project.quoteMax, project.estimatedSessions])

  const dirty =
    title !== project.title ||
    quoteMin !== asText(project.quoteMin) ||
    quoteMax !== asText(project.quoteMax) ||
    sessions !== asText(project.estimatedSessions)
  const disabled = isSaving

  return (
    <form
      className="flex flex-col gap-3"
      aria-label="עריכת פרטי הפרויקט"
      onSubmit={(event) => {
        event.preventDefault()
        onSave({ title, quoteMin: toNumber(quoteMin), quoteMax: toNumber(quoteMax), estimatedSessions: toNumber(sessions) })
      }}
    >
      <div className="flex flex-col gap-1.5">
        <label htmlFor="project-title" className="text-xs font-bold text-foreground">שם הפרויקט</label>
        <Input id="project-title" autoFocus value={title} maxLength={200} disabled={disabled} onChange={(e) => setTitle(e.target.value)} />
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="quote-min" className="text-xs font-bold text-foreground">הצעה מ-</label>
          <Input id="quote-min" type="number" inputMode="numeric" min={0} placeholder="₪" value={quoteMin} disabled={disabled} onChange={(e) => setQuoteMin(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="quote-max" className="text-xs font-bold text-foreground">עד</label>
          <Input id="quote-max" type="number" inputMode="numeric" min={0} placeholder="₪" value={quoteMax} disabled={disabled} onChange={(e) => setQuoteMax(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="sessions" className="text-xs font-bold text-foreground">סשנים משוער</label>
          <Input id="sessions" type="number" inputMode="numeric" min={1} value={sessions} disabled={disabled} onChange={(e) => setSessions(e.target.value)} />
        </div>
      </div>
      {error && <p className="rounded-xl border border-destructive/30 bg-destructive/10 p-2.5 text-xs text-destructive">{error}</p>}
      <div className="flex items-center gap-2 pt-1">
        <Button type="submit" size="sm" disabled={!dirty || !title.trim() || isSaving} className="min-w-24 gap-2">
          {isSaving && <Loader2 size={14} className="animate-spin" />}
          שמירה
        </Button>
        <Button type="button" variant="ghost" size="sm" disabled={isSaving} onClick={onCancel}>
          ביטול
        </Button>
      </div>
    </form>
  )
}
