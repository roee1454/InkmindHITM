import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Switch } from '@/components/ui/switch'
import { Loader2 } from '@/components/ui/icon'
import { getAiSettings, toggleAiEnabled } from '@/features/settings/server/ai'
import type { AiSettings } from '@/features/settings/server/ai'
import { useConfirm } from '#/hooks/useConfirm'
import { useToast } from '@/components/ui/ToastProvider'
import { SettingsRow, SettingsSection } from '@/features/settings/components/settings-layout'

/** The bot's master switch. Applies at once — asks before turning off to prevent accidental interruption. */
export function AiStatusSection() {
  const queryClient = useQueryClient()
  const confirm = useConfirm()
  const { toast } = useToast()
  const [localChecked, setLocalChecked] = useState<boolean | null>(null)

  const { data: settings } = useQuery<AiSettings>({
    queryKey: ['ai-settings'],
    queryFn: () => getAiSettings(),
    refetchInterval: 60000,
  })

  const toggle = useMutation({
    mutationFn: (enabled: boolean) => toggleAiEnabled({ data: { enabled } }),
    onMutate: async (nextEnabled) => {
      setLocalChecked(nextEnabled)
      await queryClient.cancelQueries({ queryKey: ['ai-settings'] })
      const prev = queryClient.getQueryData<AiSettings>(['ai-settings'])
      if (prev) {
        queryClient.setQueryData<AiSettings>(['ai-settings'], {
          ...prev,
          aiEnabled: nextEnabled,
        })
      }
      return { prev }
    },
    onError: (err, _next, context) => {
      setLocalChecked(null)
      if (context?.prev) {
        queryClient.setQueryData(['ai-settings'], context.prev)
      }
      toast('שגיאה בשינוי מצב הבוט', err instanceof Error ? err.message : 'לא ניתן היה לעדכן את הגדרות הבוט.', 'error')
    },
    onSuccess: (result, nextEnabled) => {
      const finalState = result?.enabled ?? nextEnabled
      setLocalChecked(finalState)
      queryClient.setQueryData<AiSettings>(['ai-settings'], (old) =>
        old ? { ...old, aiEnabled: finalState } : old,
      )
      toast(
        finalState ? 'סוכן ה-AI הופעל' : 'סוכן ה-AI הושבת',
        finalState
          ? 'הבוט יחזור לענות לבד בכל השיחות הפעילות.'
          : 'הבוט הפסיק לענות. ההודעות ימשיכו להגיע והמענה עבר לצוות.',
        'success',
      )
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-settings'] })
    },
  })

  const enabled = localChecked !== null ? localChecked : (settings?.aiEnabled ?? false)

  const onChange = async (next: boolean) => {
    if (!next) {
      const ok = await confirm({
        title: 'לכבות את הבוט?',
        description: 'הבוט יפסיק לענות בכל השיחות מיד. ההודעות ימשיכו להגיע, והצוות יענה ידנית עד שתפעילו אותו שוב.',
        confirmLabel: 'כיבוי',
        variant: 'destructive',
      })
      if (!ok) return
    }
    toggle.mutate(next)
  }

  return (
    <SettingsSection title="מצב">
      <SettingsRow
        label="הבוט עונה ללקוחות"
        hint={enabled ? 'עונה, מציע מועדים ושולח הצעות מחיר לבד. שיחה שצריכה החלטה עוברת לצוות.' : 'כבוי: כל השיחות מנוהלות ידנית.'}
      >
        <div className="flex items-center justify-end gap-3">
          {toggle.isPending && (
            <Loader2 className="size-4 animate-spin text-muted-foreground" aria-hidden="true" />
          )}
          <span className={enabled ? 'text-sm font-bold text-status-done' : 'text-sm font-bold text-muted-foreground'}>
            {enabled ? 'פעיל' : 'כבוי'}
          </span>
          <Switch
            checked={enabled}
            disabled={!settings || toggle.isPending}
            onCheckedChange={onChange}
            aria-label="הבוט עונה ללקוחות"
          />
        </div>
      </SettingsRow>
    </SettingsSection>
  )
}
