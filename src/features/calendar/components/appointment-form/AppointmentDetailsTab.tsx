import { useState } from 'react'
import { Plus, TriangleAlert } from '@/components/ui/icon'
import { IMTextarea } from '@/components/ui/textarea'
import { IMSelect, IMSelectContent, IMSelectItem, IMSelectTrigger, IMSelectValue } from '@/components/ui/select'
import { IMSwitch } from '@/components/ui/switch'
import { IMAvatar, IMAvatarFallback, IMAvatarImage } from '@/components/ui/avatar'
import { IMDatePicker } from '@/components/ui/date-picker'
import { IMHourPicker } from '@/components/ui/hour-picker'
import { formatDuration } from '@/features/conversations/utils/format'
import { useWorkingHoursCheck } from '../../hooks/useWorkingHoursCheck'
import type { ApiGoogleConnection, AppointmentFormValues } from '../../types'
import { NoCalendarWarningDialog } from '../NoCalendarWarningDialog'

const NO_ARTIST = 'none'
// 30-minute increments, 30 minutes to 8 hours.
const DURATION_OPTIONS = Array.from({ length: 16 }, (_, i) => (i + 1) * 30)

interface AppointmentDetailsTabProps {
  values: AppointmentFormValues
  onChange: (patch: Partial<AppointmentFormValues>) => void
  staff: { id: string; name: string; avatar?: string }[]
  googleConnections: ApiGoogleConnection[]
  readOnly: boolean
}

/** A booking outside the studio's hours: say why, and let staff book it anyway on purpose. */
function ExceptionNotice({ title, text, checked, readOnly, onCheckedChange }: { title: string; text: string; checked: boolean; readOnly: boolean; onCheckedChange: (checked: boolean) => void }) {
  return (
    <div className="flex flex-col gap-2 rounded-lg bg-warning/10 px-3 py-2.5">
      <p className="flex items-center gap-1.5 text-sm font-bold text-warning">
        <TriangleAlert size={14} className="shrink-0" />
        {title}
      </p>
      <p className="text-xs text-foreground/80">{text}</p>
      <label className="flex cursor-pointer items-center justify-between gap-3 text-xs font-bold text-foreground">
        לקבוע בכל זאת
        <IMSwitch disabled={readOnly} checked={checked} onCheckedChange={onCheckedChange} />
      </label>
    </div>
  )
}

