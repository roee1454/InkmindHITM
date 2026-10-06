import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Clock, Receipt, Wallet } from '@/components/ui/icon'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import type { ApiAppointment } from '@/features/calendar/types'
import { formatShortSlot } from '@/features/projects/utils/format'
import { appointmentNeedsCloseOut } from '../utils/balance'
import { formatIls } from '../utils/labels'
import { CloseSessionDialog } from './CloseSessionDialog'

/**
 * In the appointment dialog: a session whose time has come asks to be closed with its final price;
 * a closed one shows what it cost and where the project's money stands.
 * When the appointment has not yet arrived, an indication is displayed with an option for exceptional early close-out.
 */
export function SessionCloseOutSection({
  appointment,
  readOnly,
  onScheduleNextSession,
}: {
  appointment: ApiAppointment
  readOnly: boolean
  onScheduleNextSession?: (session: ApiAppointment) => void
}) {
  const [closing, setClosing] = useState(false)
  const [showEarlyCloseWarning, setShowEarlyCloseWarning] = useState(false)

  if (appointment.kind === 'consultation' || !appointment.projectId) return null

  if (appointment.status === 'completed') {
    const balance = appointment.projectBalance
    return (
      <div className="flex items-center gap-2.5 rounded-lg border border-border bg-muted/30 p-3 text-xs">
        <Wallet size={16} className="shrink-0 text-muted-foreground" />
        <span className="text-foreground">
          {appointment.chargeWaived ? 'נסגר ללא חיוב' : `מחיר סופי ${formatIls(appointment.finalPrice ?? 0)}`}
        </span>
        {balance && balance.due > 0 && <span className="ms-auto font-bold text-warning">יתרה בפרויקט {formatIls(balance.due)}</span>}
        {balance && balance.due === 0 && balance.credit > 0 && (
          <span className="ms-auto font-bold text-status-done">זיכוי {formatIls(balance.credit)}</span>
        )}
      </div>
    )
  }

  if (readOnly) return null

  const isReadyForCloseOut = appointmentNeedsCloseOut(appointment, Date.now())
  const slotFormatted = formatShortSlot(`${appointment.date}T${appointment.timeSlot}:00`)

  return (
    <>
      {isReadyForCloseOut ? (
        <div className="flex items-center justify-between gap-2 rounded-lg border border-warning/30 bg-warning/10 p-3">
          <div className="flex items-center gap-2">
            <Receipt size={16} className="shrink-0 text-warning" />
            <div className="flex flex-col text-start">
              <span className="text-xs font-extrabold text-foreground">הסשן התחיל — ממתין לסגירה</span>
              <span className="text-2xs text-muted-foreground">הזנת מחיר סופי ותשלום שהתקבל</span>
            </div>
          </div>
          <Button type="button" size="sm" className="h-8 shrink-0 px-3 text-xs font-extrabold" onClick={() => setClosing(true)}>
            סגירת סשן
          </Button>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-2 rounded-lg border border-border/70 bg-muted/30 p-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <Clock size={16} className="shrink-0 text-muted-foreground" />
            <div className="flex flex-col text-start min-w-0">
              <span className="text-xs font-bold text-foreground truncate">
                סגירת חשבון ותשלום תתאפשר במועד התור
              </span>
              <span className="text-2xs text-muted-foreground">
                {slotFormatted ? `מועד התור: ${slotFormatted}` : 'סגירת סשן מתבצעת בסיום התור'}
              </span>
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 shrink-0 border-border/80 text-xs font-semibold hover:bg-muted"
            onClick={() => setShowEarlyCloseWarning(true)}
          >
            סגירה מוקדמת (חריג)
          </Button>
        </div>
      )}

      <ConfirmDialog
        open={showEarlyCloseWarning}
        onOpenChange={setShowEarlyCloseWarning}
        title="סגירת סשן מוקדמת (חריג)"
        description="מומלץ לבצע סגירת חשבון רק בסיום הסשן, לאחר שמשך הזמן והמחיר הסופי ידועים בוודאות."
        details={[
          ...(slotFormatted ? [{ label: 'מועד התור', value: slotFormatted }] : []),
          ...(appointment.leadName ? [{ label: 'לקוח', value: appointment.leadName }] : []),
        ]}
        confirmLabel="המשך לסגירת סשן"
        cancelLabel="ביטול"
        onConfirm={() => {
          setShowEarlyCloseWarning(false)
          setClosing(true)
        }}
      >
        <div className="mt-3 rounded-lg border border-warning/30 bg-warning/10 p-2.5 text-xs text-warning">
          שים לב: סגירת הסשן לפני מועדו תקבע את המחיר הסופי ותסמן אותו כהושלם.
        </div>
      </ConfirmDialog>

      <CloseSessionDialog appointment={appointment} open={closing} onOpenChange={setClosing} onScheduleNextSession={onScheduleNextSession} />
    </>
  )
}
