import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useToast } from '@/components/ui/ToastProvider'
import { formatDatabaseError } from '@/lib/pocketbase-error'
import { toCanonicalE164Phone } from '@/lib/phone'
import {
  createAppointment,
  deleteAppointment,
  sendPriceQuoteToCustomer,
  updateAppointment,
} from '../server/appointments'
import { useCalendarUiStore } from '../store/calendarUiStore'
import { toCreateAppointmentInput } from '../utils/appointment-payload'
import type { AppointmentFormValues, AppointmentStatus } from '../types'
import type { QuoteToSend } from '../components/BotQuoteBanner'

/**
 * Every write the calendar screen makes (track-b B6.8), pulled out of `CalendarPage`. The dialog
 * state it resets on success lives in `calendarUiStore`, so nothing has to be threaded back
 * through props.
 */
export function useAppointmentMutations() {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const closeCreate = useCalendarUiStore((s) => s.closeCreate)
  const setEditingAppointment = useCalendarUiStore((s) => s.setEditingAppointment)
  const setFormError = useCalendarUiStore((s) => s.setFormError)

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['appointments'] })
  }

  const create = useMutation({
    mutationFn: (body: AppointmentFormValues) =>
      createAppointment({ data: toCreateAppointmentInput(body) }),
    onSuccess: () => {
      refresh()
      closeCreate()
    },
    onError: (err: unknown) => setFormError(err instanceof Error ? err.message : 'שגיאה ביצירת התור'),
  })

  const update = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Partial<AppointmentFormValues> }) =>
      updateAppointment({
        data: {
          id,
          customerId: body.customerId,
          chatId: body.chatId,
          leadName: body.leadName,
          leadPhone: body.leadPhone !== undefined ? (body.leadPhone ? toCanonicalE164Phone(body.leadPhone) : '') : undefined,
          date: body.date,
          timeSlot: body.timeSlot,
          staffId: body.staffId,
          durationMinutes: body.durationMinutes,
          tattooDescription: body.tattooDescription,
          priceMinIls: body.priceMinIls,
          priceMaxIls: body.priceMaxIls,
          status: body.status,
          depositPaid: body.depositPaid,
          notes: body.notes,
          allowException: body.allowException,
        },
      }),
    onSuccess: () => {
      refresh()
      setEditingAppointment(null)
      setFormError(null)
    },
    onError: (err: unknown) => setFormError(formatDatabaseError(err, 'שגיאה בעדכון התור')),
  })

  const remove = useMutation({
    mutationFn: (id: string) => deleteAppointment({ data: { id } }),
    onSuccess: () => {
      refresh()
      setEditingAppointment(null)
      toast('התור נמחק', 'התור וכל הנתונים המקושרים הוסרו בהצלחה.', 'success')
    },
    onError: (err: unknown) => toast('שגיאה במחיקת התור', formatDatabaseError(err, 'מחיקת התור נכשלה.'), 'error'),
  })

  const sendQuote = useMutation({
    mutationFn: (body: { appointmentId: string } & QuoteToSend) => sendPriceQuoteToCustomer({ data: body }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] })
      setEditingAppointment(null)
      setFormError(null)
    },
    onError: (err: unknown) => setFormError(err instanceof Error ? err.message : 'שליחת הצעת המחיר נכשלה'),
  })

  const setStatus = (id: string, status: AppointmentStatus) => update.mutate({ id, body: { status } })

  return { create, update, remove, sendQuote, setStatus }
}