/** When, with whom, for how long, and what the piece is. */
export function AppointmentDetailsTab({ values, onChange, staff, googleConnections, readOnly }: AppointmentDetailsTabProps) {
  const [noCalendarArtistName, setNoCalendarArtistName] = useState<string | null>(null)
  const [showNotes, setShowNotes] = useState(Boolean(values.notes?.trim()))
  const { fitsWorkingHours, isStudioClosed, closureReason } = useWorkingHoursCheck(values.staffId, values.date, values.timeSlot, values.durationMinutes / 60)
  const isSketch = values.type === 'sketch'

  const pickArtist = (value: string) => {
    const staffId = value === NO_ARTIST ? null : value
    onChange({ staffId })
    const connection = googleConnections.find((c) => c.staffId === staffId)
    if (staffId && (!connection || connection.status === 'disconnected')) setNoCalendarArtistName(staff.find((s) => s.id === staffId)?.name ?? null)
  }

  return (
    <div className="form-stack">
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <span className="form-label">תאריך</span>
          <IMDatePicker value={values.date} onChange={(ymd) => onChange({ date: ymd })} disabled={readOnly} />
        </div>
        <div className="flex flex-col gap-1.5">
          <span className="form-label">שעה</span>
          <IMHourPicker value={values.timeSlot} onChange={(time) => onChange({ timeSlot: time })} disabled={readOnly} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <span className="form-label">מקעקע</span>
          <IMSelect dir="rtl" disabled={readOnly} value={values.staffId ?? NO_ARTIST} onValueChange={pickArtist}>
            <IMSelectTrigger className="w-full" aria-label="מקעקע">
              <IMSelectValue placeholder="ללא שיוך" />
            </IMSelectTrigger>
            <IMSelectContent align="end" dir="rtl">
              <IMSelectItem value={NO_ARTIST}>ללא שיוך</IMSelectItem>
              {staff.map((artist) => {
                const connection = googleConnections.find((c) => c.staffId === artist.id && c.status === 'connected')
                return (
                  <IMSelectItem key={artist.id} value={artist.id}>
                    <span className="flex items-center gap-2">
                      <IMAvatar className="size-5">
                        <IMAvatarImage src={(connection?.googleAccountPicture || artist.avatar) ?? undefined} />
                        <IMAvatarFallback className="bg-muted text-micro">{artist.name.slice(0, 2)}</IMAvatarFallback>
                      </IMAvatar>
                      {artist.name}
                    </span>
                  </IMSelectItem>
                )
              })}
            </IMSelectContent>
          </IMSelect>
        </div>
        <div className="flex flex-col gap-1.5">
          <span className="form-label">משך</span>
          <IMSelect dir="rtl" disabled={readOnly} value={String(values.durationMinutes)} onValueChange={(v) => onChange({ durationMinutes: Number(v) })}>
            <IMSelectTrigger className="w-full" aria-label="משך">
              <IMSelectValue />
            </IMSelectTrigger>
            <IMSelectContent align="end" dir="rtl">
              {DURATION_OPTIONS.map((minutes) => (
                <IMSelectItem key={minutes} value={String(minutes)}>
                  {formatDuration(minutes)}
                </IMSelectItem>
              ))}
            </IMSelectContent>
          </IMSelect>
        </div>
      </div>

      {isStudioClosed && (
        <ExceptionNotice
          title="הסטודיו סגור בתאריך הזה"
          text={closureReason ? `סיבת הסגירה: ${closureReason}.` : 'התאריך מוגדר כיום סגירה.'}
          checked={values.allowException}
          readOnly={readOnly}
          onCheckedChange={(checked) => onChange({ allowException: checked })}
        />
      )}
      {!fitsWorkingHours && (
        <ExceptionNotice
          title="מחוץ לשעות העבודה"
          text="המועד לא נמצא בשעות העבודה של המקעקע."
          checked={values.allowException}
          readOnly={readOnly}
          onCheckedChange={(checked) => onChange({ allowException: checked })}
        />
      )}

      <div className="flex flex-col gap-1.5">
        <label htmlFor="appointment-description" className="form-label">
          {isSketch ? 'על מה הפגישה' : 'תיאור הקעקוע'}
        </label>
        <IMTextarea
          id="appointment-description"
          rows={3}
          disabled={readOnly}
          placeholder={isSketch ? 'הרעיון, כיוון עיצובי, כיסוי או מיקום…' : 'מה מקעקעים, איפה על הגוף, גודל וסגנון…'}
          value={values.tattooDescription}
          onChange={(e) => onChange({ tattooDescription: e.target.value })}
          className="min-h-[72px] resize-none"
        />
      </div>

      {showNotes || values.notes ? (
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <label htmlFor="appointment-notes" className="form-label">
              הערה לצוות <span className="font-medium text-muted-foreground">(הלקוח לא רואה)</span>
            </label>
            {!values.notes && !readOnly && (
              <button type="button" onClick={() => setShowNotes(false)} className="cursor-pointer text-xs text-muted-foreground hover:text-foreground">
                הסרה
              </button>
            )}
          </div>
          <IMTextarea
            id="appointment-notes"
            rows={2}
            disabled={readOnly}
            placeholder="רגישות לחומרים, מלווה, בקשות מיוחדות…"
            value={values.notes}
            onChange={(e) => onChange({ notes: e.target.value })}
            className="min-h-[56px] resize-none"
          />
        </div>
      ) : (
        !readOnly && (
          <button
            type="button"
            onClick={() => setShowNotes(true)}
            className="inline-flex cursor-pointer items-center gap-1.5 self-start text-sm font-bold text-muted-foreground transition-colors hover:text-foreground"
          >
            <Plus size={14} />
            הערה לצוות
          </button>
        )
      )}

      <NoCalendarWarningDialog artistName={noCalendarArtistName} onClose={() => setNoCalendarArtistName(null)} />
    </div>
  )
}
