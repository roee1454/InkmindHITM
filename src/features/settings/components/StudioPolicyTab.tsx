import React, { useEffect, useState } from 'react'
import { Save, Trash2 } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  getStudioPolicySettings,
  saveStudioPolicySettings,
  getStudioClosures,
  addStudioClosure,
  deleteStudioClosure,
  type StudioPolicySettings,
  type StudioClosure,
} from '../server/settings'

const ClosuresSection: React.FC = () => {
  const queryClient = useQueryClient()
  const [date, setDate] = useState('')
  const [reason, setReason] = useState('')

  const { data: closures = [] } = useQuery<StudioClosure[]>({
    queryKey: ['studio-closures'],
    queryFn: () => getStudioClosures(),
  })

  const addMutation = useMutation({
    mutationFn: () => addStudioClosure({ data: { date, reason } }),
    onSuccess: () => {
      setDate('')
      setReason('')
      queryClient.invalidateQueries({ queryKey: ['studio-closures'] })
    },
  })

  const removeMutation = useMutation({
    mutationFn: (d: string) => deleteStudioClosure({ data: { date: d } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['studio-closures'] }),
  })

  return (
    <div className="grid grid-cols-1 gap-6 py-6 font-assistant lg:grid-cols-12">
      <div className="space-y-1 lg:col-span-5">
        <h3 className="text-sm md:text-base font-bold text-foreground">ימי סגירה של הסטודיו</h3>
        <p className="max-w-sm text-xs leading-relaxed text-muted-foreground">
          תאריכים שבהם הסטודיו סגור (חגים, חופשות). הבוט לא יציע תורים בתאריכים אלה.
        </p>
      </div>

      <div className="space-y-4 lg:col-span-7">
        <div className="flex flex-wrap items-end gap-2">
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-muted-foreground">תאריך</label>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-40 bg-white text-foreground border-input"
            />
          </div>
          <div className="min-w-[140px] flex-1 space-y-1">
            <label className="text-[11px] font-bold text-muted-foreground">סיבה (אופציונלי)</label>
            <Input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="יום כיפור"
              className="bg-white text-foreground border-input"
            />
          </div>
          <Button onClick={() => addMutation.mutate()} disabled={!date || addMutation.isPending}>
            {addMutation.isPending ? 'מוסיף…' : 'הוספה'}
          </Button>
        </div>

        {closures.length === 0 ? (
          <p className="text-[11px] text-muted-foreground">לא הוגדרו ימי סגירה.</p>
        ) : (
          <ul className="space-y-1.5">
            {closures.map((c) => (
              <li
                key={c.date}
                className="flex items-center justify-between rounded-lg border border-border bg-card px-3 py-2 text-xs shadow-sm"
              >
                <span className="text-foreground">
                  {c.date}
                  {c.reason ? <span className="text-muted-foreground"> — {c.reason}</span> : null}
                </span>
                <button
                  type="button"
                  onClick={() => removeMutation.mutate(c.date)}
                  className="cursor-pointer text-rose-400 hover:text-rose-300"
                  aria-label="הסרה"
                >
                  <Trash2 size={14} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

export const StudioPolicyTab: React.FC = () => {
  const queryClient = useQueryClient()
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  const { data: settings } = useQuery<StudioPolicySettings>({
    queryKey: ['studio-policy-settings'],
    queryFn: () => getStudioPolicySettings(),
  })

  const [paymentInstructions, setPaymentInstructions] = useState('')
  const [reviewLink, setReviewLink] = useState('')
  const [cancellationCutoffHours, setCancellationCutoffHours] = useState('48')
  const [staffNotificationPhone, setStaffNotificationPhone] = useState('')
  const [defaultSessionDurationHours, setDefaultSessionDurationHours] = useState('2')

  useEffect(() => {
    if (!settings) return
    setPaymentInstructions(settings.paymentInstructions ?? '')
    setReviewLink(settings.reviewLink ?? '')
    setCancellationCutoffHours(String(settings.cancellationCutoffHours ?? 48))
    setStaffNotificationPhone(settings.staffNotificationPhone ?? '')
    setDefaultSessionDurationHours(String(settings.defaultSessionDurationHours ?? 2))
  }, [settings])

  const saveMutation = useMutation({
    mutationFn: () =>
      saveStudioPolicySettings({
        data: {
          paymentInstructions,
          reviewLink,
          cancellationCutoffHours: Number(cancellationCutoffHours),
          staffNotificationPhone,
          defaultSessionDurationHours: Number(defaultSessionDurationHours),
        },
      }),
    onSuccess: () => {
      setError(null)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
      queryClient.invalidateQueries({ queryKey: ['studio-policy-settings'] })
    },
    onError: (err: unknown) =>
      setError(err instanceof Error ? err.message : 'שגיאה בשמירת ההגדרות'),
  })

  const cutoffInvalid =
    cancellationCutoffHours !== '' &&
    (isNaN(Number(cancellationCutoffHours)) || Number(cancellationCutoffHours) < 0)
  const durationInvalid =
    defaultSessionDurationHours !== '' &&
    (isNaN(Number(defaultSessionDurationHours)) || Number(defaultSessionDurationHours) <= 0)

  return (
    <div className="space-y-0 font-assistant text-right" dir="rtl">
      {error && (
        <div className="mb-6 rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-xs font-semibold text-rose-400">
          {error}
        </div>
      )}

      {/* Section 1: Payment Instructions */}
      <div className="grid grid-cols-1 gap-6 border-b border-border/60 py-6 lg:grid-cols-12">
        <div className="space-y-1 lg:col-span-5">
          <h3 className="text-sm md:text-base font-bold text-foreground">אמצעי תשלום למקדמה</h3>
          <p className="max-w-sm text-xs leading-relaxed text-muted-foreground">
            הזן את פרטי העברה הבנקאית או האפליקציות. מוצג ללקוח בשיחה בעת בקשת מקדמה.
          </p>
        </div>

        <div className="space-y-2 lg:col-span-7">
          <Textarea
            value={paymentInstructions}
            onChange={(e) => setPaymentInstructions(e.target.value)}
            placeholder="לדוגמה: ביט למספר 050-1234567, או העברה בנקאית: בנק 12 סניף 345 חשבון 678901"
            rows={4}
            dir="rtl"
            className="bg-white text-foreground border-input"
          />
        </div>
      </div>

      {/* Section 2: Policy & Notifications */}
      <div className="grid grid-cols-1 gap-6 border-b border-border/60 py-6 lg:grid-cols-12">
        <div className="space-y-1 lg:col-span-5">
          <h3 className="text-sm md:text-base font-bold text-foreground">מדיניות והתראות צוות</h3>
          <p className="max-w-sm text-xs leading-relaxed text-muted-foreground">
            פרמטרים של חלונות ביטול, משך פגישה ברירת מחדל, קישור לביקורת Google ומספר להודעות צוות.
          </p>
        </div>

        <div className="space-y-4 lg:col-span-7">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">קישור לביקורת Google</label>
            <Input
              value={reviewLink}
              onChange={(e) => setReviewLink(e.target.value)}
              placeholder="https://g.page/r/…"
              dir="ltr"
              className="bg-white text-foreground border-input"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">חלון ביטול (שעות)</label>
              <Input
                type="number"
                min={0}
                value={cancellationCutoffHours}
                onChange={(e) => setCancellationCutoffHours(e.target.value)}
                dir="rtl"
                className="bg-white text-foreground border-input text-right"
              />
              <p className="text-[11px] text-muted-foreground">
                ביטול בתוך פרק הזמן הזה מועבר לנציג.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                משך פגישה (שעות)
              </label>
              <Input
                type="number"
                min={0.5}
                step={0.5}
                value={defaultSessionDurationHours}
                onChange={(e) => setDefaultSessionDurationHours(e.target.value)}
                dir="rtl"
                className="bg-white text-foreground border-input text-right"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">מספר WhatsApp להתראות צוות</label>
            <Input
              value={staffNotificationPhone}
              onChange={(e) => setStaffNotificationPhone(e.target.value)}
              placeholder="972501234567"
              dir="ltr"
              className="bg-white text-foreground border-input"
            />
          </div>

          <div className="flex items-center gap-3 pt-2">
            <Button
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending || cutoffInvalid || durationInvalid}
            >
              <Save size={16} className="ml-1.5" />
              {saveMutation.isPending ? 'שומר…' : 'שמור שינויים'}
            </Button>
            {saved && <span className="text-xs font-semibold text-emerald-400">נשמר בהצלחה ✓</span>}
          </div>
        </div>
      </div>

      {/* Section 3: Closures */}
      <ClosuresSection />
    </div>
  )
}

export default StudioPolicyTab
