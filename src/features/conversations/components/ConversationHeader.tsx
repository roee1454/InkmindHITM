import {
  ChevronRight,
  EllipsisVertical,
  Bot,
  ExternalLink,
  FileText,
  ShieldCheck,
  AlertTriangle,
  Paperclip,
  Trash2,
  RotateCcw,
} from '@/components/ui/icon'
import { useQuery } from '@tanstack/react-query'
import { getCurrentStaffInfo } from '@/features/settings/server/staff'
import type { CurrentStaffInfo } from '@/features/settings/server/staff'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { UIAppointmentSummary, UIConversation } from '../types'
import { STATUS_LABEL, hasStaffActionButtons } from '../utils/labels'
import { formatPhoneForDisplay } from '@/lib/phone'
import { cn } from '@/lib/utils'
import { extractMedicalAlerts } from '@/features/health-declaration/utils/health-alerts'
import { useResetBotConversation } from '../hooks/use-reset-bot-conversation'
import { ConversationProjectChip } from './ConversationProjectChip'
import { User } from '@phosphor-icons/react'

interface ConversationHeaderProps {
  conversation: UIConversation
  appointment?: UIAppointmentSummary | null
  windowInfo: {
    status: 'open' | 'closing-soon' | 'expired'
    label: string
    percentRemaining?: number
  }
  windowExpired: boolean
  onBack?: () => void
  onTakeOver: () => void
  onResumeBot: () => void
  onOpenInspiration: () => void
  onOpenSendTemplate: () => void
  onOpenHealthDeclaration?: () => void
  onDeleteConversation: () => void
  isTakingOver: boolean
}

