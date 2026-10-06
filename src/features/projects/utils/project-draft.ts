import type { ProjectDetails } from '../types'

/** The panel's edit mode, as the raw text in its fields. */
export interface ProjectDraft {
  title: string
  quoteMin: string
  quoteMax: string
  sessions: string
}

export interface ProjectDraftValues {
  title: string
  quoteMin: number | null
  quoteMax: number | null
  estimatedSessions: number | null
}

export type DraftField = keyof ProjectDraft

export type DraftResult = { ok: true; values: ProjectDraftValues } | { ok: false; field: DraftField; message: string }

const MAX_SESSIONS = 50

function asText(value: number | null): string {
  return value === null ? '' : String(value)
}

export function draftFrom(project: Pick<ProjectDetails, 'title' | 'quoteMin' | 'quoteMax' | 'estimatedSessions'>): ProjectDraft {
  return { title: project.title, quoteMin: asText(project.quoteMin), quoteMax: asText(project.quoteMax), sessions: asText(project.estimatedSessions) }
}

export function isDraftDirty(draft: ProjectDraft, project: Pick<ProjectDetails, 'title' | 'quoteMin' | 'quoteMax' | 'estimatedSessions'>): boolean {
  const saved = draftFrom(project)
  return (Object.keys(saved) as DraftField[]).some((key) => draft[key].trim() !== saved[key].trim())
}

/** Empty is "not set"; anything else must be a positive number. */
function parseAmount(text: string): number | null | 'invalid' {
  if (!text.trim()) return null
  const n = Number(text)
  return Number.isFinite(n) && n > 0 ? n : 'invalid'
}

/** Validates the fields the way staff would read them, naming the field to point at. */
export function parseDraft(draft: ProjectDraft): DraftResult {
  const title = draft.title.trim()
  if (!title) return { ok: false, field: 'title', message: 'לפרויקט צריך שם.' }

  const quoteMin = parseAmount(draft.quoteMin)
  if (quoteMin === 'invalid') return { ok: false, field: 'quoteMin', message: 'המחיר צריך להיות מספר חיובי.' }
  const quoteMax = parseAmount(draft.quoteMax)
  if (quoteMax === 'invalid') return { ok: false, field: 'quoteMax', message: 'המחיר צריך להיות מספר חיובי.' }
  if (quoteMin !== null && quoteMax !== null && quoteMin > quoteMax) {
    return { ok: false, field: 'quoteMax', message: 'המחיר העליון נמוך מהתחתון.' }
  }

  const sessions = parseAmount(draft.sessions)
  if (sessions === 'invalid' || (sessions !== null && (!Number.isInteger(sessions) || sessions > MAX_SESSIONS))) {
    return { ok: false, field: 'sessions', message: `מספר הסשנים צריך להיות מספר שלם בין 1 ל-${MAX_SESSIONS}.` }
  }

  return { ok: true, values: { title, quoteMin, quoteMax, estimatedSessions: sessions } }
}
