import React, { useState } from 'react'
import { PencilSimple, Trash, Image as ImageIcon, PencilLine, Needle, CalendarCheck, CalendarX } from '@/components/ui/icon'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { ApiAppointment, AppointmentStatus } from '../types'
import { STATUS_LABELS } from '../types'
import { ImageGalleryDialog } from './ImageGalleryDialog'
import { formatDuration, formatPriceRange } from '@/features/conversations/utils/format'
import { formatPhoneForDisplay } from '@/lib/phone'
import { appointmentKindLabel } from '../utils/project-position'

interface AppointmentTableProps {
  appointments: ApiAppointment[]
  onEdit: (appt: ApiAppointment) => void
  onDelete: (id: string) => void
  onStatusChange: (id: string, status: AppointmentStatus) => void
}

interface AppointmentTableRowProps {
  appt: ApiAppointment
  onEdit: (appt: ApiAppointment) => void
  onDelete: (id: string) => void
  onStatusChange: (id: string, status: AppointmentStatus) => void
  onOpenGallery: (images: string[], index: number) => void
}

const AppointmentTableRow = React.memo<AppointmentTableRowProps>(({
  appt,
  onEdit,
  onDelete,
  onStatusChange,
  onOpenGallery,
}) => {
  return (
    <tr className="hover:bg-muted/30 transition-colors">
      {/* Client info */}
      <td className="px-6 py-4 align-middle">
        <div className="text-sm font-bold text-foreground leading-tight">
          {appt.leadName || 'לקוח'}
        </div>
        <div className="text-mini text-muted-foreground mt-1 font-assistant dir-ltr text-right">
          {formatPhoneForDisplay(appt.leadPhone) || '—'}
        </div>
      </td>

      {/* Date & Time */}
      <td className="px-6 py-4 align-middle text-sm text-muted-foreground">
        <div className="font-semibold text-foreground">{appt.date}</div>
        <div className="text-mini text-muted-foreground mt-1">
          {appt.timeSlot} {appt.durationMinutes ? `(${formatDuration(appt.durationMinutes)})` : ''}
        </div>
      </td>

      {/* Tattoo Description & Artist */}
      <td className="px-6 py-4 align-middle">
        <div className="flex items-center gap-1.5 max-w-[220px]">
          {appt.type === 'sketch' ? (
            <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-micro font-extrabold bg-accent-ink/15 text-accent-ink border border-accent-ink/30 shrink-0">
              <PencilLine size={9} />
              <span>סקיצה</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-micro font-bold bg-primary/10 text-primary border border-primary/20 shrink-0">
              <Needle size={11} />
              <span>{appointmentKindLabel(appt.kind, appt.projectPosition)}</span>
            </span>
          )}
          <span className="text-sm font-bold text-foreground truncate">
            {appt.style || (appt.type === 'sketch' ? 'פגישת סקיצה / ייעוץ' : 'קעקוע כללי')}
          </span>
        </div>
        <div className="text-mini text-muted-foreground mt-1">
          {appt.staffName || 'לא משויך'}
        </div>
      </td>

      {/* Price & Deposit */}
      <td className="px-6 py-4 align-middle">
        <div className="text-sm font-bold text-foreground">
          {appt.priceMin !== null || appt.priceMax !== null ? formatPriceRange(appt.priceMin, appt.priceMax) : '—'}
        </div>
        <div className="text-micro mt-1">
          {appt.hasDeposit ? (
            <span className="text-status-done font-bold">מקדמה ✓</span>
          ) : (
            <span className="text-muted-foreground">ללא מקדמה</span>
          )}
        </div>
      </td>

      {/* Status Dropdown */}
      <td className="px-6 py-4 align-middle">
        <div className="w-36">
          <Select
            value={appt.status}
            onValueChange={(val) => onStatusChange(appt.id, val as AppointmentStatus)}
          >
            <SelectTrigger size="sm" className="h-8 text-xs py-1 rounded-xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent align="end" position="popper" dir="rtl">
              {Object.entries(STATUS_LABELS).map(([key, label]) => (
                <SelectItem key={key} value={key} className="text-xs">
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {appt.status === 'confirmed' && (
            <div className="mt-1 flex items-center gap-1">
              {appt.googleSyncStatus === 'push_failed' ? (
                <span className="inline-flex items-center gap-1 text-micro text-destructive font-bold">
                  <CalendarX size={11} />
                  <span>סנכרון נכשל</span>
                </span>
              ) : appt.googleSyncStatus === 'synced' ? (
                <span className="inline-flex items-center gap-1 text-micro text-status-done font-bold">
                  <CalendarCheck size={11} />
                  <span>מסונכרן לגוגל</span>
                </span>
              ) : null}
            </div>
          )}
        </div>
      </td>

      {/* Actions */}
      <td className="px-6 py-4 align-middle">
        <div className="flex items-center justify-center gap-2">
          {appt.referenceImages && appt.referenceImages.length > 0 && (
            <button
              type="button"
              onClick={() => onOpenGallery(appt.referenceImages!, 0)}
              className="p-1.5 hover:bg-muted text-muted-foreground hover:text-primary rounded-lg transition-colors cursor-pointer"
              title="תמונות התייחסות"
            >
              <ImageIcon size={14} />
            </button>
          )}
          <button
            type="button"
            onClick={() => onEdit(appt)}
            className="p-1.5 hover:bg-muted text-muted-foreground hover:text-foreground rounded-lg transition-colors cursor-pointer"
            title="ערוך תור"
          >
            <PencilSimple size={14} />
          </button>
          <button
            type="button"
            onClick={() => onDelete(appt.id)}
            className="p-1.5 hover:bg-destructive/10 text-muted-foreground hover:text-destructive rounded-lg transition-colors cursor-pointer"
            title="מחק תור"
          >
            <Trash size={14} />
          </button>
        </div>
      </td>
    </tr>
  )
})
AppointmentTableRow.displayName = 'AppointmentTableRow'

export const AppointmentTable: React.FC<AppointmentTableProps> = ({
  appointments,
  onEdit,
  onDelete,
  onStatusChange,
}) => {
  const [selectedGallery, setSelectedGallery] = useState<{ images: string[]; index: number } | null>(null)

  const handleOpenGallery = React.useCallback((images: string[], index: number) => {
    setSelectedGallery({ images, index })
  }, [])

  return (
    <div className="bg-card border border-border rounded-3xl overflow-hidden shadow-sm font-assistant" dir="rtl">
      <div className="overflow-x-auto">
        <table className="w-full text-right border-collapse">
          <thead>
            <tr className="border-b border-border bg-muted/50 text-xs font-bold text-muted-foreground">
              <th className="px-6 py-4">לקוח</th>
              <th className="px-6 py-4">תאריך ושעה</th>
              <th className="px-6 py-4">קעקוע</th>
              <th className="px-6 py-4">מחיר</th>
              <th className="px-6 py-4">סטטוס</th>
              <th className="px-6 py-4 text-center">פעולות</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {appointments.map((appt) => (
              <AppointmentTableRow
                key={appt.id}
                appt={appt}
                onEdit={onEdit}
                onDelete={onDelete}
                onStatusChange={onStatusChange}
                onOpenGallery={handleOpenGallery}
              />
            ))}
          </tbody>
        </table>
      </div>

      {selectedGallery && (
        <ImageGalleryDialog
          images={selectedGallery.images}
          initialIndex={selectedGallery.index}
          open={selectedGallery !== null}
          onOpenChange={(open) => !open && setSelectedGallery(null)}
        />
      )}
    </div>
  )
}

export default AppointmentTable