export function ConversationHeader({
  conversation,
  appointment,
  windowInfo,
  windowExpired,
  onBack,
  onTakeOver,
  onResumeBot,
  onOpenInspiration,
  onOpenSendTemplate,
  onOpenHealthDeclaration,
  onDeleteConversation,
  isTakingOver,
}: ConversationHeaderProps) {
  const { data: currentStaff } = useQuery<CurrentStaffInfo>({
    queryKey: ['currentStaff'],
    queryFn: () => getCurrentStaffInfo(),
  })
  const resetBot = useResetBotConversation(conversation.id)
  const displayPhone = formatPhoneForDisplay(conversation.customerPhone)
  const title = conversation.customerName || displayPhone || 'שיחה'

  const cleanPhone = (conversation.customerPhone || '').replace(/\D/g, '')
  const waWebUrl = cleanPhone ? `https://wa.me/${cleanPhone}` : null

  const hasActions = hasStaffActionButtons(conversation)
  const isBotActive = conversation.status === 'bot_active' && !hasActions
  const isEscalated = conversation.status === 'escalated' || hasActions

  const isHealthSigned = Boolean(appointment?.healthDeclarationSigned)
  const healthAlerts = isHealthSigned
    ? extractMedicalAlerts({
        answers: appointment?.healthDeclarationAnswers,
        medicalNotes: appointment?.medicalNotes,
        allergies: appointment?.allergies,
      })
    : []

  const progressColor = windowInfo.status === 'expired' ? 'bg-destructive' : 'bg-muted-foreground'

  return (
    <header className="flex-shrink-0 bg-card border-b border-border font-assistant" dir="rtl">
      <div className="flex items-center justify-between gap-3 px-4 py-3 sm:h-17">
        {/* Customer Identity */}
        <div className="flex items-center gap-3 min-w-0">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer transition-colors lg:hidden"
              aria-label="חזרה לרשימת השיחות"
            >
              <ChevronRight className="size-5" />
            </button>
          )}

          <div className="flex flex-col min-w-0 gap-0.5">
            <div className="flex items-center gap-2 min-w-0">
              <span className="truncate text-base font-bold text-foreground">
                {title}
              </span>
            </div>
            <span className="truncate text-xs text-muted-foreground tabular-nums">
              {displayPhone ? `${displayPhone} · ` : ''}
              {windowInfo.label}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Health declaration trigger badge if signed */}
          {isHealthSigned && onOpenHealthDeclaration && (
            <button
              type="button"
              onClick={onOpenHealthDeclaration}
              className={cn(
                'hidden sm:inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg border text-xs font-bold transition-all cursor-pointer',
                healthAlerts.length > 0
                  ? 'border-destructive/40 bg-destructive/10 text-destructive hover:bg-destructive/20'
                  : 'border-status-done/30 bg-status-done-soft text-status-done hover:bg-status-done/20',
              )}
              title={
                healthAlerts.length > 0
                  ? `הצהרת בריאות חתומה — ${healthAlerts.length} התראות רפואיות!`
                  : 'הצהרת בריאות חתומה ומאושרת'
              }
            >
              {healthAlerts.length > 0 ? (
                <AlertTriangle className="size-3.5 shrink-0 text-destructive" />
              ) : (
                <ShieldCheck className="size-3.5 shrink-0 text-status-done" />
              )}
              <span>{healthAlerts.length > 0 ? `בריאות (${healthAlerts.length})` : 'בריאות ✓'}</span>
            </button>
          )}

          {/* Status trigger chip button */}
          {isBotActive ? (
            <button
              type="button"
              onClick={onTakeOver}
              disabled={isTakingOver}
              className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg border border-status-done/30 bg-status-done-soft text-status-done text-xs font-bold transition-all hover:bg-status-done/20 cursor-pointer disabled:opacity-50"
              title="לחצו להשתלטות על השיחה"
            >
              <span className="size-1.5 rounded-full bg-status-done shrink-0" />
              <span>{STATUS_LABEL.bot_active}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onResumeBot}
              className={cn(
                'inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg border text-xs font-bold transition-all cursor-pointer',
                isEscalated
                  ? 'border-status-wait/30 bg-status-wait-soft text-status-wait hover:bg-status-wait/20'
                  : 'border-border bg-muted/40 text-muted-foreground hover:bg-muted',
              )}
              title="לחצו להחזרת השיחה לבוט"
            >
              <span
                className={cn(
                  'size-1.5 rounded-full shrink-0',
                  isEscalated ? 'bg-status-wait' : 'bg-muted-foreground',
                )}
              />
              <span>
                {hasActions && conversation.status === 'bot_active'
                  ? STATUS_LABEL.escalated
                  : (STATUS_LABEL[conversation.status] || conversation.status)}
              </span>
            </button>
          )}

          {/* More actions dropdown */}
          <DropdownMenu dir='rtl'>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="size-8 rounded-lg border-border text-muted-foreground hover:text-foreground cursor-pointer"
                title="פעולות נוספות"
              >
                <EllipsisVertical className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-[200px] font-assistant">
              {isBotActive ? (
                <DropdownMenuItem onClick={onTakeOver} disabled={isTakingOver} className="cursor-pointer">
                  <User className="size-4 me-2 text-warning shrink-0" />
                  <span className="text-xs whitespace-nowrap">השתלטות על השיחה</span>
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem onClick={onResumeBot} className="cursor-pointer">
                  <Bot className="size-4 me-2 text-primary shrink-0" />
                  <span className="text-xs whitespace-nowrap">החזרת שליטה לבוט</span>
                </DropdownMenuItem>
              )}

              {onOpenHealthDeclaration && (
                <DropdownMenuItem onClick={onOpenHealthDeclaration} className="cursor-pointer">
                  <ShieldCheck className="size-4 me-2 text-primary shrink-0" />
                  <span className="text-xs whitespace-nowrap">הצהרת בריאות {isHealthSigned ? '✓' : ''}</span>
                </DropdownMenuItem>
              )}

              <DropdownMenuItem onClick={onOpenInspiration} className="cursor-pointer">
                <Paperclip className="size-4 me-2 text-accent-ink shrink-0" />
                <span className="text-xs whitespace-nowrap">מסמכים</span>
              </DropdownMenuItem>

              {windowExpired && (
                <DropdownMenuItem onClick={onOpenSendTemplate} className="cursor-pointer">
                  <FileText className="size-4 me-2 text-primary shrink-0" />
                  <span className="text-xs whitespace-nowrap">שליחת תבנית מאושרת</span>
                </DropdownMenuItem>
              )}

              {waWebUrl && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild className="cursor-pointer">
                    <a href={waWebUrl} target="_blank" rel="noreferrer">
                      <ExternalLink className="size-4 me-2 text-muted-foreground shrink-0" />
                      <span className="text-xs whitespace-nowrap">פתיחה בוואטסאפ ווב</span>
                    </a>
                  </DropdownMenuItem>
                </>
              )}

              {currentStaff?.isAdmin && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => void resetBot()} className="cursor-pointer">
                    <RotateCcw className="size-4 me-2 shrink-0" />
                    <span className="text-xs whitespace-nowrap">איפוס שיחת הבוט</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={onDeleteConversation} className="cursor-pointer text-destructive focus:text-destructive">
                    <Trash2 className="size-4 me-2 shrink-0" />
                    <span className="text-xs whitespace-nowrap">מחיקת השיחה</span>
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <ConversationProjectChip conversationId={conversation.id} />

      {/* 24h Window countdown progress indicator */}
      <div
        aria-hidden="true"
        className="h-0.5 w-full bg-muted/40 overflow-hidden"
        title={`חלון 24 שעות: ${windowInfo.label}`}
      >
        <div
          className={cn('h-full transition-all duration-500', progressColor)}
          style={{ width: `${Math.min(100, Math.max(0, windowInfo.percentRemaining ?? 100))}%` }}
        />
      </div>
    </header>
  )
}

