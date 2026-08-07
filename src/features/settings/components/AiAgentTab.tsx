import React, { useEffect } from 'react'
import { Bot, PowerOff, Save, SlidersHorizontal, BookOpen, ShieldAlert, Bug, Trash2 } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  getAiSettings,
  toggleAiEnabled,
  saveAiConfig,
  saveAiInstructions,
  testAiConnection,
} from '../server/settings'
import type { AiSettings } from '../server/settings'
import { resetConversations } from '@/features/conversations/server/debug'
import { FaqTab } from './FaqTab'
import { ModelSearchSelect } from './ModelSearchSelect'
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
    aiTemperature: temperature,
    aiMaxTokens: maxTokens,
    aiInstructions: instructions,
    aiConfigSaved: configSaved,
    aiInstructionsSaved: instructionsSaved,
    aiError: error,
    setAiModel: setModel,
    setAiTemperature: setTemperature,
    setAiMaxTokens: setMaxTokens,
    setAiInstructions: setInstructions,
    setAiConfigSaved: setConfigSaved,
    setAiInstructionsSaved: setInstructionsSaved,
    setAiError: setError,
  } = useSettingsUiStore()

  const { data: settings, isLoading: loadingSettings } = useQuery<AiSettings>({
    queryKey: ['ai-settings'],
    queryFn: () => getAiSettings(),
  })

  useEffect(() => {
    if (!settings) return
    setModel(settings.aiConfig.model || 'gpt-4o')
    setTemperature(settings.aiConfig.temperature)
    setMaxTokens(settings.aiConfig.maxTokens === null ? '' : String(settings.aiConfig.maxTokens))
    setInstructions(settings.systemInstructions || '')
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

  const testMutation = useMutation({
    mutationFn: () =>
      testAiConnection({
        data: { model: model.trim(), temperature, maxTokens: parseMaxTokens(maxTokens) },
      }),
  })

  const saveInstructionsMutation = useMutation({
    mutationFn: (body: { instructions: string }) =>
      saveAiInstructions({ data: body }),
    onSuccess: () => {
      setError(null)
      setInstructionsSaved(true)
      setTimeout(() => setInstructionsSaved(false), 2000)
      queryClient.invalidateQueries({ queryKey: ['ai-settings'] })
    },
    onError: (err: unknown) => {
      setError(err instanceof Error ? err.message : 'שגיאה בשמירת חוקי הברזל')
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

  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmedMaxTokens = maxTokens.trim()
    const parsedMaxTokens = trimmedMaxTokens === '' ? null : parseInt(trimmedMaxTokens, 10)

    if (parsedMaxTokens !== null && (!Number.isInteger(parsedMaxTokens) || parsedMaxTokens < 1)) {
      setError('מגבלת טוקנים חייבת להיות מספר שלם חיובי, או ריקה ללא הגבלה')
      return
    }
    if (Number.isNaN(temperature) || temperature < 0 || temperature > 2) {
      setError('רמת יצירתיות (Temperature) חייבת להיות בין 0 ל-2')
      return
    }

    const trimmedModel = model.trim()
    if (!trimmedModel) {
      setError('נא לבחור או להזין שם מודל AI מורשה')
      return
    }

    saveConfigMutation.mutate({ model: trimmedModel, temperature, maxTokens: parsedMaxTokens })
  }

  const handleSaveInstructions = (e: React.FormEvent) => {
    e.preventDefault()
    saveInstructionsMutation.mutate({ instructions })
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
    <div className="space-y-6 font-assistant text-right" dir="rtl">
      {error && (
        <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-xs font-semibold text-rose-400">
          {error}
        </div>
      )}

      <Tabs defaultValue="general" dir="rtl" className="w-full">
        <TabsList className="bg-muted/70 border border-border/80 p-1 rounded-xl mb-6 inline-flex gap-1 h-auto shadow-sm">
          <TabsTrigger
            value="general"
            className="cursor-pointer rounded-lg px-4 py-2 font-bold text-xs transition-all hover:text-foreground data-[state=active]:bg-card data-[state=active]:shadow-xs flex items-center gap-1.5"
          >
            <SlidersHorizontal size={13} />
            הגדרות כלליות
          </TabsTrigger>
          <TabsTrigger
            value="knowledge"
            className="cursor-pointer rounded-lg px-4 py-2 font-bold text-xs transition-all hover:text-foreground data-[state=active]:bg-card data-[state=active]:shadow-xs flex items-center gap-1.5"
          >
            <BookOpen size={13} />
            מאגרי מידע
          </TabsTrigger>
          {import.meta.env.DEV && (
            <TabsTrigger
              value="debug"
              className="cursor-pointer rounded-lg px-4 py-2 font-bold text-xs transition-all hover:text-foreground data-[state=active]:bg-card data-[state=active]:shadow-xs flex items-center gap-1.5"
            >
              <Bug size={13} />
              כלי דיבאג
            </TabsTrigger>
          )}
        </TabsList>

        {/* Tab 1: General Settings */}
        <TabsContent value="general" className="space-y-6 focus-visible:outline-none">
          {/* Section 1.1: Emergency Kill Switch */}
          <div className="grid grid-cols-1 gap-6 border-b border-border/60 pb-6 lg:grid-cols-12">
            <div className="space-y-1 lg:col-span-5">
              <h3 className="text-sm md:text-base font-bold text-foreground">כיבוי חירום של הבוט</h3>
              <p className="max-w-sm text-xs leading-relaxed text-muted-foreground">
                עוצר את כל התשובות האוטומטיות בכל השיחות בבת אחת. הודעות מלקוחות ימשיכו להתקבל ולהופיע
                ב-CRM — הבוט פשוט לא יענה.
              </p>
            </div>

            <div className="lg:col-span-7">
              {loadingSettings ? (
                <div className="text-xs font-semibold text-muted-foreground">טוען…</div>
              ) : settings ? (
                <div
                  className={`flex items-center justify-between rounded-xl border p-4 transition-all duration-300 ${
                    settings.aiEnabled
                      ? 'border-emerald-500/20 bg-emerald-500/5 shadow-xs shadow-emerald-500/5'
                      : 'border-rose-500/25 bg-rose-500/5 shadow-xs shadow-rose-500/5'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex size-10 items-center justify-center rounded-xl bg-card border border-border shadow-2xs">
                      {settings.aiEnabled ? (
                        <Bot size={20} className="animate-pulse text-emerald-500" />
                      ) : (
                        <PowerOff size={20} className="text-rose-500" />
                      )}
                    </div>
                    <div>
                      <div
                        className={`text-sm font-bold ${
                          settings.aiEnabled ? 'text-emerald-500' : 'text-rose-500'
                        }`}
                      >
                        {settings.aiEnabled ? 'הבוט פעיל בכל השיחות' : 'הבוט מושבת בכל השיחות'}
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        {settings.aiEnabled
                          ? 'תשובות אוטומטיות נשלחות כרגיל'
                          : 'אף תשובה אוטומטית לא נשלחת כרגע'}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-muted-foreground">
                      {settings.aiEnabled ? 'פעיל' : 'כבוי'}
                    </span>
                    <Switch
                      checked={settings.aiEnabled}
                      onCheckedChange={handleToggleAi}
                      disabled={toggleAiMutation.isPending}
                    />
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          {/* Section 1.2: Model & Parameters */}
          <form onSubmit={handleSaveConfig} className="grid grid-cols-1 gap-6 pb-6 lg:grid-cols-12">
            <div className="space-y-1 lg:col-span-5">
              <h3 className="text-sm md:text-base font-bold text-foreground">מודל ופרמטרים של AI</h3>
              <p className="max-w-sm text-xs leading-relaxed text-muted-foreground">
                בחירת מודל השפה, רמת היצירתיות ומגבלת אורך התשובה שמפעילות את בוט האינטייק בוואטסאפ.
              </p>
            </div>

            <div className="space-y-4 lg:col-span-7">
              {loadingSettings ? (
                <p className="text-xs text-muted-foreground">טוען…</p>
              ) : (
                <div className="space-y-5 rounded-2xl border border-border/80 bg-card p-5 shadow-2xs">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground">מודל AI</label>
                    <ModelSearchSelect value={model} onChange={setModel} />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs font-semibold text-foreground">
                      <span>רמת יצירתיות (Temperature)</span>
                      <span className="bg-primary/10 text-primary px-2 py-0.5 rounded-md font-mono">
                        {temperature.toFixed(1)}
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={2}
                      step={0.1}
                      value={temperature}
                      onChange={(e) => setTemperature(parseFloat(e.target.value))}
                      className="w-full accent-primary h-1.5 bg-muted rounded-lg appearance-none cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] text-muted-foreground">
                      <span>ממוקד ועקבי (0.0)</span>
                      <span>מאוזן (1.0)</span>
                      <span>יצירתי ומגוון (2.0)</span>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground">
                      מגבלת טוקנים לתשובה (Context Limit)
                    </label>
                    <Input
                      type="number"
                      min={1}
                      value={maxTokens}
                      onChange={(e) => setMaxTokens(e.target.value)}
                      placeholder="ללא הגבלה"
                      className="w-full bg-white dark:bg-muted/20 text-foreground border-input text-right md:w-64"
                      dir="rtl"
                    />
                  </div>

                  <div className="flex flex-wrap items-center gap-3 pt-2">
                    <Button
                      type="submit"
                      disabled={saveConfigMutation.isPending}
                      className="cursor-pointer"
                    >
                      <Save size={14} className="ml-1.5" />
                      {saveConfigMutation.isPending ? 'שומר…' : 'שמור שינויים'}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      disabled={testMutation.isPending}
                      onClick={() => testMutation.mutate()}
                      className="cursor-pointer"
                    >
                      {testMutation.isPending ? 'בודק…' : 'בדיקת חיבור'}
                    </Button>
                    {configSaved && (
                      <span className="text-xs font-semibold text-emerald-500 animate-fade-in">
                        נשמר בהצלחה ✓
                      </span>
                    )}
                  </div>

                  {testMutation.isSuccess ? (
                    <p className="text-xs font-semibold text-emerald-500">
                      החיבור תקין — תשובת המודל: "{testMutation.data.sample}"
                    </p>
                  ) : null}
                  {testMutation.isError ? (
                    <p className="text-xs font-semibold text-destructive">
                      {testMutation.error instanceof Error
                        ? testMutation.error.message
                        : 'בדיקת החיבור נכשלה.'}
                    </p>
                  ) : null}
                </div>
              )}
            </div>
          </form>
        </TabsContent>

        {/* Tab 2: Knowledge Base & Rules */}
        <TabsContent value="knowledge" className="space-y-8 focus-visible:outline-none">
          {/* Section 2.1: FAQ */}
          <div className="border-b border-border/60 pb-8">
            <FaqTab />
          </div>

          {/* Section 2.2: Ironclad Rules */}
          <form onSubmit={handleSaveInstructions} className="grid grid-cols-1 gap-6 pb-6 lg:grid-cols-12">
            <div className="space-y-1 lg:col-span-5">
              <div className="flex items-center gap-2 text-foreground mb-1">
                <ShieldAlert size={18} className="text-primary" />
                <h3 className="text-sm md:text-base font-bold">חוקי ברזל שאסור להפר</h3>
              </div>
              <p className="max-w-sm text-xs leading-relaxed text-muted-foreground">
                הנחיות קשיחות לבוט ה-AI. חוקים אלו ייאכפו בקפדנות ולא יופרו בשום מקרה (למשל: תנאי מקדמה, איסור מתן הנחות מסוימות, מגבלות גיל או הנחיות התנהגות מיוחדות).
              </p>
            </div>

            <div className="space-y-4 lg:col-span-7">
              {loadingSettings ? (
                <p className="text-xs text-muted-foreground">טוען…</p>
              ) : (
                <div className="space-y-4 rounded-2xl border border-border/80 bg-card p-5 shadow-2xs">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-semibold text-foreground">
                      <label>רשימת חוקי ברזל והנחיות מערכת</label>
                      <span className="text-[10px] text-muted-foreground">
                        {instructions.length} תווים
                      </span>
                    </div>
                    <Textarea
                      value={instructions}
                      onChange={(e) => setInstructions(e.target.value)}
                      placeholder={`רשום כאן את חוקי הברזל של הסטודיו. למשל:\n1. אין לקבוע תור ללא תשלום מקדמה של 200 ש"ח.\n2. לעולם אל תיתן מחיר סופי לקעקוע - תן טווח מחירים והבהר שמדובר בהערכה בלבד.\n3. הגבלת גיל המינימום לקעקוע היא 16 עם אישור הורים, או 18 ללא אישור.`}
                      rows={8}
                      className="bg-white dark:bg-muted/20 text-foreground border-input text-right font-assistant leading-relaxed"
                      dir="rtl"
                    />
                  </div>

                  <div className="flex items-center gap-3 pt-1">
                    <Button
                      type="submit"
                      disabled={saveInstructionsMutation.isPending}
                      className="cursor-pointer"
                    >
                      <Save size={14} className="ml-1.5" />
                      {saveInstructionsMutation.isPending ? 'שומר חוקים…' : 'שמור חוקים'}
                    </Button>
                    {instructionsSaved && (
                      <span className="text-xs font-semibold text-emerald-500 animate-fade-in">
                        החוקים נשמרו בהצלחה ✓
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </form>
        </TabsContent>

        {/* Tab 3: Debug tools (dev-only) */}
        {import.meta.env.DEV && (
          <TabsContent value="debug" className="space-y-6 focus-visible:outline-none">
            <div className="grid grid-cols-1 gap-6 pb-6 lg:grid-cols-12">
              <div className="space-y-1 lg:col-span-5">
                <div className="flex items-center gap-2 text-foreground mb-1">
                  <Bug size={18} className="text-primary" />
                  <h3 className="text-sm md:text-base font-bold">איפוס שיחות</h3>
                </div>
                <p className="max-w-sm text-xs leading-relaxed text-muted-foreground">
                  מוחק לצמיתות את כל השיחות וההודעות במערכת, כדי לבדוק זרימת בוט נקייה מאפס.
                  לקוחות ותורים לא נמחקים. זמין רק בסביבת פיתוח.
                </p>
              </div>
              <div className="lg:col-span-7">
                <div className="space-y-3 rounded-2xl border border-rose-500/25 bg-rose-500/5 p-5 shadow-2xs">
                  <Button
                    type="button"
                    variant="destructive"
                    disabled={resetConversationsMutation.isPending}
                    onClick={handleResetConversations}
                    className="cursor-pointer"
                  >
                    <Trash2 size={14} className="ml-1.5" />
                    {resetConversationsMutation.isPending ? 'מאפס…' : 'איפוס כל השיחות וההודעות'}
                  </Button>
                  {resetConversationsMutation.isSuccess ? (
                    <p className="text-xs font-semibold text-emerald-500">
                      נמחקו {resetConversationsMutation.data.deletedConversations} שיחות ו-
                      {resetConversationsMutation.data.deletedMessages} הודעות.
                    </p>
                  ) : null}
                  {resetConversationsMutation.isError ? (
                    <p className="text-xs font-semibold text-destructive">
                      {resetConversationsMutation.error instanceof Error
                        ? resetConversationsMutation.error.message
                        : 'האיפוס נכשל.'}
                    </p>
                  ) : null}
                </div>
              </div>
            </div>
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}

export default AiAgentTab
