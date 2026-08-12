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
    <div className="card-native flex flex-col">
      <div className="flex items-center justify-between gap-3 px-5 pt-4 pb-3">
        <h3 className="text-[16.5px] font-extrabold text-foreground">פניות אחרונות</h3>
        <button type="button" onClick={onViewAll} className="cursor-pointer text-[13.5px] font-bold text-primary">
          הכל
        </button>
      </div>

      {visibleLeads.length > 0 ? (
        visibleLeads.map((lead) => {
          const translation = STAGE_TRANSLATIONS[lead.stage] ?? { label: lead.stage, pill: 'bg-muted text-muted-foreground' }
          const displayName = lead.name || 'לקוח ללא שם'
          const initial = displayName.charAt(0)

          return (
            <div key={lead.chatId} onClick={() => onLeadClick(lead.chatId)} className="row-native cursor-pointer">
              <div className="avatar-native">{initial}</div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[15px] font-bold text-foreground">{displayName}</div>
                <div className="truncate text-[13px] text-muted-foreground">{lead.style || 'פנייה כללית'}</div>
              </div>
              <span className={`pill shrink-0 ${translation.pill}`}>{translation.label}</span>
            </div>
          )
        })
      ) : (
        <div className="flex items-center justify-center px-5 py-8 text-sm text-muted-foreground">
          אין פניות אחרונות במערכת
        </div>
      )}
    </div>
  )
}
export default RecentLeadsCard
