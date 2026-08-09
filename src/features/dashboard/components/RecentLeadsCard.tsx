const STAGE_TRANSLATIONS: Record<string, { label: string; color: string }> = {
  new: { label: 'פנייה חדשה', color: 'bg-muted-foreground/10 text-muted-foreground border-muted-foreground/20' },
  intake: { label: 'איסוף פרטים', color: 'bg-blue-500/10 text-blue-500 border-blue-500/20' },
  awaiting_price: { label: 'ממתין להצעת מחיר', color: 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20' },
  awaiting_payment: { label: 'ממתין למקדמה', color: 'bg-amber-500/10 text-amber-500 border-amber-500/20' },
  booked: { label: 'נקבע תור', color: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' },
  expired: { label: 'פג תוקף', color: 'bg-rose-500/10 text-rose-500 border-rose-500/20' },
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
  return (
    <div className="flex h-[18rem] md:h-[22rem] lg:h-[30rem] flex-col rounded-2xl border border-border bg-card py-6">
      <div className="mb-6 flex items-center justify-between px-6">
        <h3 className="font-assistant text-xl font-bold text-foreground">פניות אחרונות</h3>
        <button
          type="button"
          onClick={onViewAll}
          className="cursor-pointer font-assistant text-xs font-bold text-primary hover:underline"
        >
          כל הפניות
        </button>
      </div>

      <div className="flex-1 overflow-y-auto pr-1">
        {leads.length > 0 ? (
          leads.map((lead) => {
            const translation =
              STAGE_TRANSLATIONS[lead.stage] ??
              { label: lead.stage, color: 'bg-muted-foreground/10 text-muted-foreground border-muted-foreground/20' }
            const displayName = lead.name || 'לקוח ללא שם'
            const initial = displayName.charAt(0)

            return (
              <div
                key={lead.chatId}
                onClick={() => onLeadClick(lead.chatId)}
                className="flex cursor-pointer items-center justify-between border-b border-border/45 bg-transparent px-6 py-3 transition-colors last:border-b-0 hover:bg-muted/15"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-primary/30 bg-primary/15 font-assistant text-sm font-bold text-primary">
                    {initial}
                  </div>
                  <div className="min-w-0">
                    <div className="truncate font-assistant text-sm font-bold text-foreground">{displayName}</div>
                    <div className="max-w-[60vw] md:max-w-[200px] truncate font-assistant text-mini text-muted-foreground/70 hidden md:block">
                      {lead.style || 'פנייה כללית'}
                    </div>
                  </div>
                </div>
                <span className={`inline-block shrink-0 border px-2 py-0.5 font-assistant text-micro font-bold ${translation.color}`}>
                  {translation.label}
                </span>
              </div>
            )
          })
        ) : (
          <div className="flex h-full items-center justify-center font-assistant text-sm text-muted-foreground">
            אין פניות אחרונות במערכת
          </div>
        )}
      </div>
    </div>
  )
}
export default RecentLeadsCard
