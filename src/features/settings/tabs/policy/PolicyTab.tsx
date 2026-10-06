import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import { DEPOSIT_NOTICE_HOURS } from '@/lib/cancellation-policy'
import { DEFAULT_PROJECT_POLICY } from '@/lib/project-policy'
import { SettingsPage, SettingsRow, SettingsSection } from '@/features/settings/components/settings-layout'
import { useSettingsSave } from '@/features/settings/components/settings-save'
import { useStudioPolicyForm } from '@/features/settings/hooks/useStudioPolicyForm'
import { useProjectPolicyForm } from '@/features/settings/hooks/useProjectPolicyForm'
import { PolicyNumberInput, PolicySelect, UndecidedBadge } from './PolicyFields'

const d = DEFAULT_PROJECT_POLICY

const CANCELLATION_OPTIONS = [
  { value: '0', label: 'בכל זמן' },
  ...['12', '24', '48', '72'].map((h) => ({ value: h, label: `עד ${h} שעות לפני` })),
]
const HEALTH_VALIDITY_OPTIONS = [
  { value: '3', label: '3 חודשים' },
  { value: '6', label: '6 חודשים' },
  { value: '12', label: 'שנה' },
  { value: '0', label: 'לכל תור מחדש' },
  { value: '-1', label: 'ללא תפוגה' },
]
const TOUCH_UP_OPTIONS = [
  { value: 'free_within_days', label: 'חינם, בתוך מספר ימים' },
  { value: 'charged', label: 'בתשלום' },
]
const DEPOSIT_APPLICATION_OPTIONS = [
  { value: 'first_session', label: 'בסשן הראשון' },
  { value: 'last_session', label: 'בסשן האחרון' },
]
const DEPOSIT_PER_SESSION_OPTIONS = [
  { value: 'required', label: 'מקדמה לכל סשן' },
  { value: 'not_required', label: 'רק בסשן הראשון' },
]
const FEEDBACK_OPTIONS = [
  { value: 'review_links', label: 'קישורי ביקורת' },
  { value: 'nps_then_review', label: 'שאלה 1–10, ואז ביקורת' },
]

function SectionSkeleton({ rows }: { rows: number }) {
  return (
    <div className="card-native flex flex-col gap-3 p-4">
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} className="h-10 w-full" />
      ))}
    </div>
  )
}

