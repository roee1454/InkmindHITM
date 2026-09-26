import { ChevronLeft } from '@/components/ui/icon'
import { conversationStateLabel } from '@/features/conversations/utils/labels'
import { useIsMobile } from '#/hooks/useMediaQuery'

/** Pill color per bot dialogue state; the label comes from CONVERSATION_STATE_LABELS. */
const STAGE_PILL: Partial<Record<string, string>> = {
  AWAIT_PRICE_OFFER: 'bg-primary/10 text-primary',
  AWAIT_HEALTH_NOTICE: 'bg-primary/10 text-primary',
  AWAIT_PAYMENT: 'bg-warning/12 text-warning',
  AWAIT_FINAL_CONFIRMATION: 'bg-warning/12 text-warning',
  AWAITING_APPOINTMENT: 'bg-success/12 text-success',
  PROJECT_IN_PROGRESS: 'bg-accent-soft text-accent-ink',
  AWAIT_NPS_SCORE: 'bg-success/12 text-success',
  COMPLETED: 'bg-success/12 text-success',
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
            const translation = {
              label: conversationStateLabel(lead.stage),
              pill: STAGE_PILL[lead.stage] ?? 'bg-muted text-muted-foreground',
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
