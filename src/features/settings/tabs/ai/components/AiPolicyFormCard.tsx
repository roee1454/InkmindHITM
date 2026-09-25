import React, { useEffect, useState } from 'react'
import { DEPOSIT_NOTICE_HOURS } from '@/lib/cancellation-policy'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ShieldCheck } from '@/components/ui/icon'
import { getStudioPolicySettings, saveStudioPolicySettings } from '@/features/settings/server/settings'
import type { StudioPolicySettings } from '@/features/settings/server/settings'
import { SectionSaveButton } from '@/features/settings/components/SectionSaveButton'
import { SettingsErrorBanner } from '@/features/settings/components/SettingsErrorBanner'
import { useSavedFlash } from '@/features/settings/hooks/useSavedFlash'

const CANCELLATION_WINDOWS = ['0', '12', '24', '48', '72'] as const

const HEALTH_VALIDITY_OPTIONS = [
  { value: '6', label: '6 חודשים (חצי שנה — ברירת מחדל)' },
  { value: '3', label: '3 חודשים (רבעון)' },
  { value: '12', label: '12 חודשים (שנה אחת)' },
  { value: '0', label: 'לכל תור בנפרד (תקף לתור הנוכחי בלבד)' },
  { value: '-1', label: 'ללא תפוגה (תקף לצמיתות)' },
] as const

