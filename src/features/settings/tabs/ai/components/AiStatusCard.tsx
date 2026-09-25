import React from 'react'
import { Bot } from '@/components/ui/icon'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getAiSettings, toggleAiEnabled } from '@/features/settings/server/settings'
import { useConfirm } from '#/hooks/useConfirm'

export const AiStatusCard: React.FC = () => {
  const queryClient = useQueryClient()
  const confirm = useConfirm()

  const { data: settings } = useQuery({
    queryKey: ['ai-settings'],
    queryFn: () => getAiSettings(),
  })

  const toggleAiMutation = useMutation({
    mutationFn: (enabled: boolean) => toggleAiEnabled({ data: { enabled } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-settings'] })
    },
  })

  const handleToggleAi = async () => {
    if (!settings) return
    const nextEnabled = !settings.aiEnabled
    const ok = await confirm({
      title: nextEnabled ? 'הפעלת הסוכן' : 'כיבוי הסוכן',
      description: nextEnabled
        ? 'הסוכן יחזור לענות אוטומטית בכל השיחות הפעילות.'
        : 'כל התשובות האוטומטיות בכל השיחות יופסקו מיידית. הודעות מלקוחות ימשיכו להתקבל, אך הסוכן לא יענה עד שתפעיל אותו מחדש.',
      confirmLabel: nextEnabled ? 'הפעל' : 'כבה',
      variant: nextEnabled ? 'default' : 'destructive',
    })
    if (ok) toggleAiMutation.mutate(nextEnabled)
  }

  const isEnabled = settings?.aiEnabled ?? false

  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 font-assistant" dir="rtl">
      <div className="flex items-center gap-3.5 min-w-0 flex-1">
        <div
          className={`flex size-11 shrink-0 items-center justify-center rounded-xl transition-colors ${
            isEnabled ? 'bg-emerald-500/15 text-emerald-400' : 'bg-muted text-muted-foreground'
          }`}
        >
          <Bot size={22} />
        </div>
        <div className="flex min-w-0 flex-col">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-foreground">סוכן ה-AI</h3>
            <span
              className={`rounded-md px-2 py-0.5 text-2xs font-bold ${
                isEnabled ? 'bg-emerald-500/15 text-emerald-400' : 'bg-muted text-muted-foreground'
              }`}
            >
              {isEnabled ? 'פעיל' : 'כבוי'}
            </span>
          </div>
          <span className="text-xs text-muted-foreground mt-0.5">
            {isEnabled ? 'עונה ומנהל שיחות באופן אוטומטי' : 'מושבת — שיחות מנוהלות ידנית בלבד'}
          </span>
        </div>
      </div>

      <button
        type="button"
        role="switch"
        aria-checked={isEnabled}
        disabled={toggleAiMutation.isPending}
        onClick={handleToggleAi}
        className={`peer inline-flex h-[32px] w-[54px] shrink-0 cursor-pointer items-center rounded-full border-0 p-[3px] transition-colors duration-150 ease-native disabled:cursor-not-allowed disabled:opacity-50 ${
          isEnabled ? 'bg-primary' : 'bg-muted'
        }`}
      >
        <span
          className={`block size-6 rounded-full bg-white shadow-sm transition-transform duration-150 ease-native ${
            isEnabled ? 'ms-auto' : ''
          }`}
        />
      </button>
    </div>
  )
}

