import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Textarea } from '@/components/ui/textarea'
import { getAiSettings, saveAiInstructions } from '@/features/settings/server/settings'
import { SettingsRow, SettingsSection } from '@/features/settings/components/settings-layout'
import { useSettingsSave } from '@/features/settings/components/settings-save'

/** Rules the bot never breaks, saved with the page's save bar. */
export function AiIronRulesSection() {
  const queryClient = useQueryClient()
  const [instructions, setInstructions] = useState('')
  const { data: aiSettings } = useQuery({ queryKey: ['ai-settings'], queryFn: () => getAiSettings() })
  const saved = aiSettings?.systemInstructions || ''

  useEffect(() => {
    if (aiSettings) setInstructions(aiSettings.systemInstructions || '')
  }, [aiSettings])

  const save = useMutation({
    mutationFn: (text: string) => saveAiInstructions({ data: { instructions: text } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['ai-settings'] }),
  })

  useSettingsSave('ai-iron-rules', {
    dirty: Boolean(aiSettings) && instructions !== saved,
    save: () => save.mutateAsync(instructions),
    reset: () => setInstructions(saved),
  })

  return (
    <SettingsSection title="חוקי ברזל" description="כללים שהבוט פועל לפיהם בכל שיחה, בלי יוצא מן הכלל.">
      <SettingsRow label="הכללים" htmlFor="iron-rules" hint="כלל בכל שורה. הבוט לא יחרוג מהם גם אם הלקוח מבקש." stacked>
        <Textarea
          id="iron-rules"
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
          placeholder={'למשל:\n- לא קובעים קעקוע מתחת לגיל 18.\n- סקיצות מוצגות רק ביום התור, בסטודיו.'}
          className="min-h-32 text-sm leading-relaxed"
        />
      </SettingsRow>
    </SettingsSection>
  )
}