export const AiPolicyFormCard: React.FC = () => {
  const queryClient = useQueryClient()
  const { saved, triggerSaved } = useSavedFlash()
  const [error, setError] = useState<string | null>(null)

  const { data: settings } = useQuery<StudioPolicySettings>({
    queryKey: ['studio-policy-settings'],
    queryFn: () => getStudioPolicySettings(),
  })

  const [paymentInstructions, setPaymentInstructions] = useState('')
  const [reviewLink, setReviewLink] = useState('')
  const [cancellationCutoffHours, setCancellationCutoffHours] = useState('48')
  const [healthDeclarationFormUrl, setHealthDeclarationFormUrl] = useState('')
  const [healthDeclarationValidityMonths, setHealthDeclarationValidityMonths] = useState('6')

  useEffect(() => {
    if (!settings) return
    setPaymentInstructions(settings.paymentInstructions ?? '')
    setReviewLink(settings.reviewLink ?? '')
    setCancellationCutoffHours(String(settings.cancellationCutoffHours ?? 48))
    setHealthDeclarationFormUrl(settings.healthDeclarationFormUrl ?? '')
    setHealthDeclarationValidityMonths(String(settings.healthDeclarationValidityMonths ?? 6))
  }, [settings])

  const saveMutation = useMutation({
    mutationFn: () =>
      saveStudioPolicySettings({
        data: {
          paymentInstructions,
          reviewLink,
          cancellationCutoffHours: Number(cancellationCutoffHours),
          healthDeclarationFormUrl,
          healthDeclarationValidityMonths: Number(healthDeclarationValidityMonths),
        },
      }),
    onSuccess: () => {
      setError(null)
      triggerSaved()
      queryClient.invalidateQueries({ queryKey: ['studio-policy-settings'] })
      queryClient.invalidateQueries({ queryKey: ['settings'] })
    },
    onError: (err: unknown) =>
      setError(err instanceof Error ? err.message : 'שגיאה בשמירת ההגדרות'),
  })

  const isDirty =
    paymentInstructions !== (settings?.paymentInstructions ?? '') ||
    reviewLink !== (settings?.reviewLink ?? '') ||
    cancellationCutoffHours !== String(settings?.cancellationCutoffHours ?? 48) ||
    healthDeclarationFormUrl !== (settings?.healthDeclarationFormUrl ?? '') ||
    healthDeclarationValidityMonths !== String(settings?.healthDeclarationValidityMonths ?? 6)

  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-xs flex flex-col gap-5 font-assistant" dir="rtl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border pb-3">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <ShieldCheck size={18} className="shrink-0 text-primary" />
          <div className="min-w-0">
            <h3 className="text-base font-bold text-foreground">תנאי תשלום, ביטולים והצהרת בריאות</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              הוראות ומדיניות מבצעית שמועברות אוטומטית לסוכן ה-AI בעדיפות עליונה
            </p>
          </div>
        </div>
        <span className="hidden sm:inline-flex shrink-0 items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-2xs font-bold text-primary">
          ✨ מסונכרן ישירות לסוכן
        </span>
      </div>

      <SettingsErrorBanner error={error} onDismiss={() => setError(null)} />

      {/* Payment Instructions */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold text-muted-foreground">הוראות תשלום מקדמה</label>
        <Textarea
          value={paymentInstructions}
          onChange={(e) => setPaymentInstructions(e.target.value)}
          placeholder="לדוגמה: ביט למספר 050-1234567, או העברה בנקאית: בנק 12 סניף 345 חשבון 678901"
          className="min-h-24 leading-relaxed"
          dir="rtl"
        />
        <p className="text-2xs text-muted-foreground">
          הסוכן יעביר הוראות אלו ללקוח כאשר מגיע שלב שריון התור ותשלום המקדמה.
        </p>
      </div>

      {/* Cancellation Window & Policy */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold text-muted-foreground">חלון ביטול תור עצמאי מול הסוכן</label>
        <Select value={cancellationCutoffHours} onValueChange={setCancellationCutoffHours}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent dir="rtl">
            {CANCELLATION_WINDOWS.map((h) => (
              <SelectItem key={h} value={h}>
                {h === '0' ? 'ללא הגבלה — ביטול חופשי (0 שעות)' : `עד ${h} שעות לפני התור`}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="rounded-xl border border-border/60 bg-muted/30 p-3 text-xs leading-relaxed text-muted-foreground flex flex-col gap-1 mt-1">
          <p>
            • <strong>ביטול עצמאי:</strong> לקוח יכול לבטל תור עצמאית מול הסוכן עד {cancellationCutoffHours} שעות לפני המועד.
          </p>
          <p>
            • <strong>החזר מקדמה:</strong> לפי המדיניות, ביטול פחות משבוע ({DEPOSIT_NOTICE_HOURS} שעות) מראש — המקדמה אינה מוחזרת; מעל שבוע — מוסדרת מול נציג. הסוכן לעולם לא קובע בעצמו החזר או חילוט: הוא מודיע ללקוח שנציג יחזור אליו, וההחלטה אצלכם.
          </p>
          <p>
            • <strong>התראה קצרה:</strong> ביטול בפחות מ-{cancellationCutoffHours} שעות מועבר אוטומטית להחלטת נציג אנושי (הסוכן אינו מבטל אוטומטית).
          </p>
        </div>
      </div>

      {/* Google Review Link */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold text-muted-foreground">קישור לביקורת Google</label>
        <Input
          value={reviewLink}
          onChange={(e) => setReviewLink(e.target.value)}
          placeholder="https://g.page/r/…"
          dir="ltr"
          className="text-left"
        />
        <p className="text-2xs text-muted-foreground">
          נשלח ללקוחות לאחר סיום מוצלח של הטיפול כדי לאסוף המלצות ודירוגים.
        </p>
      </div>

      {/* Health Declaration Form URL */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold text-muted-foreground">
          קישור לטופס הצהרת בריאות (Google Form / טופס מקוון)
        </label>
        <Input
          value={healthDeclarationFormUrl}
          onChange={(e) => setHealthDeclarationFormUrl(e.target.value)}
          placeholder="https://docs.google.com/forms/d/…"
          dir="ltr"
          className="text-left"
        />
        <p className="text-2xs text-muted-foreground">
          הקישור שנשלח אוטומטית ללקוחות על ידי הסוכן ובהצעות המחיר לפני אישור התור.
        </p>
      </div>

      {/* Health Declaration Validity */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold text-muted-foreground">
          תוקף הצהרת בריאות
        </label>
        <Select
          value={healthDeclarationValidityMonths}
          onValueChange={setHealthDeclarationValidityMonths}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent dir="rtl">
            {HEALTH_VALIDITY_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-2xs text-muted-foreground">
          לאחר תום פרק זמן זה, לקוח חוזר יתבקש למלא הצהרת בריאות חדשה לפני תיאום תור נוסף.
        </p>
      </div>

      <div className="pt-2 flex justify-start">
        <SectionSaveButton
          onClick={() => saveMutation.mutate()}
          isPending={saveMutation.isPending}
          saved={saved}
          disabled={!isDirty}
        />
      </div>
    </div>
  )
}

