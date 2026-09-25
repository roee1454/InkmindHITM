import React, { useEffect, useState } from 'react'
import { ShieldAlert } from '@/components/ui/icon'
import { Textarea } from '@/components/ui/textarea'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getAiSettings, saveAiInstructions } from '@/features/settings/server/settings'
import { SectionSaveButton } from '@/features/settings/components/SectionSaveButton'
import { SettingsErrorBanner } from '@/features/settings/components/SettingsErrorBanner'
import { useSavedFlash } from '@/features/settings/hooks/useSavedFlash'

export const AiIronRulesCard: React.FC = () => {
  const queryClient = useQueryClient()
  const { saved, triggerSaved } = useSavedFlash()
  const [instructions, setInstructions] = useState('')
  const [error, setError] = useState<string | null>(null)

  const { data: aiSettings } = useQuery({
    queryKey: ['ai-settings'],
    queryFn: () => getAiSettings(),
  })

  useEffect(() => {
    if (aiSettings) {
      setInstructions(aiSettings.systemInstructions || '')
    }
  }, [aiSettings])

  const saveMutation = useMutation({
    mutationFn: (text: string) => saveAiInstructions({ data: { instructions: text } }),
    onSuccess: () => {
      setError(null)
      triggerSaved()
      queryClient.invalidateQueries({ queryKey: ['ai-settings'] })
    },
    onError: (err: unknown) => {
      setError(err instanceof Error ? err.message : 'שגיאה בשמירת חוקי הברזל')
    },
  })

  const isDirty = instructions !== (aiSettings?.systemInstructions || '')

  return (
    <div id="iron-rules" className="rounded-2xl border border-border bg-card p-6 shadow-xs flex flex-col gap-4 font-assistant" dir="rtl">
      <div className="flex items-center gap-2 border-b border-border pb-3">
        <ShieldAlert size={18} className="text-primary" />
        <div>
          <h3 className="text-base font-bold text-foreground">חוקי ברזל לסוכן ה-AI</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            הנחיות קבועות ומחייבות שהסוכן תמיד פועל לפיהן ומעולם לא חורג מהן (לדוגמה: הגבלת גיל, מדיניות סקיצות).
          </p>
        </div>
      </div>

      <SettingsErrorBanner error={error} onDismiss={() => setError(null)} />

      <div className="flex flex-col gap-1.5">
        <Textarea
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
          placeholder="רשום כאן כללים מחייבים, למשל:
- אין לתאם קעקועים מתחת לגיל 18 בשום מקרה.
- סקיצות מוצגות רק ביום התור בסטודיו."
          className="min-h-32 text-sm leading-relaxed"
          dir="rtl"
        />
      </div>

      <div className="pt-2 flex justify-start">
        <SectionSaveButton
          onClick={() => saveMutation.mutate(instructions)}
          isPending={saveMutation.isPending}
          saved={saved}
          disabled={!isDirty}
        />
      </div>
    </div>
  )
}

