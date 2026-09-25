import { ChevronLeft } from '@/components/ui/icon'
import { useIsMobile } from '#/hooks/useMediaQuery'

const STAGE_TRANSLATIONS: Record<string, { label: string; pill: string }> = {
  // Lowercase legacy keys
  new: { label: 'פנייה חדשה', pill: 'bg-muted text-muted-foreground' },
  intake: { label: 'איסוף פרטים', pill: 'bg-muted text-muted-foreground' },
  awaiting_price: { label: 'ממתין להצעת מחיר', pill: 'bg-primary/10 text-primary' },
  awaiting_payment: { label: 'ממתין למקדמה', pill: 'bg-warning/12 text-warning' },
  booked: { label: 'נקבע תור', pill: 'bg-success/12 text-success' },
  expired: { label: 'פג תוקף', pill: 'bg-destructive/10 text-destructive' },
  // LeadStage uppercase keys
  NEW: { label: 'ליד חדש', pill: 'bg-muted text-muted-foreground' },
  WANTS_TO_BOOK: { label: 'בירור מסלול', pill: 'bg-muted text-muted-foreground' },
  COLLECTING_INFO: { label: 'איסוף פרטים', pill: 'bg-muted text-muted-foreground' },
  WAITLIST: { label: 'רשימת המתנה', pill: 'bg-muted text-muted-foreground' },
  AWAIT_PRICE_OFFER: { label: 'ממתין לתמחור', pill: 'bg-primary/10 text-primary' },
  AWAIT_HEALTH_NOTICE: { label: 'הצהרת בריאות', pill: 'bg-primary/10 text-primary' },
  AWAIT_PAYMENT: { label: 'ממתין למקדמה', pill: 'bg-warning/12 text-warning' },
  AWAIT_FINAL_CONFIRMATION: { label: 'אישור סופי', pill: 'bg-warning/12 text-warning' },
  AWAITING_APPOINTMENT: { label: 'נקבע תור', pill: 'bg-success/12 text-success' },
  PROJECT_IN_PROGRESS: { label: 'באמצע פרויקט', pill: 'bg-accent-soft text-accent-ink' },
  AWAIT_NPS_SCORE: { label: 'משוב ודירוג', pill: 'bg-success/12 text-success' },
  COMPLETED: { label: 'סגור / הושלם', pill: 'bg-success/12 text-success' },
}

/** Row caps that the card's fixed height is sized around — keep the two in step. */
const VISIBLE_MOBILE = 3
const VISIBLE_DESKTOP = 4

interface RecentLeadsCardProps {
  leads: Array<{
    chatId: string
    name: string | null
    stage: string
    style: string | null
  }>
  onViewAll: () => void
  onLeadClick: (chatId: string) => void
}

export function RecentLeadsCard({ leads, onViewAll, onLeadClick }: RecentLeadsCardProps) {
  const isMobile = useIsMobile()
  const visibleLeads = leads.slice(0, isMobile ? VISIBLE_MOBILE : VISIBLE_DESKTOP)

  return (
    // Fixed height, matching CloseAppointmentsCard exactly: the two sit side by side in a
    // grid, so a card that sizes to its rows leaves the pair ragged whenever one has fewer
    // leads than the other — or no leads at all.
    <div className="card-native flex h-65 flex-col overflow-hidden sm:h-84">
      <div className="flex items-center justify-between gap-3 px-5 pt-4 pb-3 sm:px-6 sm:pt-5">
        <div className="flex items-center gap-2">
          <h3 className="text-base font-extrabold text-foreground">פניות אחרונות</h3>
          {leads.length > 0 && (
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-bold text-muted-foreground">
              {leads.length}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={onViewAll}
          className="flex cursor-pointer items-center gap-0.5 text-xs font-bold text-primary transition-colors hover:underline"
        >
          <span>הכל</span>
          <ChevronLeft size={14} />
        </button>
      </div>

      {visibleLeads.length > 0 ? (
        <div className="min-h-0 flex-1 divide-y divide-border/60 overflow-hidden">
          {visibleLeads.map((lead) => {
            const translation = STAGE_TRANSLATIONS[lead.stage] ?? {
              label: lead.stage,
              pill: 'bg-muted text-muted-foreground',
            }
            const displayName = lead.name || 'לקוח ללא שם'

            return (
              <div
                key={lead.chatId}
                onClick={() => onLeadClick(lead.chatId)}
                className="flex cursor-pointer select-none items-center justify-between gap-3 px-5 py-3.5 transition-colors hover:bg-muted/40 active:bg-muted sm:px-6"
              >
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-extrabold text-foreground">
                    {displayName}
                  </div>
                  <div className="truncate text-xs font-medium text-muted-foreground">
                    {lead.style || 'פנייה כללית'}
                  </div>
                </div>
                <span className={`pill shrink-0 ${translation.pill}`}>{translation.label}</span>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 items-center justify-center px-5 text-center text-sm font-semibold text-muted-foreground">
          אין פניות אחרונות במערכת
        </div>
      )}
    </div>
  )
}
export default RecentLeadsCard
