import { useNavigate } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { MessageSquare } from '@/components/ui/icon'
import { formatPhoneForDisplay } from '@/lib/phone'
import type { LeadWithoutProject } from '@/features/projects/types'
import { SOURCE_LABELS } from '../types'
import { formatLeadDate } from '../utils/format'

/** Customers who talked to the studio but never asked to book: no project, nothing in the funnel. */
export function LeadsWithoutProjectList({ leads }: { leads: LeadWithoutProject[] }) {
  const navigate = useNavigate()
  return (
    <div className="card-native overflow-hidden font-assistant" dir="rtl">
      {leads.map((lead) => (
        <div key={lead.customerId} className="row-native justify-between">
          <div className="min-w-0 flex-1">
            <div className="truncate font-bold text-foreground">{lead.name || 'לקוח ללא שם'}</div>
            <div className="truncate text-xs text-muted-foreground">
              <span dir="ltr">{formatPhoneForDisplay(lead.phone)}</span>
              {lead.source && ` · ${SOURCE_LABELS[lead.source] ?? lead.source}`} · {formatLeadDate(lead.updatedAt)}
            </div>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={!lead.conversationId}
            onClick={() => lead.conversationId && navigate({ to: '/dashboard/conversations', search: { chatId: lead.conversationId } })}
            className="h-9 gap-1.5 px-3 text-primary"
          >
            <MessageSquare className="size-4" />
            שיחה
          </Button>
        </div>
      ))}
    </div>
  )
}
