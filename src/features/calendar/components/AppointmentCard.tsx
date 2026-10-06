import React from 'react'
import { Needle, PencilLine, FileCheck, TriangleAlert, Check } from '@/components/ui/icon'
import { cn } from '@/lib/utils'
import { appointmentVisual, MARKER_DOT, MARKER_LABELS } from '../utils/appointment-visual'
import {
  buildAppointmentTooltip,
  formatAppointmentDurationLabel,
  formatAppointmentPrice,
  formatAppointmentTimeRange,
  getAppointmentStatusVisual,
} from '../utils/appointment-status'
import { ArtistBadge } from './ArtistBadge'
import type { ApiAppointment } from '../types'
import { appointmentKindLabel } from '../utils/project-position'
import { extractMedicalAlerts } from '@/features/health-declaration/utils/health-alerts'
import { isHealthDeclarationValid } from '@/features/health-declaration/utils/validity'

export type AppointmentCardMode = 'chip' | 'block' | 'row'

interface AppointmentCardBaseProps {
  appointment: ApiAppointment
  onSelect: () => void
  artistAvatars?: Record<string, string>
  className?: string
}

export interface AppointmentChipProps extends AppointmentCardBaseProps {
  mode: 'chip'
}

export interface AppointmentBlockProps extends AppointmentCardBaseProps {
  mode: 'block'
  top: number
  height: number
  columnCount?: number
  offsetPercent?: number
  widthPercent?: number
  isOverflowSlot?: boolean
  overflowCount?: number
  onOverflowClick?: () => void
}

export interface AppointmentRowProps extends AppointmentCardBaseProps {
  mode: 'row'
}

export type AppointmentCardProps = AppointmentChipProps | AppointmentBlockProps | AppointmentRowProps

/** Below this the grid block only has room for one line. */
const COMPACT_GRID_HEIGHT = 56

/**
 * Unified Appointment Presentation Component.
 *
 * Implements the Inkmind Studio Design System (Impeccable Product Register):
 * - Light Mode: Crisp elevated white surface (`bg-white`), defined borders (`border-zinc-200/90`),
 *   deep ink typography (`text-zinc-900 font-extrabold`), subtle shadow (`shadow-2xs`).
 * - Dark Mode: Elevated studio graphite (`dark:bg-[#18181b]`), crisp white text (`dark:text-zinc-100`),
 *   subtle inner highlight, defined borders (`dark:border-zinc-800`), hovering to `dark:bg-[#202024]`.
 * - Contrast & Pop: Elevated distinct surface and crisp monospace time badges ensure high contrast (>10:1)
 *   against both light and dark calendar grids, without harsh unstyled inversion.
 * - Prominent Completed State: Clean emerald accents (`text-emerald-600 dark:text-emerald-400`),
 *   with explicit checkmark (`Check`) icons and status badges.
 */
