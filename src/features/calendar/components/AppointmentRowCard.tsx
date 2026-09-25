import React from 'react'
import { PencilLine, Needle, FileCheck, TriangleAlert } from '@/components/ui/icon'
import type { ApiAppointment } from '../types'
import { artistColor } from '../utils/artist-colors'
import {
  formatAppointmentDurationLabel,
  formatAppointmentPrice,
  formatAppointmentTimeRange,
  getAppointmentStatusVisual,
} from '../utils/appointment-status'
import { cn } from '@/lib/utils'
import { appointmentKindLabel } from '../utils/project-position'
import { appointmentNeedsCloseOut } from '@/features/payments/utils/balance'
import { extractMedicalAlerts } from '@/features/health-declaration/utils/health-alerts'
import { isHealthDeclarationValid } from '@/features/health-declaration/utils/validity'

interface AppointmentRowCardProps {
  appointment: ApiAppointment
  artistAvatars?: Record<string, string>
  onSelect: () => void
}

export const AppointmentRowCard: React.FC<AppointmentRowCardProps> = ({
  appointment,
  artistAvatars = {},
  onSelect,
}) => {
  const isSketch = appointment.type === 'sketch'
  const visual = getAppointmentStatusVisual(appointment.status)
  const artist = artistColor(appointment.staffId)
  const timeRange = formatAppointmentTimeRange(appointment.timeSlot, appointment.durationMinutes || 120)
  const durationLabel = formatAppointmentDurationLabel(appointment.durationMinutes || 120)
  const priceFormatted = formatAppointmentPrice(appointment.priceMin, appointment.priceMax)
  const avatarUrl = appointment.staffId ? artistAvatars[appointment.staffId] : null
  const clientName = appointment.leadName || 'לקוח ללא שם'
  const isExpired = Boolean(
    appointment.healthDeclarationSigned &&
    appointment.healthDeclarationDate &&
    !isHealthDeclarationValid(appointment.healthDeclarationDate)
  )
  const alerts = appointment.healthDeclarationSigned
    ? extractMedicalAlerts({
        answers: appointment.healthDeclarationAnswers,
        medicalNotes: appointment.medicalNotes,
        allergies: appointment.allergies,
      })
    : []

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'group/row w-full flex items-start gap-3 p-3.5 rounded-2xl border text-right transition-all duration-150 cursor-pointer select-none',
        'bg-card hover:bg-muted/40 hover:border-border hover:shadow-xs active:scale-[0.99]',
        isSketch
          ? 'border-dashed border-accent-ink/60 bg-accent-ink/[0.03] hover:bg-accent-ink/[0.07]'
          : 'border-border/80',
        visual.isCancelled && 'opacity-50 grayscale line-through',
      )}
    >
      {/* Time column */}
      <div className="w-24 shrink-0 pt-0.5 text-right">
        <span className="text-xs font-extrabold text-foreground block tabular-nums">
          {timeRange}
        </span>
        <span className="text-micro text-muted-foreground font-medium block mt-0.5">
          {durationLabel}
        </span>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col gap-1.5 min-w-0">
        {/* Row 1: Client Name + Type + Status */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="text-xs sm:text-sm font-extrabold text-foreground truncate">
              {clientName}
            </span>

            {isSketch ? (
              <span className="inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-3xs font-extrabold bg-accent-ink/15 text-accent-ink border border-accent-ink/30 shrink-0">
                <PencilLine size={9} />
                <span>סקיצה</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-3xs font-bold bg-primary/10 text-primary border border-primary/20 shrink-0">
                <Needle size={9} />
                <span>{appointmentKindLabel(appointment.kind, appointment.projectPosition)}</span>
              </span>
            )}
          </div>

          {appointmentNeedsCloseOut(appointment, Date.now()) ? (
            <span className="rounded-full px-2 py-0.5 text-micro font-bold shrink-0 bg-warning/10 text-warning border border-warning/30">
              ממתין לסגירה
            </span>
          ) : (
            <span className={cn('rounded-full px-2 py-0.5 text-micro font-bold shrink-0', visual.badgeClass)}>
              {visual.label}
            </span>
          )}
        </div>

        {/* Row 2: Description + Artist */}
        <div className="flex items-center justify-between gap-2 text-micro text-muted-foreground">
          <span className="truncate">
            {appointment.style || (isSketch ? 'פגישת סקיצה / ייעוץ' : 'קעקוע כללי')}
          </span>

          {appointment.staffId && (
            <div className="flex items-center gap-1.5 shrink-0 text-foreground">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt=""
                  className="size-4 rounded-full object-cover border border-border"
                />
              ) : (
                <span className={cn('size-2 rounded-full shrink-0', artist.dot)} />
              )}
              <span className="font-semibold text-micro">
                {appointment.staffName || 'מקעקע'}
              </span>
            </div>
          )}
        </div>

        {/* Row 3: Price & Badges */}
        <div className="flex items-center justify-between gap-2 pt-1 border-t border-border/40 text-micro">
          <span className="font-bold text-foreground/85 tabular-nums">
            {priceFormatted || 'ללא הצעת מחיר'}
          </span>

          <div className="flex items-center gap-2 shrink-0">
            {appointment.hasDeposit && (
              <span className="inline-flex items-center gap-0.5 text-3xs font-bold text-status-done">
                מקדמה שולמה ✓
              </span>
            )}

            {appointment.healthDeclarationSigned && (
              <span
                title={
                  alerts.length > 0
                    ? `הצהרת בריאות חתומה — ${alerts.length} התראות רפואיות!`
                    : isExpired
                      ? 'הצהרת בריאות פגת תוקף — נדרש חידוש'
                      : 'הצהרת בריאות חתומה ומאושרת'
                }
                className={cn(
                  'inline-flex items-center gap-0.5 text-3xs font-bold',
                  alerts.length > 0
                    ? 'text-destructive'
                    : isExpired
                      ? 'text-warning'
                      : 'text-status-done',
                )}
              >
                {alerts.length > 0 || isExpired ? (
                  <TriangleAlert size={11} />
                ) : (
                  <FileCheck size={11} />
                )}
                <span>
                  {alerts.length > 0
                    ? `התראה (${alerts.length})`
                    : isExpired
                      ? 'פג תוקף'
                      : 'הצהרה'}
                </span>
              </span>
            )}

            {appointment.isException && (
              <span
                title="נקבע מחוץ לשעות הפעילות"
                className="inline-flex items-center gap-0.5 text-3xs font-bold text-warning"
              >
                <TriangleAlert size={11} />
                <span>חריגה</span>
              </span>
            )}
          </div>
        </div>
      </div>
    </button>
  )
}

