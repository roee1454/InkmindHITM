import React, { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Tattoo } from '@/components/ui/icon'
import { SectionSaveButton } from '@/features/settings/components/SectionSaveButton'
import { SettingsErrorBanner } from '@/features/settings/components/SettingsErrorBanner'
import { useSavedFlash } from '@/features/settings/hooks/useSavedFlash'
import { useProjectPolicyForm } from '@/features/settings/hooks/useProjectPolicyForm'
import { DEFAULT_PROJECT_POLICY } from '@/lib/project-policy'
import { PolicyField, PolicyNumberInput, PolicySelect } from './PolicyFields'

const d = DEFAULT_PROJECT_POLICY

const TOUCH_UP_OPTIONS = [
  { value: 'free_within_days', label: 'חינם, בתוך מספר ימים מהסשן' },
  { value: 'charged', label: 'בתשלום' },
] as const
const DEPOSIT_APPLICATION_OPTIONS = [
  { value: 'first_session', label: 'בסשן הראשון (ברירת מחדל)' },
  { value: 'last_session', label: 'בסשן האחרון של הפרויקט' },
] as const
const DEPOSIT_PER_SESSION_OPTIONS = [
  { value: 'required', label: 'כן, מקדמה לכל סשן' },
  { value: 'not_required', label: 'לא, רק בסשן הראשון' },
] as const
const FEEDBACK_OPTIONS = [
  { value: 'review_links', label: 'קישורי ביקורת (ברירת מחדל)' },
  { value: 'nps_then_review', label: 'קודם שאלה 1–10, ואז ביקורת' },
] as const

function CardSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      {Array.from({ length: 5 }, (_, i) => (
        <Skeleton key={i} className="h-14 w-full rounded-xl" />
      ))}
    </div>
  )
}

/**
 * How the studio runs a project: touch-ups, deposits across sessions, healing and follow-up timing.
 * Several of these are the studio's decision; until then the system keeps today's behaviour.
 */
export const ProjectPolicyCard: React.FC = () => {
  const { saved, triggerSaved } = useSavedFlash()
  const [error, setError] = useState<string | null>(null)
  const { query, draft, setField, isDirty, save } = useProjectPolicyForm(() => {
    setError(null)
    triggerSaved()
  })

  function submit() {
    if (!draft) return
    save.mutate(draft, { onError: (err) => setError(err instanceof Error ? err.message : 'שגיאה בשמירת המדיניות') })
  }

  return (
    <div className="flex flex-col gap-5 rounded-2xl border border-border bg-card p-6 font-assistant shadow-xs" dir="rtl">
      <div className="flex items-center gap-2 border-b border-border pb-3">
        <Tattoo size={18} className="shrink-0 text-primary" />
        <div className="min-w-0">
          <h3 className="text-base font-bold text-foreground">מדיניות פרויקטים</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            טאץ׳-אפ, מקדמות בעבודה רב-מפגשית ותזמון הודעות. שדה ריק שומר על ההתנהגות הנוכחית.
          </p>
        </div>
      </div>

      <SettingsErrorBanner error={error ?? (query.isError ? 'טעינת המדיניות נכשלה. רענן/י את הדף.' : null)} onDismiss={() => setError(null)} />

      {!draft ? (
        <CardSkeleton />
      ) : (
        <>
          <PolicyField label="טאץ׳-אפ" hint="עד שתוחלט מדיניות, כל בקשת טאץ׳-אפ עוברת לצוות." undecided={draft.touchUpPolicy === ''}>
            <PolicySelect value={draft.touchUpPolicy} onChange={(v) => setField('touchUpPolicy', v)} options={TOUCH_UP_OPTIONS} undecidedLabel="טרם הוחלט" />
            {draft.touchUpPolicy === 'free_within_days' && (
              <PolicyNumberInput value={draft.touchUpFreeDays} onChange={(v) => setField('touchUpFreeDays', v)} placeholder="30" unit="ימים מהסשן" />
            )}
          </PolicyField>

          <PolicyField label="קיזוז המקדמה בפרויקט רב-מפגשי" hint="קובע מה מוצע לגבייה בסגירת סשן." undecided={draft.depositApplication === ''}>
            <PolicySelect value={draft.depositApplication} onChange={(v) => setField('depositApplication', v)} options={DEPOSIT_APPLICATION_OPTIONS} undecidedLabel="טרם הוחלט (בסשן הראשון)" />
          </PolicyField>

          <PolicyField label="מקדמה לכל סשן" hint="האם הבוט מבקש מקדמה חדשה כשקובעים את הסשן הבא." undecided={draft.depositPerSession === ''}>
            <PolicySelect value={draft.depositPerSession} onChange={(v) => setField('depositPerSession', v)} options={DEPOSIT_PER_SESSION_OPTIONS} undecidedLabel="טרם הוחלט (מקדמה לכל סשן)" />
          </PolicyField>

          <div className="grid gap-5 sm:grid-cols-2">
            <PolicyField label="זמן החלמה בין סשנים" hint="מתי הבוט מציע לקבוע את הסשן הבא.">
              <PolicyNumberInput value={draft.healingPeriodDays} onChange={(v) => setField('healingPeriodDays', v)} placeholder={String(d.healingPeriodDays)} unit="ימים" />
            </PolicyField>
            <PolicyField label="מעקב אחרי פגישת ייעוץ" hint="אחרי כמה ימים לשאול אם לקבוע את הקעקוע.">
              <PolicyNumberInput value={draft.consultationFollowupDays} onChange={(v) => setField('consultationFollowupDays', v)} placeholder={String(d.consultationFollowupDays)} unit="ימים" />
            </PolicyField>
            <PolicyField label="ייעוץ בלי המשך נחשב אבוד" hint="פרויקט שלא נקבע לו סשן אחרי הייעוץ.">
              <PolicyNumberInput value={draft.consultationLostAfterDays} onChange={(v) => setField('consultationLostAfterDays', v)} placeholder={String(d.consultationLostAfterDays)} unit="ימים" />
            </PolicyField>
            <PolicyField label="פנייה בלי מענה נחשבת אבודה" hint="ליד או הצעת מחיר בלי פעילות.">
              <PolicyNumberInput value={draft.inquiryLostAfterDays} onChange={(v) => setField('inquiryLostAfterDays', v)} placeholder={String(d.inquiryLostAfterDays)} unit="ימים" />
            </PolicyField>
            <PolicyField label="לקוח רדום" hint="לקוח שלא היה בסשן תקופה זו.">
              <PolicyNumberInput value={draft.dormantAfterMonths} onChange={(v) => setField('dormantAfterMonths', v)} placeholder={String(d.dormantAfterMonths)} unit="חודשים" />
            </PolicyField>
          </div>

          <PolicyField label="משוב בסוף פרויקט" hint="נשלח פעם אחת, כשהפרויקט מסתיים.">
            <PolicySelect value={draft.postProjectFeedback || 'review_links'} onChange={(v) => setField('postProjectFeedback', v)} options={FEEDBACK_OPTIONS} />
          </PolicyField>

          <PolicyField label="קישור לביקורת ב-Easy" hint="נשלח יחד עם קישור הביקורת בגוגל.">
            <Input value={draft.easyReviewLink} onChange={(e) => setField('easyReviewLink', e.target.value)} placeholder="https://easy.co.il/page/…" dir="ltr" className="text-left" />
          </PolicyField>

          <div className="flex justify-start pt-2">
            <SectionSaveButton onClick={submit} isPending={save.isPending} saved={saved} disabled={!isDirty} />
          </div>
        </>
      )}
    </div>
  )
}
