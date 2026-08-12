import React, { useEffect } from 'react'
import { Bot, Save, Trash2 } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getAiSettings, toggleAiEnabled, saveAiConfig } from '../server/settings'
import type { AiSettings } from '../server/settings'
import { resetConversations } from '@/features/conversations/server/debug'
import { ModelSearchSelect } from './ModelSearchSelect'
import { SettingsTabSkeleton } from './SettingsTabSkeleton'
import { useSettingsUiStore } from '../store/settingsUiStore'
import { useConfirm } from '@/hooks/use-confirm'

function parseMaxTokens(raw: string): number | null {
  const trimmed = raw.trim()
  if (trimmed === '') return null
  const parsed = parseInt(trimmed, 10)
  return Number.isInteger(parsed) && parsed >= 1 ? parsed : null
}

export const AiAgentTab: React.FC = () => {
  const queryClient = useQueryClient()
  const confirm = useConfirm()
  const {
    aiModel: model,
    aiMaxTokens: maxTokens,
    aiConfigSaved: configSaved,
    aiError: error,
    setAiModel: setModel,
    setAiMaxTokens: setMaxTokens,
    setAiConfigSaved: setConfigSaved,
    setAiError: setError,
  } = useSettingsUiStore()

  const { data: settings, isLoading: loadingSettings } = useQuery<AiSettings>({
    queryKey: ['ai-settings'],
    queryFn: () => getAiSettings(),
  })

  useEffect(() => {
    if (!settings) return
    setModel(settings.aiConfig.model || 'claude-sonnet-5')
    setMaxTokens(settings.aiConfig.maxTokens === null ? '' : String(settings.aiConfig.maxTokens))
  }, [settings])

  const toggleAiMutation = useMutation({
    mutationFn: (enabled: boolean) => toggleAiEnabled({ data: { enabled } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-settings'] })
    },
    onError: (err: unknown) => {
      setError(err instanceof Error ? err.message : 'שגיאה בשינוי מצב הבוט')
    },
  })

  const saveConfigMutation = useMutation({
    mutationFn: (body: { model: string; temperature: number; maxTokens: number | null }) =>
      saveAiConfig({ data: body }),
    onSuccess: () => {
      setError(null)
      setConfigSaved(true)
      setTimeout(() => setConfigSaved(false), 2000)
      queryClient.invalidateQueries({ queryKey: ['ai-settings'] })
    },
    onError: (err: unknown) => {
      setError(err instanceof Error ? err.message : 'שגיאה בשמירת הגדרות ה-AI')
    },
  })

  const handleToggleAi = async () => {
    if (!settings) return
    const nextEnabled = !settings.aiEnabled
    const ok = await confirm({
      title: nextEnabled ? 'הפעלת הבוט' : 'כיבוי הבוט',
      description: nextEnabled
        ? 'הבוט יחזור לענות אוטומטית בכל השיחות הפעילות.'
        : 'כל התשובות האוטומטיות בכל השיחות יופסקו מיידית. הודעות מלקוחות ימשיכו להתקבל, אך הבוט לא יענה עד שתפעיל אותו מחדש.',
      confirmLabel: nextEnabled ? 'הפעל' : 'כבה',
      variant: nextEnabled ? 'default' : 'destructive',
    })
    if (ok) toggleAiMutation.mutate(nextEnabled)
  }

  const handleSaveConfig = () => {
    const trimmedModel = model.trim()
    if (!trimmedModel) {
      setError('נא לבחור או להזין שם מודל AI מורשה')
      return
    }
    // Temperature is no longer user-editable — round-trip whatever's already stored (or the
    // shared 0.4 default) instead of silently overwriting it.
    saveConfigMutation.mutate({
      model: trimmedModel,
      temperature: settings?.aiConfig.temperature ?? 0.4,
      maxTokens: parseMaxTokens(maxTokens),
    })
  }

  const resetConversationsMutation = useMutation({
    mutationFn: () => resetConversations(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] })
      queryClient.invalidateQueries({ queryKey: ['messages'] })
      queryClient.invalidateQueries({ queryKey: ['unseen-messages-count'] })
    },
  })

  const handleResetConversations = async () => {
    const ok = await confirm({
      title: 'איפוס כל השיחות וההודעות',
      description: 'פעולה זו תמחק לצמיתות את כל השיחות וההודעות במערכת (לקוחות ותורים יישארו). לא ניתן לבטל פעולה זו.',
      confirmLabel: 'איפוס',
      variant: 'destructive',
    })
    if (ok) resetConversationsMutation.mutate()
  }

  return (
    <div className="flex max-w-xl flex-col gap-5 pb-28 font-assistant" dir="rtl">
      {import.meta.env.DEV && (
        <div className="card-native space-y-2.5 border-rose-500/25 bg-rose-500/5 p-4">
          <div className="flex items-center gap-2 text-rose-500">
            <Trash2 size={16} />
            <span className="text-[13px] font-extrabold">כלי פיתוח — איפוס שיחות</span>
          </div>
          <p className="text-xs leading-relaxed text-muted-foreground">
            מוחק לצמיתות את כל השיחות וההודעות במערכת. לקוחות ותורים לא נמחקים. זמין רק בסביבת פיתוח.
          </p>
          <button
            type="button"
            disabled={resetConversationsMutation.isPending}
            onClick={handleResetConversations}
            className="btn-native h-11 !w-full bg-destructive text-destructive-foreground md:!w-auto"
          >
            {resetConversationsMutation.isPending ? 'מאפס…' : 'איפוס כל השיחות וההודעות'}
          </button>
          {resetConversationsMutation.isSuccess && (
            <p className="text-xs font-semibold text-emerald-500">
              נמחקו {resetConversationsMutation.data.deletedConversations} שיחות ו-
              {resetConversationsMutation.data.deletedMessages} הודעות.
            </p>
          )}
        </div>
      )}

      {error && (
        <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-xs font-semibold text-rose-500">
          {error}
        </div>
      )}

      {loadingSettings || !settings ? (
        <SettingsTabSkeleton fields={1} />
      ) : (
        <>
          <div className="row-native card-native !border-t-0">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/12 text-emerald-600">
              <Bot size={18} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[15px] font-bold text-foreground">הסוכן פעיל</div>
              <div className="text-[13px] text-muted-foreground">מגיב אוטומטית לפניות חדשות</div>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={settings.aiEnabled}
              disabled={toggleAiMutation.isPending}
              onClick={handleToggleAi}
              className={`peer inline-flex h-[30px] w-[50px] shrink-0 cursor-pointer items-center rounded-full border-0 p-[3px] transition-colors duration-150 ease-native disabled:cursor-not-allowed disabled:opacity-50 ${
                settings.aiEnabled ? 'bg-primary' : 'bg-muted'
              }`}
            >
              <span
                className={`block size-6 rounded-full bg-white shadow-sm transition-transform duration-150 ease-native ${
                  settings.aiEnabled ? 'ms-auto' : ''
                }`}
              />
            </button>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="form-label">מודל</label>
            <ModelSearchSelect value={model} onChange={setModel} />
          </div>

          <div className="sticky bottom-0 z-10 -mx-4 mt-2 flex flex-col gap-2 border-t border-border/60 bg-background/95 px-4 py-3 backdrop-blur lg:static lg:mx-0 lg:border-0 lg:bg-transparent lg:px-0 lg:py-0">
            <button
              type="button"
              disabled={saveConfigMutation.isPending}
              onClick={handleSaveConfig}
              className="btn-native"
            >
              <Save size={16} />
              {saveConfigMutation.isPending ? 'שומר…' : 'שמור הגדרות'}
            </button>
            {configSaved && (
              <span className="text-center text-xs font-semibold text-emerald-500">נשמר בהצלחה ✓</span>
            )}
          </div>
        </>
      )}
    </div>
  )
}

export default AiAgentTab
