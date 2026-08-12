import React, { useEffect, useState } from 'react'
import { Save } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { getStudioPolicySettings, saveStudioPolicySettings } from '../server/settings'
import type { StudioPolicySettings } from '../server/settings'
import { ClosuresSection } from './ClosuresSection'
import { SettingsTabSkeleton } from './SettingsTabSkeleton'

const CANCELLATION_WINDOWS = ['12', '24', '48', '72'] as const

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

  if (!settings) return <SettingsTabSkeleton />

  return (
    <div className="flex max-w-xl flex-col gap-5 pb-28 font-assistant" dir="rtl">
      {error && (
        <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-xs font-semibold text-rose-500">
          {error}
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <label className="form-label">הוראות תשלום מקדמה</label>
        <Textarea
          value={paymentInstructions}
          onChange={(e) => setPaymentInstructions(e.target.value)}
          placeholder="לדוגמה: ביט למספר 050-1234567, או העברה בנקאית: בנק 12 סניף 345 חשבון 678901"
          className="min-h-[88px]"
          dir="rtl"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="form-label">חלון ביטול</label>
        <Select value={cancellationCutoffHours} onValueChange={setCancellationCutoffHours}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CANCELLATION_WINDOWS.map((h) => (
              <SelectItem key={h} value={h}>
                {h} שעות
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="ps-1 text-xs text-muted-foreground">ביטול בתוך פרק הזמן הזה מועבר לנציג.</p>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="form-label">קישור לביקורת Google</label>
        <input
          value={reviewLink}
          onChange={(e) => setReviewLink(e.target.value)}
          placeholder="https://g.page/r/…"
          dir="ltr"
          className="field-native text-start"
        />
      </div>

      <ClosuresSection />

      <div className="sticky bottom-0 z-10 -mx-4 mt-2 flex flex-col gap-2 border-t border-border/60 bg-background/95 px-4 py-3 backdrop-blur lg:static lg:mx-0 lg:border-0 lg:bg-transparent lg:px-0 lg:py-0">
        <button
          type="button"
          disabled={saveMutation.isPending}
          onClick={() => saveMutation.mutate()}
          className="btn-native"
        >
          <Save size={16} />
          {saveMutation.isPending ? 'שומר…' : 'שמור שינויים'}
        </button>
        {saved && <span className="text-center text-xs font-semibold text-emerald-500">נשמר בהצלחה ✓</span>}
      </div>
    </div>
  )
}

export default StudioPolicyTab
