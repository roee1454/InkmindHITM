import { ChevronRight, ShieldAlert, ShieldCheck } from '@/components/ui/icon'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { formatPhoneForDisplay } from '@/lib/phone'
import { extractMedicalAlerts } from '@/features/health-declaration/utils/health-alerts'
import { hasStaffActionButtons } from '../utils/labels'
import type { WindowRemaining } from '../utils/format'
import type { UIAppointmentSummary, UIConversation } from '../types'
import { ConversationProjectChip } from './ConversationProjectChip'
import { ConversationMenu } from './ConversationMenu'
import type { ThreadDialog } from './ConversationDialogs'

interface ConversationHeaderProps {
  conversation: UIConversation
  appointment: UIAppointmentSummary | null
  windowInfo: WindowRemaining
  onBack?: () => void
  onTakeOver: () => void
  isTakingOver: boolean
  onOpenDialog: (dialog: ThreadDialog) => void
}

/**
 * Who this is, who answers them right now, and the one control that changes that. The 24h window
 * shows up only when it matters (under 12 hours, or closed); everything else is in the menu.
 */
export function ConversationHeader({ conversation, appointment, windowInfo, onBack, onTakeOver, isTakingOver, onOpenDialog }: ConversationHeaderProps) {
  const phone = formatPhoneForDisplay(conversation.customerPhone)
  const title = conversation.customerName || phone || 'שיחה'
  const needsStaff = hasStaffActionButtons(conversation)
  const botAnswering = conversation.status === 'bot_active' && !needsStaff
  const answering = botAnswering ? 'הבוט עונה' : needsStaff ? 'ממתין למענה' : 'בטיפול צוות'

  const healthSigned = Boolean(appointment?.healthDeclarationSigned)
  const healthAlerts = healthSigned
    ? extractMedicalAlerts({ answers: appointment?.healthDeclarationAnswers, medicalNotes: appointment?.medicalNotes, allergies: appointment?.allergies })
    : []

  const subtitle = [conversation.customerName ? phone : '', windowInfo.status === 'open' ? '' : windowInfo.label].filter(Boolean)

  return (
    <header className="shrink-0 border-b border-border bg-card font-assistant" dir="rtl">
      <div className="flex h-16 items-center gap-2 px-3 sm:px-4">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            aria-label="חזרה לרשימת השיחות"
            className="flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground lg:hidden"
          >
            <ChevronRight className="size-5" />
          </button>
        )}

        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <h2 className="truncate text-base font-bold text-foreground">{title}</h2>
          {subtitle.length > 0 && (
            <p className="flex min-w-0 items-center gap-1.5 text-sm text-muted-foreground tabular-nums">
              {subtitle.map((part, i) => (
                <span key={part} className={cn('truncate', i > 0 && "before:me-1.5 before:content-['·']", part === windowInfo.label && windowInfo.status === 'expired' && 'font-semibold text-foreground')}>
                  {part}
                </span>
              ))}
            </p>
          )}
        </div>

        {healthSigned && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onOpenDialog('health')}
            aria-label={healthAlerts.length > 0 ? `הצהרת בריאות: ${healthAlerts.length} דברים לשים לב אליהם` : 'הצהרת בריאות חתומה'}
            title={healthAlerts.length > 0 ? `${healthAlerts.length} דברים לשים לב אליהם בהצהרת הבריאות` : 'הצהרת בריאות חתומה'}
            className={cn('size-9 rounded-lg hover:bg-muted', healthAlerts.length > 0 ? 'text-destructive' : 'text-muted-foreground hover:text-foreground')}
          >
            {healthAlerts.length > 0 ? <ShieldAlert className="size-5" /> : <ShieldCheck className="size-5" />}
          </Button>
        )}

        <span className={cn('hidden shrink-0 items-center gap-1.5 text-sm sm:flex', needsStaff ? 'font-bold text-foreground' : 'text-muted-foreground')}>
          <span aria-hidden className={cn('size-1.5 rounded-full', botAnswering ? 'bg-status-done' : needsStaff ? 'bg-status-wait' : 'bg-muted-foreground')} />
          {answering}
        </span>
        {botAnswering ? (
          <Button size="sm" variant="outline" onClick={onTakeOver} disabled={isTakingOver} className="h-9 px-3">
            {isTakingOver ? 'משתלט…' : 'השתלטות'}
          </Button>
        ) : (
          <Button size="sm" variant="outline" onClick={() => onOpenDialog('resume-bot')} className="h-9 px-3">
            החזרה לבוט
          </Button>
        )}

        <ConversationMenu
          conversationId={conversation.id}
          customerPhone={conversation.customerPhone}
          windowExpired={windowInfo.status === 'expired'}
          onOpenDialog={onOpenDialog}
        />
      </div>

      <ConversationProjectChip conversationId={conversation.id} />
    </header>
  )
}
