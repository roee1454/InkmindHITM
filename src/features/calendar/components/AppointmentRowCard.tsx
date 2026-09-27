import React from 'react'
import { PencilLine, Needle, FileCheck, TriangleAlert } from '@/components/ui/icon'
import type { ApiAppointment } from '../types'
import { artistColor } from '../utils/artist-colors'
import { appointmentVisual, MARKER_LABELS } from '../utils/appointment-visual'
import { ArtistBadge } from './ArtistBadge'
import {
  formatAppointmentDurationLabel,
  formatAppointmentPrice,
  formatAppointmentTimeRange,
  getAppointmentStatusVisual,
} from '../utils/appointment-status'
import { cn } from '@/lib/utils'
import { appointmentKindLabel } from '../utils/project-position'
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
  const status = getAppointmentStatusVisual(appointment.status)
  const visual = appointmentVisual(appointment, Date.now())
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
        'group/row flex w-full cursor-pointer select-none items-start gap-3 rounded-xl border p-3.5 text-right transition-colors duration-150 active:scale-[0.99]',
        artist.surface,
        'hover:border-accent-ink/50',
        visual.dashed && 'border-dashed',
        visual.muted && 'opacity-60',
        visual.struck && 'line-through',
      )}
    >
      {/* Time column */}
      <div className="w-24 shrink-0 pt-0.5 text-right">
        {/* `dir=ltr`: a bidi-neutral dash between two LTR clocks renders the range backwards
            in an RTL page ("14:00 – 11:00" for an 11:00 appointment). */}
        <span dir="ltr" className="block text-xs font-extrabold tabular-nums text-foreground">
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

            <span className="inline-flex shrink-0 items-center gap-1 text-2xs font-bold text-muted-foreground">
              {isSketch ? <PencilLine size={11} /> : <Needle size={11} />}
              <span>{isSketch ? 'ייעוץ' : appointmentKindLabel(appointment.kind, appointment.projectPosition)}</span>
            </span>
          </div>

          {visual.marker === 'close_out' ? (
            <span className="shrink-0 rounded-full border border-warning/30 bg-warning/10 px-2 py-0.5 text-2xs font-bold text-warning">
              {MARKER_LABELS.close_out}
            </span>
          ) : (
            <span className={cn('shrink-0 rounded-full px-2 py-0.5 text-2xs font-bold', status.badgeClass)}>
              {status.label}
            </span>
          )}
        </div>

        {/* Row 2: Description + Artist */}
        <div className="flex items-center justify-between gap-2 text-micro text-muted-foreground">
          <span className="truncate">
            {appointment.style || (isSketch ? 'פגישת סקיצה / ייעוץ' : 'קעקוע כללי')}
          </span>

          <div className="flex shrink-0 items-center gap-1.5 text-foreground">
            <ArtistBadge staffId={appointment.staffId} staffName={appointment.staffName} avatarUrl={avatarUrl} size={16} />
            <span className="text-micro font-semibold">{appointment.staffName || 'ללא שיוך'}</span>
          </div>
        </div>

        {/* Row 3: Price & Badges */}
        <div className="flex items-center justify-between gap-2 pt-1 border-t border-border/40 text-micro">
          <span className="font-bold text-foreground/85 tabular-nums">
            {priceFormatted || 'ללא הצעת מחיר'}
          </span>

          <div className="flex items-center gap-2 shrink-0">
            {appointment.hasDeposit && (
              <span className="inline-flex items-center gap-0.5 text-2xs font-bold text-status-done">
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
                  'inline-flex items-center gap-0.5 text-2xs font-bold',
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
                className="inline-flex items-center gap-0.5 text-2xs font-bold text-warning"
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

