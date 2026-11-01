import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useIMToast } from '@/components/ui/toast'
import { queryKeys } from '@/lib/query-keys'
import { confirmSlot } from '@/features/calendar/server/appointments'
import { confirmDepositReceived, rejectDepositReceipt, staffConfirmCancellation } from '../server/messages'

const errorText = (err: unknown, fallback: string) => (err instanceof Error ? err.message : fallback)

/** The decisions the thread's action panel can make, each refreshing what it changed. */
export function useThreadActions(conversationId: string, appointmentId: string | undefined) {
  const queryClient = useQueryClient()
  const { show: toast } = useIMToast()

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
      toast({ tone: 'success', title: 'המקדמה אושרה', description: 'הלקוח קיבל הודעת סיכום עם מועד התור.' })
      refresh()
    },
    onError: (err) => toast({ tone: 'destructive', title: 'אישור המקדמה נכשל', description: errorText(err, 'נסו שוב.') }),
  })

  const askForClearerReceipt = useMutation({
    mutationFn: () => rejectDepositReceipt({ data: { conversationId } }),
    onSuccess: () => {
      toast({ title: 'נשלחה בקשה ללקוח', description: 'ביקשנו אסמכתה ברורה יותר.' })
      refresh()
    },
    onError: (err) => toast({ tone: 'destructive', title: 'הבקשה לא נשלחה', description: errorText(err, 'נסו שוב.') }),
  })

  const confirmAppointmentSlot = useMutation({
    mutationFn: () => {
      if (!appointmentId) throw new Error('אין תור לאישור')
      return confirmSlot({ data: { appointmentId } })
    },
    onSuccess: () => {
      toast({ tone: 'success', title: 'המועד אושר', description: 'התור נשמר ביומן.' })
      refresh()
    },
    onError: (err) => toast({ tone: 'destructive', title: 'אישור המועד נכשל', description: errorText(err, 'נסו שוב.') }),
  })

  const cancelAppointment = useMutation({
    mutationFn: () => staffConfirmCancellation({ data: { conversationId, appointmentId } }),
    onSuccess: () => {
      toast({ title: 'התור בוטל', description: 'המשבצת ביומן התפנתה והלקוח קיבל הודעה.' })
      refresh()
    },
    onError: (err) => toast({ tone: 'destructive', title: 'ביטול התור נכשל', description: errorText(err, 'נסו שוב.') }),
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
