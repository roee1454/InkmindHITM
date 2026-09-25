import React from 'react'
import { TriangleAlert, PencilLine, Needle, Check, FileCheck } from '@/components/ui/icon'
import type { ApiAppointment } from '../types'
import { artistColor } from '../utils/artist-colors'
import {
  buildAppointmentTooltip,
  formatAppointmentPrice,
  formatAppointmentTimeRange,
  getAppointmentStatusVisual,
} from '../utils/appointment-status'
import { cn } from '@/lib/utils'
import { appointmentKindLabel } from '../utils/project-position'
import { appointmentNeedsCloseOut } from '@/features/payments/utils/balance'
import { isHealthDeclarationValid } from '@/features/health-declaration/utils/validity'

interface AppointmentGridCardProps {
  appointment: ApiAppointment
  top: number
  height: number
  column: number
  columnCount: number
  widthPercent: number
  artistAvatars: Record<string, string>
  onSelect: () => void
  isOverflowSlot?: boolean
  overflowCount?: number
  onOverflowClick?: () => void
}

export const AppointmentGridCard: React.FC<AppointmentGridCardProps> = ({
  appointment,
  top,
  height,
  column,
  columnCount,
  widthPercent,
  artistAvatars,
  onSelect,
  isOverflowSlot = false,
  overflowCount = 0,
  onOverflowClick,
}) => {
  const isSketch = appointment.type === 'sketch'
  // "סשן 2" / "טאץ'-אפ" only when the appointment is part of a series; a lone tattoo needs no prefix.
  const kindLabel = appointmentKindLabel(appointment.kind, appointment.projectPosition)
  const seriesLabel = kindLabel === 'קעקוע' ? null : kindLabel
  const visual = getAppointmentStatusVisual(appointment.status)
  const awaitingCloseOut = appointmentNeedsCloseOut(appointment, Date.now())
  const artist = artistColor(appointment.staffId)
  const tooltipText = buildAppointmentTooltip(appointment)
  const clientName = appointment.leadName || 'לקוח ללא שם'
  const avatarUrl = appointment.staffId ? artistAvatars[appointment.staffId] : null
  const priceFormatted = formatAppointmentPrice(appointment.priceMin, appointment.priceMax)
  const timeRange = formatAppointmentTimeRange(appointment.timeSlot, appointment.durationMinutes || 120)
  const isHealthExpired = Boolean(
    appointment.healthDeclarationSigned &&
    appointment.healthDeclarationDate &&
    !isHealthDeclarationValid(appointment.healthDeclarationDate)
  )

  // Height tiering
  const isMicro = height < 36
  const isCompact = height >= 36 && height < 68
  const isTall = height >= 68

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      style={{ top, height: Math.max(height, 24), right: `${column * widthPercent}%`, width: `${widthPercent}%` }}
      className="absolute z-10 p-0.5 @container"
    >
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          onSelect()
        }}
        title={tooltipText}
        className={cn(
          'group/card relative h-full w-full overflow-hidden rounded-lg border text-right transition-all duration-150 cursor-pointer select-none',
          'bg-card hover:bg-muted/40 hover:border-border hover:shadow-md hover:z-30 active:scale-[0.99]',
          isSketch
            ? 'border-dashed border-accent-ink/60 bg-accent-ink/[0.04] hover:bg-accent-ink/[0.08]'
            : 'border-border/80',
          visual.isCancelled && 'opacity-45 grayscale line-through',
          visual.isCompleted && 'bg-muted/30 border-border/60 text-muted-foreground',
        )}
      >
        {/* Tier 1: Micro / Short (e.g. 30 minutes, height < 36px) */}
        {isMicro && (
          <div className="flex h-full w-full items-center justify-between gap-1.5 px-2 py-0.5 overflow-hidden">
            <div className="flex items-center gap-1.5 min-w-0 flex-1">
              <span
                className={cn('size-1.5 shrink-0 rounded-full', artist.dot)}
                title={appointment.staffName ? `מקעקע: ${appointment.staffName}` : undefined}
              />
              <span className="text-3xs font-bold tabular-nums text-foreground/85 shrink-0">
                {appointment.timeSlot}
              </span>
              <span className="truncate text-micro font-bold text-foreground">
                {clientName}
              </span>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              {appointment.isException && (
                <TriangleAlert size={9} className="text-warning shrink-0" />
              )}
              {isSketch ? (
                <PencilLine size={10} className="text-accent-ink shrink-0" />
              ) : (
                <Needle size={10} className="text-primary shrink-0" />
              )}
            </div>
          </div>
        )}

        {/* Tier 2: Compact (e.g. 45-60 minutes, 36px <= height < 68px) */}
        {isCompact && (
          <div className="flex h-full w-full flex-col justify-between p-1.5 overflow-hidden">
            {/* Top row: Time + Artist/Type */}
            <div className="flex items-center justify-between gap-1 min-w-0 text-3xs text-muted-foreground">
              <div className="flex items-center gap-1 min-w-0">
                <span className={cn('size-1.5 shrink-0 rounded-full', artist.dot)} />
                <span className="font-bold tabular-nums text-foreground/80 truncate">
                  {appointment.timeSlot}
                </span>
                {appointment.staffName && (
                  <span className="hidden @[110px]:inline truncate text-muted-foreground">
                    · {appointment.staffName}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1 shrink-0">
                {appointment.isException && (
                  <TriangleAlert size={9} className="text-warning shrink-0" />
                )}
                {isSketch ? (
                  <PencilLine size={10} className="text-accent-ink shrink-0" />
                ) : (
                  <Needle size={10} className="text-primary shrink-0" />
                )}
              </div>
            </div>

            {/* Bottom row: Client Name + Status hint */}
            <div className="flex items-center justify-between gap-1 min-w-0">
              <span className="truncate text-xs font-bold text-foreground">
                {clientName}
              </span>

              {appointment.hasDeposit && (
                <span className="hidden @[95px]:inline-flex text-3xs font-extrabold text-status-done shrink-0">
                  ₪✓
                </span>
              )}

              {visual.isPending && (
                <span className="size-1.5 rounded-full bg-status-wait shrink-0 animate-pulse" />
              )}
              {awaitingCloseOut && <span className="size-1.5 rounded-full bg-warning shrink-0" title="ממתין לסגירה" />}
            </div>
          </div>
        )}

        {/* Tier 3: Tall / Full Session (>= 90 minutes, height >= 68px) */}
        {isTall && (
          <div className="flex h-full w-full flex-col justify-between p-2.5 overflow-hidden text-right">
            {/* Header: Artist & Time Range */}
            <div className="flex items-center justify-between gap-1.5 min-w-0 shrink-0">
              <div className="flex items-center gap-1.5 min-w-0 flex-1">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt=""
                    className="size-4.5 rounded-full object-cover shrink-0 ring-1 ring-border/80"
                  />
                ) : (
                  <span className={cn('size-2 shrink-0 rounded-full', artist.dot)} />
                )}
                {appointment.staffName && (
                  <span className="truncate text-2xs font-semibold text-muted-foreground">
                    {appointment.staffName}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1 shrink-0 text-3xs font-medium text-muted-foreground tabular-nums">
                <span>{timeRange}</span>
                {appointment.isException && (
                  <TriangleAlert size={10} className="text-warning ms-0.5 shrink-0" />
                )}
              </div>
            </div>

            {/* Center: Client Name + Style Description */}
            <div className="flex flex-col gap-0.5 min-w-0 my-auto py-1">
              <div className="truncate text-xs sm:text-sm font-extrabold text-foreground leading-snug">
                {clientName}
              </div>

              <div className="flex items-center gap-1 text-2xs text-muted-foreground truncate">
                {isSketch ? (
                  <PencilLine size={11} className="text-accent-ink shrink-0" />
                ) : (
                  <Needle size={11} className="text-primary shrink-0" />
                )}
                <span className="truncate">
                  {isSketch
                    ? appointment.style || 'פגישת סקיצה'
                    : [seriesLabel, appointment.style].filter(Boolean).join(' · ') || 'סשן קעקוע'}
                </span>
              </div>
            </div>

            {/* Footer: Price + Badges */}
            <div className="flex items-center justify-between gap-1.5 pt-1.5 border-t border-border/50 text-3xs shrink-0">
              <div className="min-w-0 truncate font-bold text-foreground/90 tabular-nums">
                {priceFormatted || ''}
              </div>

              <div className="flex items-center gap-1 shrink-0">
                {appointment.hasDeposit && (
                  <span className="inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-3xs font-extrabold bg-status-done-soft text-status-done border border-status-done/25">
                    <Check size={9} />
                    <span>מקדמה</span>
                  </span>
                )}
                {appointment.healthDeclarationSigned && (
                  <span
                    className={cn(
                      'hidden @[120px]:inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-3xs font-bold',
                      isHealthExpired
                        ? 'text-warning bg-warning/10'
                        : 'text-status-done bg-status-done/10',
                    )}
                    title={isHealthExpired ? 'הצהרת בריאות פגת תוקף — נדרש חידוש' : 'הצהרת בריאות חתומה'}
                  >
                    {isHealthExpired ? <TriangleAlert size={9} /> : <FileCheck size={9} />}
                  </span>
                )}
                {visual.isPending && (
                  <span className="rounded px-1.5 py-0.5 text-3xs font-bold bg-status-wait-soft text-status-wait border border-status-wait/25">
                    ממתין
                  </span>
                )}
                {awaitingCloseOut && (
                  <span className="rounded px-1.5 py-0.5 text-3xs font-bold bg-warning/10 text-warning border border-warning/30">
                    לסגירה
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Overflow Pill for high-density slots */}
        {isOverflowSlot && onOverflowClick && (
          <div
            onClick={(e) => {
              e.stopPropagation()
              onOverflowClick()
            }}
            className="absolute bottom-0 inset-x-0 bg-primary text-primary-foreground text-2xs font-extrabold py-0.5 text-center shadow-xs cursor-pointer hover:bg-primary/90"
          >
            +{overflowCount || (columnCount - 2)} נוספים
          </div>
        )}
      </button>
    </div>
  )
}

