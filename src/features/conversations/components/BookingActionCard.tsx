import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { BadgeCheck, SendHorizontal, Tag } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { DatePicker } from '@/components/ui/date-picker'
import { HourPicker } from '@/components/ui/hour-picker'
import { sendPriceQuoteToCustomer } from '@/features/calendar/server/appointments'
import { confirmDepositReceived, getActiveAppointmentSummary } from '../server/messages'
import type { UIConversation } from '../types'

/**
 * Inline HITL action card (HITL-2/3/7): the two human gates of the booking funnel —
 * pricing a pending hold, and confirming a deposit — handled inside the conversation
 * they belong to. Pricing used to live in the calendar screen (the escalation
 * notification literally sent staff away from the chat they had just read), and the
 * deposit-confirm button showed no payload at all: an approval with nothing to review.
 */
export function BookingActionCard({ conversation }: { conversation: UIConversation }) {
  const queryClient = useQueryClient()

  const showPricing = conversation.state === 'AWAIT_PRICE_OFFER'
  const showDepositConfirm =
    conversation.state === 'AWAIT_PAYMENT' && conversation.staffCallReason === 'receipt_verification'
  const active = showPricing || showDepositConfirm

  const { data: appointment, isLoading } = useQuery({
    queryKey: ['appointment-summary', conversation.id],
    queryFn: () => getActiveAppointmentSummary({ data: { conversationId: conversation.id } }),
    enabled: active,
  })

  // Editable fields, seeded from the hold the bot created. Keyed on appointment id so a
  // different appointment re-seeds, but staff edits survive background refetches.
  const [price, setPrice] = useState('')
  const [deposit, setDeposit] = useState('')
  const [date, setDate] = useState('')
  const [timeSlot, setTimeSlot] = useState('')
  useEffect(() => {
    if (!appointment) return
    setPrice(appointment.priceIls != null ? String(appointment.priceIls) : '')
    setDeposit(appointment.depositAmount != null ? String(appointment.depositAmount) : '')
    setDate(appointment.date)
    setTimeSlot(appointment.timeSlot)
  }, [appointment?.id])

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['conversations'] })
    queryClient.invalidateQueries({ queryKey: ['messages', conversation.id] })
    queryClient.invalidateQueries({ queryKey: ['appointment-summary', conversation.id] })
    queryClient.invalidateQueries({ queryKey: ['appointments'] })
  }

  const quoteMutation = useMutation({
    mutationFn: () =>
      sendPriceQuoteToCustomer({
        data: {
          appointmentId: appointment!.id,
          priceIls: Number(price),
          depositAmount: Number(deposit),
          date: date || undefined,
          timeSlot: timeSlot || undefined,
        },
      }),
    onSuccess: invalidateAll,
  })

  const confirmMutation = useMutation({
    mutationFn: () => confirmDepositReceived({ data: { conversationId: conversation.id } }),
    onSuccess: invalidateAll,
  })

  if (!active) return null

  if (isLoading) {
    return (
      <div className="border-b border-border bg-card px-5 py-3">
        <Skeleton className="h-5 w-48" />
        <Skeleton className="mt-2 h-9 w-full" />
      </div>
    )
  }

  if (!appointment || appointment.status !== 'pending') {
    return (
      <div className="border-b border-border bg-card px-5 py-3">
        <p className="font-assistant text-xs text-muted-foreground">
          לא נמצא תור ממתין לשיחה הזאת — ייתכן שבוטל או שכבר טופל דרך היומן.
        </p>
      </div>
    )
  }

  const detailRows = [
    { label: 'קעקוע', value: appointment.tattooDescription || '—' },
    ...(appointment.staffName ? [{ label: 'אמן', value: appointment.staffName }] : []),
    { label: 'משך', value: `${appointment.durationHours} שעות` },
  ]

  const mutationError = quoteMutation.error ?? confirmMutation.error

  return (
    <div className="border-b border-border bg-card px-5 py-4">
      <div className="flex items-center gap-2">
        {showPricing ? <Tag className="size-4 text-primary" /> : <BadgeCheck className="size-4 text-emerald-600" />}
        <h3 className="font-assistant text-sm font-bold text-foreground">
          {showPricing ? 'תמחור הבקשה — הלקוח ממתין להצעת מחיר' : 'אימות תשלום — בדוק את האסמכתה מול הפרטים'}
        </h3>
      </div>

      <dl className="mt-2 flex flex-wrap gap-x-6 gap-y-1">
        {detailRows.map((row) => (
          <div key={row.label} className="flex items-baseline gap-1.5">
            <dt className="font-assistant text-xs text-muted-foreground">{row.label}:</dt>
            <dd className="font-assistant text-xs font-semibold text-foreground">{row.value}</dd>
          </div>
        ))}
        {!showPricing && (
          <>
            <div className="flex items-baseline gap-1.5">
              <dt className="font-assistant text-xs text-muted-foreground">מועד:</dt>
              <dd className="font-assistant text-xs font-semibold text-foreground">
                {appointment.date} בשעה {appointment.timeSlot}
              </dd>
            </div>
            <div className="flex items-baseline gap-1.5">
              <dt className="font-assistant text-xs text-muted-foreground">מחיר / מקדמה:</dt>
              <dd className="font-assistant text-xs font-semibold text-foreground">
                ₪{appointment.priceIls ?? '—'} / ₪{appointment.depositAmount ?? '—'}
              </dd>
            </div>
          </>
        )}
      </dl>

      {showPricing ? (
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-[1fr_1fr_auto_auto_auto] sm:items-end">
          <div className="space-y-1">
            <Label htmlFor="quote-price" className="font-assistant text-xs">
              מחיר (₪)
            </Label>
            <Input
              id="quote-price"
              type="number"
              min={0}
              inputMode="numeric"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="h-10 rounded-xl font-assistant text-sm"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="quote-deposit" className="font-assistant text-xs">
              מקדמה (₪)
            </Label>
            <Input
              id="quote-deposit"
              type="number"
              min={0}
              inputMode="numeric"
              value={deposit}
              onChange={(e) => setDeposit(e.target.value)}
              className="h-10 rounded-xl font-assistant text-sm"
            />
          </div>
          <div className="space-y-1">
            <Label className="font-assistant text-xs">תאריך</Label>
            <DatePicker value={date} onChange={setDate} className="sm:w-40" />
          </div>
          <div className="space-y-1">
            <Label className="font-assistant text-xs">שעה</Label>
            <HourPicker value={timeSlot} onChange={setTimeSlot} className="sm:w-28" />
          </div>
          <Button
            type="button"
            className="col-span-2 h-10 rounded-xl cursor-pointer gap-1.5 sm:col-span-1"
            disabled={quoteMutation.isPending || !price || !deposit || Number(price) < 0 || Number(deposit) < 0}
            onClick={() => quoteMutation.mutate()}
          >
            <SendHorizontal className="size-4" />
            {quoteMutation.isPending ? 'שולח הצעה…' : 'שלח הצעת מחיר'}
          </Button>
        </div>
      ) : (
        <div className="mt-3">
          <Button
            type="button"
            variant="outline"
            className="rounded-xl cursor-pointer gap-1.5 border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/10"
            disabled={confirmMutation.isPending}
            onClick={() => confirmMutation.mutate()}
          >
            <BadgeCheck className="size-4" />
            {confirmMutation.isPending ? 'מאשר תשלום…' : 'אשר קבלת תשלום ושלח סיכום ללקוח'}
          </Button>
        </div>
      )}

      {mutationError ? (
        <p className="mt-2 font-assistant text-xs font-semibold text-destructive">{mutationError.message}</p>
      ) : null}
    </div>
  )
}
