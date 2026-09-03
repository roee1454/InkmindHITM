import { useState } from 'react'
import { Check, Pencil, RotateCcw, X } from 'lucide-react'
import { useMcpUiStore } from '../store/mcpUiStore'
import type { McpAction } from '../types'

// Exported for `tool-registration.test.ts` — checks every registered write tool has a label here.
export const TOOL_LABELS: Record<string, string> = {
  reschedule_appointment: 'העברת תור',
  cancel_appointment: 'ביטול תור',
  create_appointment: 'קביעת תור חדש',
  block_artist_time: 'חסימת זמן ביומן',
  mark_appointment_status: 'עדכון סטטוס תור',
  update_lead_stage: 'שינוי שלב ליד',
  add_customer_note: 'הוספת הערה ללקוח/ה',
  send_reminder: 'שליחת תזכורת',
  send_update_message: 'שליחת הודעת עדכון',
  request_review: 'בקשת ביקורת',
  add_to_waitlist: 'הוספה לרשימת המתנה',
  remove_from_waitlist: 'הסרה מרשימת המתנה',
  offer_waitlist_slot: 'הצעת משבצת מוקדמת ללקוח/ה',
}

// Internal identifiers a staff member has no reason to hand-edit — everything else in `args`
// renders as a plain editable field in `editing` mode. A generic key/value form rather than a
// bespoke picker per tool (a real date/time picker, a stage <select>, …) is a deliberate v1
// scope trim: it keeps one component covering every write tool instead of one per tool, at the
// cost of the mockup's richer per-field controls (MCP-08's calendar popover).
const HIDDEN_ARG_KEYS = new Set(['appointmentId', 'customerId', 'staffId', 'waitlistEntryId', 'freedAppointmentId'])

interface McpActionCardProps {
  action: McpAction
  onApprove: () => void
  onCancel: () => void
  onUndo: () => void
  onStartEdit: () => void
  onSaveEdit: (args: Record<string, unknown>) => void
  onDiscardEdit: () => void
  busy?: boolean
}

