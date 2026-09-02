import { ChevronLeft } from 'lucide-react'
import { useIsMobile } from '@/hooks/use-media-query'

const STAGE_TRANSLATIONS: Record<string, { label: string; pill: string }> = {
  new: { label: 'פנייה חדשה', pill: 'bg-muted text-muted-foreground' },
  intake: { label: 'איסוף פרטים', pill: 'bg-muted text-muted-foreground' },
  awaiting_price: { label: 'ממתין להצעת מחיר', pill: 'bg-primary/10 text-primary' },
  awaiting_payment: { label: 'ממתין למקדמה', pill: 'bg-warning/12 text-warning' },
  booked: { label: 'נקבע תור', pill: 'bg-success/12 text-success' },
  expired: { label: 'פג תוקף', pill: 'bg-destructive/10 text-destructive' },
}

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
  const visibleLeads = leads.slice(0, isMobile ? 3 : 4)

  return (
    <div className="flex flex-col rounded-2xl border border-border/80 bg-card shadow-2xs sm:rounded-3xl">
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
        <div className="divide-y divide-border/60">
          {visibleLeads.map((lead) => {
            const translation = STAGE_TRANSLATIONS[lead.stage] ?? {
              label: lead.stage,
              pill: 'bg-muted text-muted-foreground',
            }
            const displayName = lead.name || 'לקוח ללא שם'
            const initial = displayName.charAt(0)

            return (
              <div
                key={lead.chatId}
                onClick={() => onLeadClick(lead.chatId)}
                className="flex cursor-pointer select-none items-center gap-3.5 px-5 py-3.5 transition-colors hover:bg-muted/40 active:bg-muted sm:px-6"
              >
                <div className="avatar-native size-10 shrink-0 text-sm">
                  {initial}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[14.5px] font-extrabold text-foreground">
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
        <div className="flex flex-col items-center justify-center px-5 py-10 text-center text-sm font-semibold text-muted-foreground">
          אין פניות אחרונות במערכת
        </div>
      )}
    </div>
  )
}
export default RecentLeadsCard