/** The studio's rules, as the bot quotes them and the system applies them. */
function PolicySettings() {
  const studio = useStudioPolicyForm()
  const project = useProjectPolicyForm()
  useSettingsSave('policy-studio', { dirty: studio.isDirty, save: () => studio.save.mutateAsync(studio.draft!), reset: studio.reset })
  useSettingsSave('policy-project', { dirty: project.isDirty, save: () => project.save.mutateAsync(project.draft!), reset: project.reset })

  const s = studio.draft
  const p = project.draft
  const cutoff = s?.cancellationCutoffHours ?? '48'

  return (
    <>
      {!s ? (
        <SectionSkeleton rows={3} />
      ) : (
        <SettingsSection title="תשלום וביטולים" description="הבוט שולח את ההוראות ללקוח כשמגיע שלב המקדמה.">
          <SettingsRow label="הוראות תשלום מקדמה" htmlFor="payment-instructions" hint="איך משלמים ולאן. הבוט מעתיק את זה כמו שהוא." stacked>
            <Textarea
              id="payment-instructions"
              value={s.paymentInstructions}
              onChange={(e) => studio.setField('paymentInstructions', e.target.value)}
              placeholder="למשל: ביט ל-050-1234567, או העברה לבנק 12, סניף 345, חשבון 678901"
              className="min-h-24 leading-relaxed"
            />
          </SettingsRow>
          <SettingsRow
            label="ביטול מול הבוט"
            hint={`${cutoff === '0' ? 'הלקוח יכול לבטל מול הבוט בכל זמן.' : `עד ${cutoff} שעות לפני התור הלקוח מבטל מול הבוט; מאוחר יותר הביטול עובר לצוות.`} מקדמה לא מוחזרת בביטול של פחות מ-${DEPOSIT_NOTICE_HOURS / 24} ימים מראש, ועל כל החזר מחליט הצוות — לא הבוט.`}
          >
            <PolicySelect value={cutoff} onChange={(v) => studio.setField('cancellationCutoffHours', v)} options={CANCELLATION_OPTIONS} />
          </SettingsRow>
        </SettingsSection>
      )}

      {s && (
        <SettingsSection title="הצהרת בריאות" description="נשלחת ללקוח לפני אישור התור.">
          <SettingsRow label="קישור לטופס" htmlFor="health-form-url" hint="Google Forms או כל טופס מקוון.">
            <Input
              id="health-form-url"
              value={s.healthDeclarationFormUrl}
              onChange={(e) => studio.setField('healthDeclarationFormUrl', e.target.value)}
              placeholder="https://docs.google.com/forms/…"
              dir="ltr"
            />
          </SettingsRow>
          <SettingsRow label="תוקף" hint="אחרי זה לקוח חוזר ממלא הצהרה חדשה.">
            <PolicySelect value={s.healthDeclarationValidityMonths} onChange={(v) => studio.setField('healthDeclarationValidityMonths', v)} options={HEALTH_VALIDITY_OPTIONS} />
          </SettingsRow>
        </SettingsSection>
      )}

      {!p ? (
        <SectionSkeleton rows={5} />
      ) : (
        <SettingsSection title="פרויקטים" description="עבודה של כמה מפגשים: מקדמות, טאץ׳-אפ ותזמון. שדה ריק שומר על ההתנהגות הנוכחית.">
          <SettingsRow label="טאץ׳-אפ" hint="עד שתוחלט מדיניות, כל בקשת טאץ׳-אפ עוברת לצוות." badge={p.touchUpPolicy === '' && <UndecidedBadge />}>
            <div className="flex flex-col gap-2">
              <PolicySelect value={p.touchUpPolicy} onChange={(v) => project.setField('touchUpPolicy', v)} options={TOUCH_UP_OPTIONS} undecidedLabel="טרם הוחלט" />
              {p.touchUpPolicy === 'free_within_days' && (
                <PolicyNumberInput value={p.touchUpFreeDays} onChange={(v) => project.setField('touchUpFreeDays', v)} placeholder="30" unit="ימים מהסשן" />
              )}
            </div>
          </SettingsRow>
          <SettingsRow label="קיזוז המקדמה" hint="מה מוצע לגבייה בסגירת סשן." badge={p.depositApplication === '' && <UndecidedBadge />}>
            <PolicySelect value={p.depositApplication} onChange={(v) => project.setField('depositApplication', v)} options={DEPOSIT_APPLICATION_OPTIONS} undecidedLabel="טרם הוחלט (בסשן הראשון)" />
          </SettingsRow>
          <SettingsRow label="מקדמה לכל סשן" hint="האם הבוט מבקש מקדמה חדשה כשקובעים את הסשן הבא." badge={p.depositPerSession === '' && <UndecidedBadge />}>
            <PolicySelect value={p.depositPerSession} onChange={(v) => project.setField('depositPerSession', v)} options={DEPOSIT_PER_SESSION_OPTIONS} undecidedLabel="טרם הוחלט (לכל סשן)" />
          </SettingsRow>
          <SettingsRow label="החלמה בין סשנים" hint="מתי הבוט מציע לקבוע את הסשן הבא.">
            <PolicyNumberInput value={p.healingPeriodDays} onChange={(v) => project.setField('healingPeriodDays', v)} placeholder={String(d.healingPeriodDays)} unit="ימים" />
          </SettingsRow>
          <SettingsRow label="מעקב אחרי ייעוץ" hint="אחרי כמה ימים לשאול אם לקבוע את הקעקוע.">
            <PolicyNumberInput value={p.consultationFollowupDays} onChange={(v) => project.setField('consultationFollowupDays', v)} placeholder={String(d.consultationFollowupDays)} unit="ימים" />
          </SettingsRow>
          <SettingsRow label="ייעוץ בלי המשך נחשב אבוד" hint="כשלא נקבע סשן אחרי הייעוץ.">
            <PolicyNumberInput value={p.consultationLostAfterDays} onChange={(v) => project.setField('consultationLostAfterDays', v)} placeholder={String(d.consultationLostAfterDays)} unit="ימים" />
          </SettingsRow>
          <SettingsRow label="פנייה בלי מענה נחשבת אבודה" hint="ליד או הצעת מחיר בלי פעילות.">
            <PolicyNumberInput value={p.inquiryLostAfterDays} onChange={(v) => project.setField('inquiryLostAfterDays', v)} placeholder={String(d.inquiryLostAfterDays)} unit="ימים" />
          </SettingsRow>
          <SettingsRow label="לקוח רדום" hint="לקוח שלא היה בסשן תקופה זו.">
            <PolicyNumberInput value={p.dormantAfterMonths} onChange={(v) => project.setField('dormantAfterMonths', v)} placeholder={String(d.dormantAfterMonths)} unit="חודשים" />
          </SettingsRow>
        </SettingsSection>
      )}

      {s && p && (
        <SettingsSection title="ביקורות ומשוב" description="נשלחים פעם אחת, כשהפרויקט מסתיים.">
          <SettingsRow label="משוב בסוף פרויקט">
            <PolicySelect value={p.postProjectFeedback || 'review_links'} onChange={(v) => project.setField('postProjectFeedback', v)} options={FEEDBACK_OPTIONS} />
          </SettingsRow>
          <SettingsRow label="ביקורת ב-Google" htmlFor="google-review">
            <Input id="google-review" value={s.reviewLink} onChange={(e) => studio.setField('reviewLink', e.target.value)} placeholder="https://g.page/r/…" dir="ltr" />
          </SettingsRow>
          <SettingsRow label="ביקורת ב-Easy" htmlFor="easy-review">
            <Input id="easy-review" value={p.easyReviewLink} onChange={(e) => project.setField('easyReviewLink', e.target.value)} placeholder="https://easy.co.il/page/…" dir="ltr" />
          </SettingsRow>
        </SettingsSection>
      )}

      {(studio.query.isError || project.query.isError) && <p className="px-1 text-sm font-bold text-destructive">טעינת המדיניות נכשלה. רעננו את הדף.</p>}
    </>
  )
}

export function PolicyTab() {
  return (
    <SettingsPage title="מדיניות" description="תשלומים, ביטולים, הצהרת בריאות ופרויקטים — הכללים שהבוט מצטט והמערכת מפעילה.">
      <PolicySettings />
    </SettingsPage>
  )
}