export const AppointmentCard: React.FC<AppointmentCardProps> = (props) => {
  const { appointment, onSelect, artistAvatars = {}, className } = props
  const visual = appointmentVisual(appointment, Date.now())
  const isCompleted = appointment.status === 'completed'
  const isCancelled = appointment.status === 'cancelled' || appointment.status === 'no_show'
  const statusVisual = getAppointmentStatusVisual(appointment.status)
  const isSketch = appointment.type === 'sketch'
  const KindIcon = isSketch ? PencilLine : Needle
  const avatarUrl = appointment.staffId ? artistAvatars[appointment.staffId] : null
  const tooltip = buildAppointmentTooltip(appointment)

  // -------------------------------------------------------------------------
  // 1. CHIP MODE (Month Grid Cells & Mini-Calendars)
  // Crisp 24px pill, high-contrast monospace time badge, emerald completed icon.
  // -------------------------------------------------------------------------
  if (props.mode === 'chip') {
    return (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          onSelect()
        }}
        title={tooltip}
        dir="rtl"
        className={cn(
          'group/chip flex h-6 w-full min-w-0 cursor-pointer select-none items-center gap-1.5 overflow-hidden rounded-md px-1.5 py-0.5 text-right transition-all duration-150',
          // Elevated surface matching the design system with clear board separation
          'bg-white text-zinc-900 border border-zinc-200/90 shadow-2xs hover:border-zinc-300 hover:bg-zinc-50/80 active:scale-[0.99]',
          'dark:bg-[#18181b] dark:text-zinc-100 dark:border-zinc-800 dark:hover:bg-[#202024] dark:hover:border-zinc-700 dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]',
          visual.dashed && 'border-dashed border-amber-500/50 dark:border-amber-400/50',
          isCancelled && 'opacity-50 line-through text-zinc-400 dark:text-zinc-500',
          isCompleted && 'border-emerald-500/40 bg-emerald-50/40 dark:border-emerald-500/30 dark:bg-emerald-950/20',
          className,
        )}
      >
        <ArtistBadge
          staffId={appointment.staffId}
          staffName={appointment.staffName}
          avatarUrl={avatarUrl}
          size={14}
          className="ring-1 ring-border/60 dark:ring-white/10"
        />

        <span
          dir="ltr"
          className="shrink-0 text-2xs font-extrabold tabular-nums px-1 py-0.5 rounded leading-none bg-zinc-100 text-zinc-800 border border-zinc-200/60 dark:bg-zinc-800/80 dark:text-zinc-200 dark:border-zinc-700/50"
        >
          {appointment.timeSlot}
        </span>

        <KindIcon size={11} className="hidden shrink-0 text-zinc-400 dark:text-zinc-500 @[104px]:inline-block" />

        <span
          className={cn(
            'truncate text-xs font-bold text-zinc-900 dark:text-zinc-100 tracking-tight',
            isCancelled && 'line-through text-zinc-400 dark:text-zinc-500',
          )}
        >
          {appointment.leadName || 'ללא שם'}
        </span>

        {isCompleted ? (
          <span
            title="פגישה הושלמה"
            className="ms-auto inline-flex items-center gap-0.5 text-emerald-600 dark:text-emerald-400 shrink-0 font-extrabold"
          >
            <Check size={11} className="stroke-[2.5]" />
          </span>
        ) : visual.marker ? (
          <span
            title={MARKER_LABELS[visual.marker]}
            className={cn('ms-auto size-1.5 shrink-0 rounded-full', MARKER_DOT[visual.marker])}
          />
        ) : null}
      </button>
    )
  }

  // -------------------------------------------------------------------------
  // 2. BLOCK MODE (Week Grid & Day Resource Grid Time Blocks)
  // Structured time-grid card, elevated studio surface, clear hierarchy.
  // -------------------------------------------------------------------------
  if (props.mode === 'block') {
    const { top, height, offsetPercent = 0, widthPercent = 100, isOverflowSlot, overflowCount, onOverflowClick } = props
    const isCompact = height < COMPACT_GRID_HEIGHT

    return (
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ top, height: Math.max(height, 22), insetInlineEnd: `${offsetPercent}%`, width: `${widthPercent}%` }}
        className="absolute z-10 p-0.5 @container"
      >
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onSelect()
          }}
          title={tooltip}
          dir="rtl"
          className={cn(
            'group/card relative h-full w-full select-none overflow-hidden rounded-lg border px-2 py-1 text-right transition-all duration-150 cursor-pointer',
            // Elevated surface matching the design system with clear board separation
            'bg-white text-zinc-900 border-zinc-200/90 shadow-2xs hover:border-zinc-300 hover:bg-zinc-50/80 active:scale-[0.99]',
            'dark:bg-[#18181b] dark:text-zinc-100 dark:border-zinc-800 dark:hover:bg-[#202024] dark:hover:border-zinc-700 dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]',
            visual.dashed && 'border-dashed border-amber-500/50 dark:border-amber-400/50',
            isCancelled && 'opacity-50 line-through text-zinc-400 dark:text-zinc-500',
            isCompleted && 'border-emerald-500/40 bg-emerald-50/30 dark:border-emerald-500/30 dark:bg-emerald-950/20',
            className,
          )}
        >
          <div className={cn('flex h-full min-w-0 gap-1.5', isCompact ? 'items-center' : 'flex-col justify-start')}>
            {/* Top row: Artist, Icon, Client name, Status marker or Completed check */}
            <div className="flex min-w-0 items-center gap-1.5 w-full">
              <ArtistBadge
                staffId={appointment.staffId}
                staffName={appointment.staffName}
                avatarUrl={avatarUrl}
                size={isCompact ? 13 : 15}
                className="ring-1 ring-border/60 dark:ring-white/10"
              />
              <KindIcon size={11} className="hidden shrink-0 text-zinc-400 dark:text-zinc-500 @[104px]:inline-block" />
              <span className={cn('truncate text-xs font-bold text-zinc-900 dark:text-zinc-100 tracking-tight', isCancelled && 'line-through text-zinc-400 dark:text-zinc-500')}>
                {appointment.leadName || 'לקוח ללא שם'}
              </span>

              {isCompleted ? (
                <span
                  title="פגישה הושלמה"
                  className="ms-auto inline-flex items-center gap-0.5 text-2xs font-extrabold text-emerald-600 dark:text-emerald-400 shrink-0"
                >
                  <Check size={11} className="stroke-[2.5]" />
                  {!isCompact && <span>הושלם</span>}
                </span>
              ) : visual.marker ? (
                <span
                  title={MARKER_LABELS[visual.marker]}
                  className={cn('ms-auto size-1.5 shrink-0 rounded-full', MARKER_DOT[visual.marker])}
                />
              ) : null}
            </div>

            {/* Bottom / Inline row: Time range */}
            <div className="flex min-w-0 shrink-0 items-center gap-1">
              <span
                dir="ltr"
                className="text-2xs font-extrabold tabular-nums px-1.5 py-0.5 rounded leading-none bg-zinc-100 text-zinc-800 border border-zinc-200/60 dark:bg-zinc-800/80 dark:text-zinc-200 dark:border-zinc-700/50"
              >
                {formatAppointmentTimeRange(appointment.timeSlot, appointment.durationMinutes || 120)}
              </span>

              {!isCompact && appointment.staffName && (
                <span className="hidden min-w-0 truncate text-2xs text-zinc-500 dark:text-zinc-400 @[132px]:inline">
                  · {appointment.staffName}
                </span>
              )}

              {isOverflowSlot && overflowCount && overflowCount > 0 && onOverflowClick && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    onOverflowClick()
                  }}
                  className="rounded px-1.5 py-0.5 text-2xs font-extrabold bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                >
                  +{overflowCount}
                </button>
              )}
            </div>
          </div>
        </button>
      </div>
    )
  }

  // -------------------------------------------------------------------------
  // 3. ROW MODE (List View & Day Overview Drawer)
  // Full-width horizontal card, clear metadata hierarchy, prominent status badge.
  // -------------------------------------------------------------------------
  const timeRange = formatAppointmentTimeRange(appointment.timeSlot, appointment.durationMinutes || 120)
  const durationLabel = formatAppointmentDurationLabel(appointment.durationMinutes || 120)
  const priceFormatted = formatAppointmentPrice(appointment.priceMin, appointment.priceMax)
  const clientName = appointment.leadName || 'לקוח ללא שם'
  const isExpired = Boolean(
    appointment.healthDeclarationSigned &&
      appointment.healthDeclarationDate &&
      !isHealthDeclarationValid(appointment.healthDeclarationDate),
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
      dir="rtl"
      className={cn(
        'group/row flex w-full cursor-pointer select-none items-start gap-3.5 rounded-xl border p-3.5 text-right transition-all duration-150 active:scale-[0.99]',
        // Elevated surface matching the design system with clear board separation
        'bg-white text-zinc-900 border-zinc-200/90 shadow-2xs hover:border-zinc-300 hover:shadow-xs hover:bg-zinc-50/50',
        'dark:bg-[#18181b] dark:text-zinc-100 dark:border-zinc-800 dark:hover:bg-[#202024] dark:hover:border-zinc-700 dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]',
        visual.dashed && 'border-dashed border-amber-500/50 dark:border-amber-400/50',
        isCancelled && 'opacity-50 line-through text-zinc-400 dark:text-zinc-500',
        isCompleted && 'border-emerald-500/40 bg-emerald-50/20 dark:border-emerald-500/30 dark:bg-emerald-950/15',
        className,
      )}
    >
      {/* Time column */}
      <div className="w-24 shrink-0 pt-0.5 text-right">
        <span
          dir="ltr"
          className="inline-block text-xs font-extrabold tabular-nums px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-800 border border-zinc-200/60 dark:bg-zinc-800/80 dark:text-zinc-200 dark:border-zinc-700/50"
        >
          {timeRange}
        </span>
        <span className="text-micro text-zinc-500 dark:text-zinc-400 font-medium block mt-1">{durationLabel}</span>
      </div>

      {/* Main details */}
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <ArtistBadge
              staffId={appointment.staffId}
              staffName={appointment.staffName}
              avatarUrl={avatarUrl}
              size={15}
              className="ring-1 ring-border/60 dark:ring-white/10"
            />
            <KindIcon size={12} className="shrink-0 text-zinc-400 dark:text-zinc-500" />
            <span className={cn('truncate text-xs font-bold text-zinc-900 dark:text-zinc-100 tracking-tight', isCancelled && 'line-through text-zinc-400 dark:text-zinc-500')}>
              {clientName}
            </span>
            <span className="text-micro font-medium text-zinc-500 dark:text-zinc-400">· {appointmentKindLabel(appointment.kind, appointment.projectPosition)}</span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {isCompleted ? (
              <span className="shrink-0 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-2xs font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-500/30 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-500/30">
                <Check size={11} className="stroke-[2.5]" />
                הושלם
              </span>
            ) : visual.marker ? (
              <span
                className={cn(
                  'shrink-0 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-2xs font-bold',
                  visual.marker === 'close_out'
                    ? 'bg-amber-50 text-amber-700 border border-amber-300 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-500/30'
                    : 'bg-zinc-100 text-zinc-700 border border-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700',
                )}
              >
                <span className={cn('size-1.5 rounded-full', MARKER_DOT[visual.marker])} />
                {MARKER_LABELS[visual.marker]}
              </span>
            ) : (
              <span className={cn('shrink-0 rounded-full px-2 py-0.5 text-2xs font-bold', statusVisual.badgeClass)}>
                {statusVisual.label}
              </span>
            )}
          </div>
        </div>

        {appointment.style && <p className="text-2xs text-zinc-500 dark:text-zinc-400 truncate">{appointment.style}</p>}

        <div className="flex flex-wrap items-center gap-2 pt-0.5 text-micro text-zinc-500 dark:text-zinc-400">
          {priceFormatted && <span className="font-semibold text-zinc-900 dark:text-zinc-200 tabular-nums">{priceFormatted}</span>}
          {appointment.staffName && <span>ע״י {appointment.staffName}</span>}
          {appointment.hasDeposit && (
            <span className="inline-flex items-center gap-0.5 text-2xs font-bold text-emerald-600 dark:text-emerald-400">
              מקדמה שולמה ✓
            </span>
          )}
          {appointment.healthDeclarationSigned && (
            <span className={cn('inline-flex items-center gap-1 font-semibold', isExpired ? 'text-destructive' : 'text-emerald-600 dark:text-emerald-400')}>
              <FileCheck size={11} />
              {isExpired ? 'הצהרה פגה' : 'הצהרה בתוקף'}
            </span>
          )}
          {alerts.length > 0 && (
            <span className="inline-flex items-center gap-1 text-destructive font-bold">
              <TriangleAlert size={11} />
              {alerts.length} התראות
            </span>
          )}
        </div>
      </div>
    </button>
  )
}

export default AppointmentCard
