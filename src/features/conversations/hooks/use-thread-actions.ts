import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useToast } from '@/components/ui/ToastProvider'
import { queryKeys } from '@/lib/query-keys'
import { confirmSlot } from '@/features/calendar/server/appointments'
import { confirmDepositReceived, rejectDepositReceipt, staffConfirmCancellation } from '../server/messages'

const errorText = (err: unknown, fallback: string) => (err instanceof Error ? err.message : fallback)

/** The decisions the thread's action panel can make, each refreshing what it changed. */
export function useThreadActions(conversationId: string, appointmentId: string | undefined) {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.conversations })
    queryClient.invalidateQueries({ queryKey: ['messages', conversationId] })
    queryClient.invalidateQueries({ queryKey: ['active-appointment', conversationId] })
    queryClient.invalidateQueries({ queryKey: queryKeys.appointments })
    // The project chip under the header (stage, balance) is keyed under the customer overview.
    queryClient.invalidateQueries({ queryKey: queryKeys.customers })
  }

  const confirmDeposit = useMutation({
    mutationFn: () => confirmDepositReceived({ data: { conversationId } }),
    onSuccess: () => {
      toast('המקדמה אושרה', 'הלקוח קיבל הודעת סיכום עם מועד התור.', 'success')
      refresh()
    },
    onError: (err) => toast('אישור המקדמה נכשל', errorText(err, 'נסו שוב.'), 'error'),
  })

  const askForClearerReceipt = useMutation({
    mutationFn: () => rejectDepositReceipt({ data: { conversationId } }),
    onSuccess: () => {
      toast('נשלחה בקשה ללקוח', 'ביקשנו אסמכתה ברורה יותר.', 'info')
      refresh()
    },
    onError: (err) => toast('הבקשה לא נשלחה', errorText(err, 'נסו שוב.'), 'error'),
  })

  const confirmAppointmentSlot = useMutation({
    mutationFn: () => {
      if (!appointmentId) throw new Error('אין תור לאישור')
      return confirmSlot({ data: { appointmentId } })
    },
    onSuccess: () => {
      toast('המועד אושר', 'התור נשמר ביומן.', 'success')
      refresh()
    },
    onError: (err) => toast('אישור המועד נכשל', errorText(err, 'נסו שוב.'), 'error'),
  })

  const cancelAppointment = useMutation({
    mutationFn: () => staffConfirmCancellation({ data: { conversationId, appointmentId } }),
    onSuccess: () => {
      toast('התור בוטל', 'המשבצת ביומן התפנתה והלקוח קיבל הודעה.', 'info')
      refresh()
    },
    onError: (err) => toast('ביטול התור נכשל', errorText(err, 'נסו שוב.'), 'error'),
  })

  return {
    confirmDeposit,
    askForClearerReceipt,
    confirmAppointmentSlot,
    cancelAppointment,
    isPending:
      confirmDeposit.isPending || askForClearerReceipt.isPending || confirmAppointmentSlot.isPending || cancelAppointment.isPending,
  }
}
