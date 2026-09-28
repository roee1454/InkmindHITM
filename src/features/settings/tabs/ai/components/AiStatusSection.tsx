import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Switch } from '@/components/ui/switch'
import { getAiSettings, toggleAiEnabled } from '@/features/settings/server/settings'
import { useConfirm } from '#/hooks/useConfirm'
import { SettingsRow, SettingsSection } from '@/features/settings/components/settings-layout'

/** The bot's master switch. Applies at once — and asks first, because it reaches every conversation. */
export function AiStatusSection() {
  const queryClient = useQueryClient()
  const confirm = useConfirm()
  const { data: settings } = useQuery({ queryKey: ['ai-settings'], queryFn: () => getAiSettings() })

  const toggle = useMutation({
    mutationFn: (enabled: boolean) => toggleAiEnabled({ data: { enabled } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['ai-settings'] }),
  })

  const enabled = settings?.aiEnabled ?? false

  const onChange = async (next: boolean) => {
    const ok = await confirm({
      title: next ? 'להפעיל את הבוט?' : 'לכבות את הבוט?',
      description: next
        ? 'הבוט יחזור לענות לבד בכל השיחות הפעילות.'
        : 'הבוט יפסיק לענות בכל השיחות מיד. ההודעות ימשיכו להגיע, והצוות יענה ידנית עד שתפעילו אותו שוב.',
      confirmLabel: next ? 'הפעלה' : 'כיבוי',
      variant: next ? 'default' : 'destructive',
    })
    if (ok) toggle.mutate(next)
  }

  return (
    <SettingsSection title="מצב">
      <SettingsRow
        label="הבוט עונה ללקוחות"
        hint={enabled ? 'עונה, מציע מועדים ושולח הצעות מחיר לבד. שיחה שצריכה החלטה עוברת לצוות.' : 'כבוי: כל השיחות מנוהלות ידנית.'}
      >
        <div className="flex items-center justify-end gap-3">
          <span className={enabled ? 'text-sm font-bold text-status-done' : 'text-sm font-bold text-muted-foreground'}>{enabled ? 'פעיל' : 'כבוי'}</span>
          <Switch checked={enabled} disabled={!settings || toggle.isPending} onCheckedChange={onChange} aria-label="הבוט עונה ללקוחות" />
        </div>
      </SettingsRow>
    </SettingsSection>
  )
}
