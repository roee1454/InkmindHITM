import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { useConfirm } from '#/hooks/useConfirm'
import { resetConversations } from '@/features/conversations/server/debug'
import { SettingsRow, SettingsSection } from '@/features/settings/components/settings-layout'
import { TimeSimulationRow } from './TimeSimulationRow'
import { DevResetRows } from './DevResetRows'

/** Local development only: wipe conversations, or work data, or everything, for a clean test, and run the lifecycle engine ahead of time. */
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
      <DevResetRows />
      <TimeSimulationRow />
    </SettingsSection>
  )
}
