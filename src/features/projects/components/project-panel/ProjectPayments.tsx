import { Skeleton } from '@/components/ui/skeleton'
import { PaymentRow } from '@/features/payments/components/PaymentRow'
import { formatPaymentDay } from '@/features/payments/utils/labels'
import type { ProjectFinance } from '@/features/payments/types'
import { appointmentKindLabel } from '@/features/calendar/utils/project-position'
import type { PanelAppointment } from '../../utils/panel'

interface ProjectPaymentsProps {
  finance: ProjectFinance | undefined
  isLoading: boolean
  error: string | null
  appointments: PanelAppointment[]
}

/** The piece's money, newest first, each payment tied to the appointment it was taken at. */
export function ProjectPayments({ finance, isLoading, error, appointments }: ProjectPaymentsProps) {
  const byId = new Map(appointments.map((a) => [a.id, a]))
  const payments = [...(finance?.payments ?? [])].reverse()

  return (
    <section aria-labelledby="project-payments" className="flex flex-col gap-3">
      <h3 id="project-payments" className="text-sm font-extrabold text-foreground">
        תשלומים {finance && <span className="font-semibold text-muted-foreground">· {payments.length}</span>}
      </h3>

      {isLoading && !finance ? (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-14 w-full rounded-xl" />
          <Skeleton className="h-14 w-full rounded-xl" />
        </div>
      ) : error && !finance ? (
        <p className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">{error}</p>
      ) : payments.length === 0 ? (
        <p className="text-sm text-muted-foreground">עדיין לא נרשמו תשלומים. מקדמה או תשלום שנרשמים בסגירת סשן יופיעו כאן.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-border overflow-hidden rounded-xl border border-border">
          {payments.map((payment) => {
            const appointment = payment.appointmentId ? byId.get(payment.appointmentId) : undefined
            const detail = [appointment && appointmentKindLabel(appointment.kind, appointment.projectPosition), payment.receivedAt && formatPaymentDay(payment.receivedAt)]
              .filter(Boolean)
              .join(' · ')
            return <PaymentRow key={payment.id} payment={payment} detail={detail} />
          })}
        </ul>
      )}
    </section>
  )
}
