import React, { useState } from 'react'
import { Edit3, Trash2, Image as ImageIcon } from 'lucide-react'
import { SelectInput } from '@/components/ui/select-input'
import type { ApiAppointment, AppointmentStatus } from '../types'
import { STATUS_LABELS } from '../types'
import { ImageGalleryDialog } from './ImageGalleryDialog'

interface AppointmentTableProps {
  appointments: ApiAppointment[]
  onEdit: (appt: ApiAppointment) => void
  onDelete: (id: string) => void
  onStatusChange: (id: string, status: AppointmentStatus) => void
}

export const AppointmentTable: React.FC<AppointmentTableProps> = ({
  appointments,
  onEdit,
  onDelete,
  onStatusChange,
}) => {
  const [selectedGallery, setSelectedGallery] = useState<{ images: string[]; index: number } | null>(null)

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm font-assistant" dir="rtl">
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
              <tr key={appt.id} className="hover:bg-muted/30 transition-colors">
                {/* Client info */}
                <td className="px-6 py-4 align-middle">
                  <div className="text-sm font-bold text-foreground leading-tight">
                    {appt.leadName || 'לקוח'}
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-1 font-mono dir-ltr text-right">
                    {appt.leadPhone || '—'}
                  </div>
                </td>

                {/* Date & Time */}
                <td className="px-6 py-4 align-middle text-sm text-muted-foreground">
                  <div className="font-semibold text-foreground">{appt.date}</div>
                  <div className="text-[11px] text-muted-foreground mt-1">
                    {appt.timeSlot} {appt.durationHours ? `(${appt.durationHours} שעות)` : ''}
                  </div>
                </td>

                {/* Tattoo Description & Artist */}
                <td className="px-6 py-4 align-middle">
                  <div className="text-sm font-bold text-foreground max-w-[200px] truncate">
                    {appt.style || 'קעקוע כללי'}
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-1">
                    {appt.staffName || 'לא משויך'}
                  </div>
                </td>

                {/* Price & Deposit */}
                <td className="px-6 py-4 align-middle">
                  <div className="text-sm font-bold text-foreground">
                    {appt.price !== null ? `₪${appt.price.toLocaleString()}` : '—'}
                  </div>
                  <div className="text-[10px] mt-1">
                    {appt.hasDeposit ? (
                      <span className="text-emerald-400 font-bold">מקדמה ✓</span>
                    ) : (
                      <span className="text-muted-foreground">ללא מקדמה</span>
                    )}
                  </div>
                </td>

                {/* Status Dropdown */}
                <td className="px-6 py-4 align-middle">
                  <div className="w-36">
                    <SelectInput
                      value={appt.status}
                      onChange={(e) => onStatusChange(appt.id, e.target.value as AppointmentStatus)}
                      className="h-8 text-xs py-1"
                    >
                      {Object.entries(STATUS_LABELS).map(([key, label]) => (
                        <option key={key} value={key}>
                          {label}
                        </option>
                      ))}
                    </SelectInput>
                  </div>
                </td>

                {/* Actions */}
                <td className="px-6 py-4 align-middle">
                  <div className="flex items-center justify-center gap-2">
                    {appt.referenceImages && appt.referenceImages.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setSelectedGallery({ images: appt.referenceImages!, index: 0 })}
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
                      <Edit3 size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete(appt.id)}
                      className="p-1.5 hover:bg-rose-500/10 text-muted-foreground hover:text-rose-400 rounded-lg transition-colors cursor-pointer"
                      title="מחק תור"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
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