export function McpActionCard({ action, onApprove, onCancel, onUndo, onStartEdit, onSaveEdit, onDiscardEdit, busy }: McpActionCardProps) {
  const draftEdits = useMcpUiStore((s) => s.draftEdits)
  const setDraftEdit = useMcpUiStore((s) => s.setDraftEdit)
  const [error, setError] = useState<string | null>(null)

  const label = TOOL_LABELS[action.toolName] || action.toolName
  const editableEntries = Object.entries(action.args).filter(([k]) => !HIDDEN_ARG_KEYS.has(k))
  const draft = draftEdits[action.id] ?? action.args

  if (action.status === 'cancelled') {
    return (
      <div className="w-full rounded-2xl border border-border bg-muted/40 px-3.5 py-3 opacity-70">
        <p className="text-[13px] font-bold text-muted-foreground">{label} — בוטל</p>
      </div>
    )
  }

  if (action.status === 'done') {
    const undoAvailable = action.undoExpiresAt && new Date(action.undoExpiresAt).getTime() > Date.now()
    return (
      <div className="w-full overflow-hidden rounded-2xl border border-emerald-500/30">
        <div className="flex items-center gap-2.5 bg-emerald-500/10 px-3 py-2.5">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-[9px] bg-card text-emerald-600 dark:text-emerald-400">
            <Check size={15} />
          </span>
          <p className="flex-1 text-[13.5px] font-extrabold text-foreground">{action.diff.summary}</p>
        </div>
        {undoAvailable && (
          <button
            type="button"
            onClick={onUndo}
            disabled={busy}
            className="flex w-full cursor-pointer items-center justify-center gap-1.5 border-t border-border py-2.5 text-[13px] font-bold text-muted-foreground disabled:opacity-50"
          >
            <RotateCcw size={14} />
            ביטול הפעולה
          </button>
        )}
      </div>
    )
  }

  if (action.status === 'executing') {
    return (
      <div className="flex w-full items-center gap-2.5 rounded-2xl bg-muted px-3.5 py-3">
        <span className="flex gap-1">
          <span className="size-1.5 animate-pulse rounded-full bg-muted-foreground" />
          <span className="size-1.5 animate-pulse rounded-full bg-muted-foreground [animation-delay:150ms]" />
          <span className="size-1.5 animate-pulse rounded-full bg-muted-foreground [animation-delay:300ms]" />
        </span>
        <span className="text-[13px] font-bold text-muted-foreground">מבצע…</span>
      </div>
    )
  }

  if (action.status === 'editing') {
    return (
      <div className="w-full overflow-hidden rounded-2xl border-[1.5px] border-primary bg-card shadow-sm">
        <div className="flex items-center gap-2.5 bg-primary/10 px-3 py-2.5">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-[9px] bg-card text-primary">
            <Pencil size={14} />
          </span>
          <p className="flex-1 text-[13.5px] font-extrabold text-foreground">{label} — עריכה</p>
          <span className="shrink-0 rounded-full bg-card px-2.5 py-1 text-[11px] font-extrabold text-primary">טרם בוצע</span>
        </div>

        <div className="flex flex-col gap-2.5 p-3">
          {editableEntries.map(([key]) => (
            <label key={key} className="flex flex-col gap-1">
              <span className="text-[11.5px] font-bold text-muted-foreground">{key}</span>
              <input
                type="text"
                value={String(draft[key] ?? '')}
                onChange={(e) => setDraftEdit(action.id, { ...draft, [key]: e.target.value })}
                className="h-10 rounded-xl border border-border bg-background px-3 text-[13.5px] font-semibold text-foreground outline-none focus:border-primary"
              />
            </label>
          ))}
          {error && <p className="text-[12px] font-semibold text-destructive">{error}</p>}

          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                setError(null)
                onSaveEdit(draft)
              }}
              className="flex h-11 flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-xl bg-primary text-[13.5px] font-extrabold text-primary-foreground shadow-sm disabled:opacity-50"
            >
              <Check size={15} />
              אשר ובצע
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={onDiscardEdit}
              className="h-11 shrink-0 cursor-pointer rounded-xl border border-border px-4 text-[13.5px] font-bold text-foreground disabled:opacity-50"
            >
              ביטול
            </button>
          </div>
        </div>
      </div>
    )
  }

  // pending
  return (
    <div className="w-full overflow-hidden rounded-2xl border-[1.5px] border-primary bg-primary/10">
      <div className="flex flex-col gap-2.5 p-3">
        <div className="flex items-center gap-2.5">
          <div className="min-w-0 flex-1">
            <p className="text-[13.5px] font-extrabold text-foreground">{label}</p>
          </div>
          <span className="shrink-0 rounded-full bg-amber-500/15 px-2.5 py-1 text-[11px] font-extrabold text-amber-600 dark:text-amber-400">
            דורש אישור
          </span>
          <button type="button" onClick={onCancel} className="shrink-0 cursor-pointer text-muted-foreground">
            <X size={16} />
          </button>
        </div>

        <div className="flex flex-col gap-1.5">
          {action.diff.rows.map((row, i) => (
            <div key={i} className="flex items-center gap-2 rounded-xl bg-card px-2.5 py-2">
              <span className="flex-1 truncate text-[13px] font-bold text-foreground">{row.label}</span>
              <span className="truncate text-[12px] font-semibold text-muted-foreground line-through">{row.before}</span>
              <span className="truncate text-[12px] font-extrabold text-primary">{row.after}</span>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={onApprove}
            className="flex h-[42px] flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-[13px] bg-primary text-[14px] font-extrabold text-primary-foreground disabled:opacity-50"
          >
            <Check size={16} />
            אשר ובצע
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onStartEdit}
            className="h-[42px] shrink-0 cursor-pointer rounded-[13px] border border-border bg-card px-3.5 text-[14px] font-bold text-foreground disabled:opacity-50"
          >
            עריכה
          </button>
        </div>
      </div>
    </div>
  )
}
