import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { useConfirm } from '#/hooks/useConfirm'
import { resetConversations } from '@/features/conversations/server/debug'
import { resetStudio } from '@/features/database/server/reset-studio-data'
import { SettingsRow, SettingsSection } from '@/features/settings/components/settings-layout'
import { TimeSimulationRow } from './TimeSimulationRow'

/** Local development only: wipe conversations, or all customers, projects and appointments, for a clean test, and run the lifecycle engine ahead of time. */
export function DevToolsSection() {
  const queryClient = useQueryClient()
  const confirm = useConfirm()

  const reset = useMutation({
    mutationFn: () => resetConversations(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] })
      queryClient.invalidateQueries({ queryKey: ['messages'] })
      queryClient.invalidateQueries({ queryKey: ['unseen-messages-count'] })
    },
  })

  const resetData = useMutation({
    mutationFn: () => resetStudio(),
    // Every list on every screen is now stale.
    onSuccess: () => queryClient.invalidateQueries(),
  })

  if (!import.meta.env.DEV) return null

  const onReset = async () => {
    const ok = await confirm({
      title: 'איפוס כל השיחות וההודעות',
      description: 'כל השיחות וההודעות יימחקו לצמיתות. לקוחות ותורים נשארים.',
      confirmLabel: 'איפוס',
      variant: 'destructive',
    })
    if (ok) reset.mutate()
  }

  const onResetData = async () => {
    const ok = await confirm({
      title: 'ניקוי לקוחות, פרויקטים ופגישות',
      description:
        'כל הלקוחות, הפרויקטים, הפגישות, התשלומים והשיחות יימחקו לצמיתות. אירועים ביומן Google שסונכרנו מפגישות יימחקו גם הם. אי אפשר לשחזר.',
      confirmLabel: 'ניקוי הכול',
      variant: 'destructive',
    })
    if (ok) resetData.mutate()
  }

  const dataResult = resetData.data
  const dataHint = resetData.isError
    ? resetData.error.message
    : dataResult
      ? `נמחקו ${dataResult.deleted.customers} לקוחות, ${dataResult.deleted.projects} פרויקטים ו-${dataResult.deleted.appointments} פגישות${dataResult.failed > 0 ? `. ${dataResult.failed} מחיקות נכשלו: ${dataResult.firstError}` : '.'}`
      : 'לבדיקה מאפס. מוחק גם את הפרויקטים, התשלומים והשיחות של הלקוחות. הצוות וההגדרות נשארים.'

  return (
    <SettingsSection title="כלי פיתוח" description="מופיעים רק בסביבת פיתוח." tone="danger">
      <SettingsRow
        label="איפוס שיחות והודעות"
        hint={reset.isSuccess ? `נמחקו ${reset.data.deletedConversations} שיחות ו-${reset.data.deletedMessages} הודעות.` : 'לבדיקה נקייה של הבוט. לקוחות ותורים לא נמחקים.'}
      >
        <div className="flex justify-end">
          <Button type="button" variant="destructive" size="sm" disabled={reset.isPending} onClick={onReset}>
            {reset.isPending ? 'מאפס…' : 'איפוס'}
          </Button>
        </div>
      </SettingsRow>
      <SettingsRow label="ניקוי לקוחות, פרויקטים ופגישות" hint={dataHint}>
        <div className="flex justify-end">
          <Button type="button" variant="destructive" size="sm" disabled={resetData.isPending} onClick={onResetData}>
            {resetData.isPending ? 'מנקה…' : 'ניקוי'}
          </Button>
        </div>
      </SettingsRow>
      <TimeSimulationRow />
    </SettingsSection>
  )
}
