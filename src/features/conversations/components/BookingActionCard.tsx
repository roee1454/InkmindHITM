import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CalendarClock, HandCoins, ReceiptText, Send } from 'lucide-react'
import { confirmSlot } from '@/features/calendar/server/appointments'
import { takeOverConversation, getActiveAppointmentSummary } from '../server/messages'
import { formatDuration, formatPriceRange } from '../lib/format'
import { PriceQuoteSheet } from './sheets/PriceQuoteSheet'
import { ReceiptVerificationSheet } from './sheets/ReceiptVerificationSheet'
import type { UIAppointmentSummary, UIConversation } from '../types'

/**
 * The four HITL blocks (HITL-2/3/7 + the new slot-confirm gate), inline in the message feed.
 * They're independent axes and can show simultaneously — e.g. a fresh AWAIT_PRICE_OFFER
 * conversation shows both Quote (price not set) and Slot confirm (bot-proposed date/time not
 * yet sanity-checked by staff) at once.
 */
export function BookingActionCard({
  conversation,
  receiptImageUrl,
  onZoomReceipt,
}: {
  conversation: UIConversation
  /** Most recent verification-tagged image in the thread, if any — feeds the receipt sheet. */
  receiptImageUrl?: string
  onZoomReceipt?: (url: string) => void
}) {
  const queryClient = useQueryClient()
  const [quoteOpen, setQuoteOpen] = useState(false)
  const [receiptOpen, setReceiptOpen] = useState(false)

  const showQuote = conversation.state === 'AWAIT_PRICE_OFFER'
  const showReceiptApprove =
    conversation.state === 'AWAIT_PAYMENT' && conversation.staffCallReason === 'receipt_verification'

  const { data: appointment } = useQuery<UIAppointmentSummary | null>({
    queryKey: ['appointment-summary', conversation.id],
    queryFn: () => getActiveAppointmentSummary({ data: { conversationId: conversation.id } }),
  })

  const showSlotConfirm = Boolean(appointment && appointment.status === 'pending' && !appointment.slotConfirmed)

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['conversations'] })
    queryClient.invalidateQueries({ queryKey: ['messages', conversation.id] })
    queryClient.invalidateQueries({ queryKey: ['appointment-summary', conversation.id] })
    queryClient.invalidateQueries({ queryKey: ['appointments'] })
  }

  const takeOverMutation = useMutation({
    mutationFn: () => takeOverConversation({ data: { conversationId: conversation.id } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['conversations'] }),
  })

  const confirmSlotMutation = useMutation({
    mutationFn: () => confirmSlot({ data: { appointmentId: appointment!.id } }),
    onSuccess: invalidateAll,
  })

  if (!showQuote && !showReceiptApprove && !showSlotConfirm) return null

  return (
    <div className="flex flex-col gap-2 border-b border-border/60 bg-card px-3.5 py-3">
      {showQuote && (
        <div className="hitl-row flex-col items-stretch gap-1.5 p-2.5">
          <div className="flex items-center gap-1.5">
            <HandCoins size={14} className="shrink-0 text-primary" />
            <span className="text-[13px] font-extrabold text-foreground">נדרש אישור שלך — תמחור</span>
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            <div className="flex h-[34px] flex-col items-center justify-center rounded-xl bg-muted/60">
              <span className="text-[9.5px] font-bold text-muted-foreground">משך</span>
              <span className="text-[12px] font-extrabold text-foreground">
                {appointment ? formatDuration(appointment.durationMinutes) : '—'}
              </span>
            </div>
            <div className="flex h-[34px] flex-col items-center justify-center rounded-xl bg-muted/60">
              <span className="text-[9.5px] font-bold text-muted-foreground">טווח מחיר</span>
              <span className="text-[12px] font-extrabold text-foreground">
                {appointment ? formatPriceRange(appointment.priceMinIls, appointment.priceMaxIls) : '—'}
              </span>
            </div>
            <div className="flex h-[34px] flex-col items-center justify-center rounded-xl bg-muted/60">
              <span className="text-[9.5px] font-bold text-muted-foreground">מקדמה</span>
              <span className="text-[12px] font-extrabold text-foreground">
                {appointment?.depositAmount != null ? `₪${appointment.depositAmount.toLocaleString()}` : '—'}
              </span>
            </div>
          </div>
          <button type="button" onClick={() => setQuoteOpen(true)} className="hitl-action h-9 w-full text-[13px]">
            <Send size={14} className="me-1.5" />
            שליחת הצעה ללקוח
          </button>
        </div>
      )}

      {showSlotConfirm && appointment && (
        <div className="hitl-row">
          <CalendarClock size={14} className="shrink-0 text-primary" />
          <span className="flex-1 truncate text-[11.5px] font-bold text-foreground">
            מועד: {appointment.date} · {appointment.timeSlot}
          </span>
          <button
            type="button"
            disabled={confirmSlotMutation.isPending}
            onClick={() => confirmSlotMutation.mutate()}
            className="hitl-action"
          >
            אישור
          </button>
        </div>
      )}

      {showReceiptApprove && (
        <div className="hitl-row">
          <ReceiptText size={14} className="shrink-0 text-primary" />
          <span className="flex-1 truncate text-[11.5px] font-bold text-foreground">
            אסמכתה: {appointment?.depositAmount != null ? `₪${appointment.depositAmount.toLocaleString()}` : 'ממתינה לבדיקה'}
          </span>
          <button type="button" onClick={() => setReceiptOpen(true)} className="hitl-action">
            אישור
          </button>
        </div>
      )}

      {(takeOverMutation.error || confirmSlotMutation.error) && (
        <p className="text-[12px] font-bold text-destructive">
          {(takeOverMutation.error ?? confirmSlotMutation.error)?.message}
        </p>
      )}

      {appointment && showQuote && (
        <PriceQuoteSheet
          open={quoteOpen}
          onOpenChange={setQuoteOpen}
          appointmentId={appointment.id}
          initialPriceMin={appointment.priceMinIls != null ? String(appointment.priceMinIls) : ''}
          initialPriceMax={appointment.priceMaxIls != null ? String(appointment.priceMaxIls) : ''}
          initialDeposit={appointment.depositAmount != null ? String(appointment.depositAmount) : '350'}
          initialDurationMinutes={appointment.durationMinutes}
          onSuccess={() => {
            setQuoteOpen(false)
            invalidateAll()
          }}
          onTakeover={() => takeOverMutation.mutate()}
          isTakingOver={takeOverMutation.isPending}
        />
      )}

      {showReceiptApprove && (
        <ReceiptVerificationSheet
          open={receiptOpen}
          onOpenChange={setReceiptOpen}
          conversationId={conversation.id}
          initialAmount={appointment?.depositAmount != null ? String(appointment.depositAmount) : ''}
          receiptImageUrl={receiptImageUrl}
          onZoomImage={onZoomReceipt}
          onSuccess={() => {
            setReceiptOpen(false)
            invalidateAll()
          }}
          onTakeover={() => takeOverMutation.mutate()}
          isTakingOver={takeOverMutation.isPending}
        />
      )}
    </div>
  )
}
