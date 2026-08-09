import React, { useEffect, useState } from 'react'
import { Save } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { getStudioPolicySettings, saveStudioPolicySettings } from '../server/settings'
import type { StudioPolicySettings } from '../server/settings'
import { ClosuresSection } from './ClosuresSection'

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

  useEffect(() => {
    if (!settings) return
    setPaymentInstructions(settings.paymentInstructions ?? '')
    setReviewLink(settings.reviewLink ?? '')
    setCancellationCutoffHours(String(settings.cancellationCutoffHours ?? 48))
  }, [settings])

  const saveMutation = useMutation({
    mutationFn: () =>
      saveStudioPolicySettings({
        data: {
          paymentInstructions,
          reviewLink,
          cancellationCutoffHours: Number(cancellationCutoffHours),
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

  return (
    <div className="space-y-0 font-assistant text-right" dir="rtl">
      {error && (
        <div className="mb-6 rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-xs font-semibold text-rose-400">
          {error}
        </div>
      )}

      {/* Section 1: Payment Instructions */}
      <div className="grid grid-cols-1 gap-6 border-b border-border/60 py-2 lg:py-6 lg:grid-cols-12">
        <div className="space-y-1 lg:col-span-5">
          <h3 className="text-base font-bold text-foreground">אמצעי תשלום למקדמה</h3>
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
      <div className="grid grid-cols-1 gap-6 border-b border-border/60 py-2 lg:py-6 lg:grid-cols-12">
        <div className="space-y-1 lg:col-span-5">
          <h3 className="text-base font-bold text-foreground">מדיניות וביקורות</h3>
          <p className="max-w-sm text-xs leading-relaxed text-muted-foreground">
            חלון ביטול וקישור לביקורת Google.
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

          <div className="space-y-1.5 max-w-xs">
            <label className="text-xs font-semibold text-foreground">חלון ביטול (שעות)</label>
            <Input
              type="number"
              min={0}
              value={cancellationCutoffHours}
              onChange={(e) => setCancellationCutoffHours(e.target.value)}
              dir="rtl"
              className="bg-white text-foreground border-input text-right"
            />
            <p className="text-mini text-muted-foreground">
              ביטול בתוך פרק הזמן הזה מועבר לנציג.
            </p>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <Button
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending || cutoffInvalid}
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
