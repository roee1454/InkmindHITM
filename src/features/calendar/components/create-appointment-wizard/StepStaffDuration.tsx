import React, { useState } from 'react'
import { TriangleAlert } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import type { ApiGoogleConnection, AppointmentFormValues } from '../../types'
import { formatDuration } from '@/features/conversations/lib/format'
import { NoCalendarWarningDialog } from './NoCalendarWarningDialog'

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
          <label className="text-xs font-semibold text-foreground">מקעקע</label>
          <Select
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
            <SelectTrigger className="w-full">
              <SelectValue placeholder="ללא שיוך" />
            </SelectTrigger>
            <SelectContent align="end">
              <SelectItem value={NO_ARTIST}>ללא שיוך</SelectItem>
              {staff.map((artist) => {
                const connection = googleConnections.find(
                  (c) => c.staffId === artist.id && c.status === 'connected',
                )
                const picture = connection?.googleAccountPicture || artist.avatar

                return (
                  <SelectItem key={artist.id} value={artist.id}>
                    <div className="flex items-center gap-2">
                      <Avatar className="size-5">
                        <AvatarImage src={picture ?? undefined} />
                        <AvatarFallback className="text-micro bg-muted">
                          {artist.name.slice(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                      <span>{artist.name}</span>
                    </div>
                  </SelectItem>
                )
              })}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1.5" dir="rtl">
          <label className="text-xs font-semibold text-foreground">משך</label>
          <Select
            value={String(values.durationMinutes)}
            onValueChange={(val) => onChange({ durationMinutes: Number(val) })}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent align="end">
              {DURATION_OPTIONS.map((minutes) => (
                <SelectItem key={minutes} value={String(minutes)}>
                  {formatDuration(minutes)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {isStudioClosed && (
        <div className="flex flex-col gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3">
          <div className="flex items-center gap-1.5 text-xs font-bold text-amber-400">
            <TriangleAlert size={13} className="shrink-0" />
            הסטודיו סגור בתאריך זה
          </div>
          <p className="text-mini text-muted-foreground">
            {closureReason ? `סיבת הסגירה: ${closureReason}.` : 'התאריך שנבחר מוגדר כיום סגירה של הסטודיו.'}
          </p>
          <div className="flex items-center justify-between pt-1">
            <span className="text-xs font-semibold text-foreground">אני מודע/ת שהסטודיו סגור — שריין בכל זאת</span>
            <Switch
              id="appointment-allow-closure-exception"
              checked={values.allowException}
              onCheckedChange={(checked) => onChange({ allowException: checked })}
            />
          </div>
        </div>
      )}

      {!fitsWorkingHours && (
        <div className="flex flex-col gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3">
          <div className="flex items-center gap-1.5 text-xs font-bold text-amber-400">
            <TriangleAlert size={13} className="shrink-0" />
            מחוץ לשעות העבודה
          </div>
          <p className="text-mini text-muted-foreground">
            המועד שנבחר אינו בתוך שעות העבודה של האמן/ית שנבחר/ה.
          </p>
          <div className="flex items-center justify-between pt-1">
            <span className="text-xs font-semibold text-foreground">אני מודע/ת שזה מחוץ לשעות העבודה — שריין בכל זאת</span>
            <Switch
              id="appointment-allow-exception"
              checked={values.allowException}
              onCheckedChange={(checked) => onChange({ allowException: checked })}
            />
          </div>
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold text-foreground">תיאור קעקוע</label>
        <Input
          type="text"
          placeholder="פורטרט ריאליסטי"
          value={values.tattooDescription}
          onChange={(e) => onChange({ tattooDescription: e.target.value })}
        />
      </div>

      <NoCalendarWarningDialog artistName={noCalendarArtistName} onClose={() => setNoCalendarArtistName(null)} />
    </div>
  )
}

export default StepStaffDuration
