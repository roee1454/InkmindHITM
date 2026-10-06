import React, { useState } from 'react'
import { TriangleAlert } from '@/components/ui/icon'
import { IMTextarea } from '@/components/ui/textarea'
import { IMSelect, IMSelectContent, IMSelectItem, IMSelectTrigger, IMSelectValue } from '@/components/ui/select'
import { IMSwitch } from '@/components/ui/switch'
import { IMAvatar, IMAvatarFallback, IMAvatarImage } from '@/components/ui/avatar'
import type { ApiGoogleConnection, AppointmentFormValues } from '../../types'
import { formatDuration } from '@/features/conversations/utils/format'
import { NoCalendarWarningDialog } from '../NoCalendarWarningDialog'

const NO_ARTIST = 'none'

// 30-minute increments, 30 minutes to 8 hours.
const DURATION_OPTIONS = Array.from({ length: 16 }, (_, i) => (i + 1) * 30)

interface StaffItem {
  id: string
  name: string
  avatar?: string
}

interface StepStaffDurationProps {
  values: AppointmentFormValues
  onChange: (patch: Partial<AppointmentFormValues>) => void
  staff: StaffItem[]
  googleConnections: ApiGoogleConnection[]
  fitsWorkingHours: boolean
  isStudioClosed: boolean
  closureReason: string | null
}

export const StepStaffDuration: React.FC<StepStaffDurationProps> = ({
  values,
  onChange,
  staff,
  googleConnections,
  fitsWorkingHours,
  isStudioClosed,
  closureReason,
}) => {
  const [noCalendarArtistName, setNoCalendarArtistName] = useState<string | null>(null)

  return (
    <div className="space-y-4 font-assistant" dir="rtl">
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5" dir="rtl">
          <label className="text-xs font-semibold text-foreground">
            {values.type === 'sketch' ? 'מקעקע' : 'מקעקע *'}
          </label>
          <IMSelect
            value={values.staffId ?? NO_ARTIST}
            onValueChange={(val) => {
              const staffId = val === NO_ARTIST ? null : val
              onChange({ staffId })
              const connection = googleConnections.find((c) => c.staffId === staffId)
              if (staffId && (!connection || connection.status === 'disconnected')) {
                setNoCalendarArtistName(staff.find((s) => s.id === staffId)?.name ?? null)
              }
            }}
          >
            <IMSelectTrigger className="w-full">
              <IMSelectValue placeholder="ללא שיוך" />
            </IMSelectTrigger>
            <IMSelectContent align="end">
              <IMSelectItem value={NO_ARTIST}>ללא שיוך</IMSelectItem>
              {staff.map((artist) => {
                const connection = googleConnections.find(
                  (c) => c.staffId === artist.id && c.status === 'connected',
                )
                const picture = connection?.googleAccountPicture || artist.avatar

                return (
                  <IMSelectItem key={artist.id} value={artist.id}>
                    <div className="flex items-center gap-2">
                      <IMAvatar className="size-5">
                        <IMAvatarImage src={picture ?? undefined} />
                        <IMAvatarFallback className="text-micro bg-muted">
                          {artist.name.slice(0, 2)}
                        </IMAvatarFallback>
                      </IMAvatar>
                      <span>{artist.name}</span>
                    </div>
                  </IMSelectItem>
                )
              })}
            </IMSelectContent>
          </IMSelect>
        </div>

        <div className="flex flex-col gap-1.5" dir="rtl">
          <label className="text-xs font-semibold text-foreground">משך</label>
          <IMSelect
            value={String(values.durationMinutes)}
            onValueChange={(val) => onChange({ durationMinutes: Number(val) })}
          >
            <IMSelectTrigger className="w-full">
              <IMSelectValue />
            </IMSelectTrigger>
            <IMSelectContent align="end">
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
        <div className="flex flex-col gap-2 rounded-xl border border-accent-ink/30 bg-accent-ink/10 p-3">
          <div className="flex items-center gap-1.5 text-xs font-bold text-accent-ink">
            <TriangleAlert size={13} className="shrink-0" />
            הסטודיו סגור בתאריך זה
          </div>
          <p className="text-mini text-muted-foreground">
            {closureReason ? `סיבת הסגירה: ${closureReason}.` : 'התאריך שנבחר מוגדר כיום סגירה של הסטודיו.'}
          </p>
          <div className="flex items-center justify-between pt-1">
            <span className="text-xs font-semibold text-foreground">אני מודע/ת שהסטודיו סגור — שריין בכל זאת</span>
            <IMSwitch
              id="appointment-allow-closure-exception"
              checked={values.allowException}
              onCheckedChange={(checked) => onChange({ allowException: checked })}
            />
          </div>
        </div>
      )}

      {!fitsWorkingHours && (
        <div className="flex flex-col gap-2 rounded-xl border border-accent-ink/30 bg-accent-ink/10 p-3">
          <div className="flex items-center gap-1.5 text-xs font-bold text-accent-ink">
            <TriangleAlert size={13} className="shrink-0" />
            מחוץ לשעות העבודה
          </div>
          <p className="text-mini text-muted-foreground">
            המועד שנבחר אינו בתוך שעות העבודה של האמן/ית שנבחר/ה.
          </p>
          <div className="flex items-center justify-between pt-1">
            <span className="text-xs font-semibold text-foreground">אני מודע/ת שזה מחוץ לשעות העבודה — שריין בכל זאת</span>
            <IMSwitch
              id="appointment-allow-exception"
              checked={values.allowException}
              onCheckedChange={(checked) => onChange({ allowException: checked })}
            />
          </div>
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold text-foreground">
          {values.type === 'sketch' ? 'נושא פגישת הסקיצה / ייעוץ' : 'תיאור הקעקוע'}
        </label>
        <IMTextarea
          rows={3}
          placeholder={
            values.type === 'sketch'
              ? 'תיאור הרעיון לסקיצה, כיוון עיצובי, קאבראפ או מיקום מבוקש…'
              : 'תיאור הקעקוע, מיקום על הגוף, גודל משוער וסגנון…'
          }
          value={values.tattooDescription}
          onChange={(e) => onChange({ tattooDescription: e.target.value })}
          className="resize-none text-xs min-h-[72px]"
        />
      </div>

      <NoCalendarWarningDialog artistName={noCalendarArtistName} onClose={() => setNoCalendarArtistName(null)} />
    </div>
  )
}

export default StepStaffDuration
