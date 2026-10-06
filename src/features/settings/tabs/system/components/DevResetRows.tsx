import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { useConfirm } from '#/hooks/useConfirm'
import { resetAppData } from '@/features/database/server/reset-data'
import type { ResetDataResult, ResetScope } from '@/features/database/server/reset-data.server'
import { SettingsRow } from '@/features/settings/components/settings-layout'

interface ResetOption {
  scope: ResetScope
  label: string
  idleHint: string
  buttonLabel: string
  title: string
  description: string
  /** Asked again after the first confirmation: the reset that removes the caller's own account. */
  finalWarning?: string
}

const GOOGLE_NOTE = 'אירועים ביומן Google שסונכרנו מפגישות יימחקו גם הם.'

const OPTIONS: ResetOption[] = [
  {
    scope: 'work',
    label: 'ניקוי לקוחות, פרויקטים ופגישות',
    idleHint: 'לבדיקה מאפס. מוחק גם את הפרויקטים, התשלומים והשיחות של הלקוחות. הצוות וההגדרות נשארים.',
    buttonLabel: 'ניקוי',
    title: 'ניקוי לקוחות, פרויקטים ופגישות',
    description: `כל הלקוחות, הפרויקטים, הפגישות, התשלומים והשיחות יימחקו לצמיתות. ${GOOGLE_NOTE} אי אפשר לשחזר.`,
  },
  {
    scope: 'business',
    label: 'איפוס כל נתוני העבודה',
    idleHint: 'מוחק גם התראות, רשימות המתנה, יומני מעברי מצב ומחיקות, והיסטוריית העוזר. הצוות, ההגדרות, חיבורי Google, שעות העבודה, ימי הסגירה והשאלות הנפוצות נשארים.',
    buttonLabel: 'איפוס',
    title: 'איפוס כל נתוני העבודה',
    description: `כל הפעילות של הסטודיו תימחק לצמיתות: לקוחות, פרויקטים, פגישות, תשלומים, שיחות, התראות, רשימות המתנה והיסטוריית העוזר. ${GOOGLE_NOTE} הצוות וההגדרות נשארים. אי אפשר לשחזר.`,
  },
  {
    scope: 'everything',
    label: 'איפוס מלא של האפליקציה',
    idleHint: 'מרוקן את כל מסד הנתונים: כל הרשומות בכל הטבלאות, כולל אנשי הצוות, ההגדרות, חיבורי Google והחשבון שלך. המבנה של הטבלאות נשאר. אחרי זה תצטרכו להגדיר את הסטודיו מחדש.',
    buttonLabel: 'איפוס מלא',
    title: 'איפוס מלא של האפליקציה',
    description: `כל הרשומות בכל הטבלאות של מסד הנתונים יימחקו לצמיתות, כולל אנשי הצוות, ההגדרות, חיבורי Google וקבצים שהועלו. ${GOOGLE_NOTE} מבנה הטבלאות (המיגרציות) נשאר, וכך גם משתמשי העל של PocketBase שהשרת מתחבר איתם. אי אפשר לשחזר.`,
    finalWarning: 'זה מוחק גם את החשבון שלך. תנותקו מיד, ותצטרכו להגדיר את הסטודיו מחדש מההתחלה. להמשיך?',
  },
]

function resultHint({ total, failed, firstError, remaining }: ResetDataResult): string {
  const left = Object.entries(remaining)
  if (failed === 0 && left.length === 0) return `נמחקו ${total} רשומות. לא נשאר דבר.`
  return `נמחקו ${total} רשומות. נשארו ${left.map(([name, count]) => `${count} ב-${name}`).join(', ')}. ${failed} מחיקות נכשלו: ${firstError}`
}

function DevResetRow({ option }: { option: ResetOption }) {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const confirm = useConfirm()

  const reset = useMutation({
    mutationFn: () => resetAppData({ data: { scope: option.scope } }),
    onSuccess: () => {
      // Every list on every screen is now stale.
      void queryClient.invalidateQueries()
      // Without staff there is no session left: go where a fresh install starts.
      if (option.scope === 'everything') void navigate({ to: '/' })
    },
  })

  const onClick = async () => {
    const ok = await confirm({ title: option.title, description: option.description, confirmLabel: option.buttonLabel, variant: 'destructive' })
    if (!ok) return
    if (option.finalWarning) {
      const sure = await confirm({ title: 'בטוחים?', description: option.finalWarning, confirmLabel: 'כן, למחוק הכול', cancelLabel: 'ביטול', variant: 'destructive' })
      if (!sure) return
    }
    reset.mutate()
  }

  const hint = reset.isError ? reset.error.message : reset.data ? resultHint(reset.data) : option.idleHint

  return (
    <SettingsRow label={option.label} hint={hint}>
      <div className="flex justify-end">
        <Button type="button" variant="destructive" size="sm" disabled={reset.isPending} onClick={onClick}>
          {reset.isPending ? 'מוחק…' : option.buttonLabel}
        </Button>
      </div>
    </SettingsRow>
  )
}

export function DevResetRows() {
  return (
    <>
      {OPTIONS.map((option) => (
        <DevResetRow key={option.scope} option={option} />
      ))}
    </>
  )
}
