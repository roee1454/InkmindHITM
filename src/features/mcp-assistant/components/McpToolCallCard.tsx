import { useState } from 'react'
import { AlertCircle, ChevronDown, Database } from 'lucide-react'
import type { McpToolCallSummary } from '../types'

// Exported for `tool-registration.test.ts` — checks every registered write tool has a label here.
export const TOOL_LABELS: Record<string, string> = {
  list_appointments: 'רשימת תורים',
  find_free_slots: 'חיפוש חלונות פנויים',
  reschedule_appointment: 'הצעת העברת תור',
  cancel_appointment: 'הצעת ביטול תור',
  create_appointment: 'הצעת קביעת תור',
  mark_appointment_status: 'הצעת עדכון סטטוס',
  search_leads: 'חיפוש לידים',
  get_lead: 'פרטי ליד',
  update_lead_stage: 'הצעת שינוי שלב',
  get_customer: 'פרטי לקוח/ה',
  add_customer_note: 'הצעת הוספת הערה',
  list_unpaid_deposits: 'תורים ללא מקדמה',
  list_payments: 'רשימת תשלומים',
  get_business_summary: 'סיכום עסקי',
  send_reminder: 'הצעת תזכורת',
  send_update_message: 'הצעת הודעת עדכון',
  request_review: 'הצעת בקשת ביקורת',
  add_to_waitlist: 'הצעת הוספה לרשימת המתנה',
  list_waitlist: 'רשימת המתנה',
  remove_from_waitlist: 'הצעת הסרה מרשימת המתנה',
  offer_waitlist_slot: 'הצעת פנייה ללקוח/ה',
  record_waitlist_response: 'רישום תשובת לקוח/ה',
  list_staff: 'רשימת צוות',
}

interface McpToolCallCardProps {
  call: McpToolCallSummary
}

/** Collapsed by default: a small one-line chip (icon + label + row count) so a turn with several
 *  tool calls stays scannable. Clicking it reveals the raw tool name, the summary line and the
 *  first-20-rows payload. */
export function McpToolCallCard({ call }: McpToolCallCardProps) {
  const [expanded, setExpanded] = useState(false)
  const label = TOOL_LABELS[call.toolName] || call.toolName
  const hasData = call.data != null
  const isError = call.status === 'error'

  return (
    <div
      className="w-fit max-w-full self-start overflow-hidden rounded-lg border border-border bg-card/60"
    >
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        className="flex w-full cursor-pointer items-center gap-1.5 px-2.5 py-1"
      >
        <span className={`shrink-0 ${isError ? 'text-destructive' : 'text-muted-foreground'}`}>
          {isError ? <AlertCircle size={12} /> : <Database size={12} />}
        </span>
        <span className={`truncate text-[11.5px] font-semibold ${isError ? 'text-destructive' : 'text-muted-foreground'}`}>
          {label}
          {typeof call.rowCount === 'number' ? ` · ${call.rowCount}` : ''}
        </span>
        <ChevronDown
          size={12}
          className={`shrink-0 text-muted-foreground/70 transition-transform ${expanded ? 'rotate-180' : ''}`}
        />
      </button>

      {expanded && (
        <div className="border-t border-border px-2.5 py-2">
          <p dir="ltr" className="text-right font-mono text-[11px] text-muted-foreground">{call.toolName}</p>
          <p className="mt-1 text-[12px] font-semibold text-foreground">
            {call.summary}
            {typeof call.rowCount === 'number' ? ` · ${call.rowCount} רשומות` : ''}
          </p>
          {hasData && (
            <pre dir="ltr" className="mt-2 max-h-48 overflow-auto rounded-xl bg-muted p-2.5 text-right font-mono text-[11px] leading-relaxed text-foreground">
              {JSON.stringify(call.data, null, 2)}
            </pre>
          )}
        </div>
      )}
    </div>
  )
}
