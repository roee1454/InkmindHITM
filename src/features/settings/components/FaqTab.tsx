import React, { useEffect, useState } from 'react'
import { Trash2, AlertCircle, ShieldAlert, Save, Plus } from 'lucide-react'
import { useLocation, useNavigate } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { ResponsiveDialog } from '@/components/ui/responsive-dialog'
import { SettingsTabSkeleton } from './SettingsTabSkeleton'
import {
  getFaqList,
  createFaq,
  updateFaq,
  deleteFaq,
  saveAiInstructions,
  getAiSettings,
  type ApiFaqEntry,
} from '../server/settings'
import { useSettingsUiStore } from '../store/settingsUiStore'
import { useConfirm } from '@/hooks/use-confirm'

export const FaqTab: React.FC = () => {
  const queryClient = useQueryClient()
  const confirm = useConfirm()
  const location = useLocation()
  const navigate = useNavigate()
  const [addOpen, setAddOpen] = useState(false)
  const {
    faqNewQuestion: newQuestion,
    faqNewAnswer: newAnswer,
    faqEditingId: editingId,
    faqEditQuestion: editQuestion,
    faqEditAnswer: editAnswer,
    faqError: error,
    setFaqNewQuestion: setNewQuestion,
    setFaqNewAnswer: setNewAnswer,
    setFaqEditingId: setEditingId,
    setFaqEditQuestion: setEditQuestion,
    setFaqEditAnswer: setEditAnswer,
    setFaqError: setError,
    aiInstructions: instructions,
    aiInstructionsSaved: instructionsSaved,
    setAiInstructions: setInstructions,
    setAiInstructionsSaved: setInstructionsSaved,
  } = useSettingsUiStore()

  const { data: entries = [], isLoading: loading } = useQuery<ApiFaqEntry[]>({
    queryKey: ['faq-list'],
    queryFn: () => getFaqList(),
  })

  const { data: aiSettings } = useQuery({
    queryKey: ['ai-settings'],
    queryFn: () => getAiSettings(),
  })

  useEffect(() => {
    if (aiSettings) setInstructions(aiSettings.systemInstructions || '')
  }, [aiSettings])

  // The mobile top bar's "+" action navigates here with `?new=1` since it lives outside this
  // component's tree — pick it up once, then clear it so back-navigation doesn't reopen it.
  useEffect(() => {
    if ((location.search as Record<string, unknown>)?.new === '1') {
      setAddOpen(true)
      navigate({ to: '/dashboard/settings/faq', search: {}, replace: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search])

  const addFaqMutation = useMutation({
    mutationFn: (body: { question: string; answer: string }) => createFaq({ data: body }),
    onSuccess: () => {
      setNewQuestion('')
      setNewAnswer('')
      setError(null)
      setAddOpen(false)
      queryClient.invalidateQueries({ queryKey: ['faq-list'] })
    },
    onError: (err: unknown) => {
      setError(err instanceof Error ? err.message : 'שגיאה בהוספת שאלה נפוצה')
    },
  })

  const editFaqMutation = useMutation({
    mutationFn: ({ id, question, answer }: { id: string; question: string; answer: string }) =>
      updateFaq({ data: { id, question, answer } }),
    onSuccess: () => {
      setEditingId(null)
      setError(null)
      queryClient.invalidateQueries({ queryKey: ['faq-list'] })
    },
    onError: (err: unknown) => {
      setError(err instanceof Error ? err.message : 'שגיאה בעריכת שאלה נפוצה')
    },
  })

  const deleteFaqMutation = useMutation({
    mutationFn: (id: string) => deleteFaq({ data: { id } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['faq-list'] })
    },
    onError: (err: unknown) => {
      setError(err instanceof Error ? err.message : 'שגיאה במחיקת שאלה נפוצה')
    },
  })

  const saveInstructionsMutation = useMutation({
    mutationFn: (body: { instructions: string }) => saveAiInstructions({ data: body }),
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

  const handleAddFaq = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newQuestion.trim() || !newAnswer.trim()) return
    addFaqMutation.mutate({ question: newQuestion, answer: newAnswer })
  }

  const startEdit = (entry: ApiFaqEntry) => {
    setEditingId(entry.id)
    setEditQuestion(entry.question)
    setEditAnswer(entry.answer)
  }

  const saveEdit = (id: string) => {
    if (!editQuestion.trim() || !editAnswer.trim()) return
    editFaqMutation.mutate({ id, question: editQuestion, answer: editAnswer })
  }

  return (
    <div className="flex max-w-xl flex-col gap-5 pb-28 font-assistant" dir="rtl">
      {error && (
        <div className="flex items-center gap-2 rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-2.5 text-xs font-semibold text-rose-500">
          <AlertCircle size={14} />
          {error}
        </div>
      )}

      <div className="flex items-center justify-between gap-2 px-1">
        <p className="text-[13.5px] font-medium text-muted-foreground">
          הסוכן עונה עליהן ישירות ללקוחות · {entries.length} שאלות
        </p>
        <button
          type="button"
          onClick={() => setAddOpen(true)}
          className="hidden shrink-0 items-center gap-1.5 rounded-xl bg-primary/10 px-3 py-1.5 text-[13px] font-extrabold text-primary lg:inline-flex"
        >
          <Plus size={15} />
          הוספת שאלה
        </button>
      </div>

      <ResponsiveDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        title="הוספת שאלה נפוצה"
        description="השאלה והתשובה יתווספו למאגר הידע שהסוכן משתמש בו כדי לענות ללקוחות."
      >
        <form onSubmit={handleAddFaq} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="form-label">שאלה</label>
            <Input value={newQuestion} onChange={(e) => setNewQuestion(e.target.value)} placeholder="לדוגמה: אילו שעות אתם פתוחים?" dir="rtl" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="form-label">תשובה</label>
            <Input value={newAnswer} onChange={(e) => setNewAnswer(e.target.value)} placeholder="לדוגמה: אנחנו פתוחים א׳-ה׳, 10:00-18:00" dir="rtl" />
          </div>
          <button type="submit" disabled={addFaqMutation.isPending} className="btn-native mt-1">
            <Save size={16} />
            {addFaqMutation.isPending ? 'מוסיף…' : 'הוספת שאלה'}
          </button>
        </form>
      </ResponsiveDialog>

      {loading ? (
        <SettingsTabSkeleton fields={0} />
      ) : (
        <div className="card-native overflow-hidden">
          {entries.map((entry) =>
            editingId === entry.id ? (
              <div key={entry.id} className="flex flex-col gap-2 border-t border-border/60 p-4 first:border-t-0">
                <Input value={editQuestion} onChange={(e) => setEditQuestion(e.target.value)} placeholder="ערוך שאלה" dir="rtl" />
                <Input value={editAnswer} onChange={(e) => setEditAnswer(e.target.value)} placeholder="ערוך תשובה" dir="rtl" />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => saveEdit(entry.id)}
                    className="btn-native h-10 flex-1 !text-[14px]"
                  >
                    שמור
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingId(null)}
                    className="btn-native-ghost h-10 flex-1 !text-[14px]"
                  >
                    ביטול
                  </button>
                </div>
              </div>
            ) : (
              <div
                key={entry.id}
                onClick={() => startEdit(entry)}
                className="row-native cursor-pointer items-start justify-between gap-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="text-[15.5px] font-extrabold text-foreground">{entry.question}</div>
                  <p className="mt-0.5 text-[14px] leading-relaxed text-muted-foreground">{entry.answer}</p>
                </div>
                <button
                  type="button"
                  onClick={async (e) => {
                    e.stopPropagation()
                    const ok = await confirm({
                      title: 'מחיקת שאלה נפוצה',
                      description: `"${entry.question}" תימחק לצמיתות ממאגר הידע של הבוט.`,
                      confirmLabel: 'מחק',
                      variant: 'destructive',
                    })
                    if (ok) deleteFaqMutation.mutate(entry.id)
                  }}
                  className="tap-target shrink-0 text-muted-foreground active:text-destructive"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ),
          )}

          {entries.length === 0 && (
            <div className="flex h-16 items-center justify-center text-xs text-muted-foreground">
              אין עדיין רשומות במאגר הידע
            </div>
          )}
        </div>
      )}

      <div className="card-native flex flex-col gap-2.5 p-4">
        <div className="flex items-center gap-2 text-foreground">
          <ShieldAlert size={18} className="text-primary" />
          <h3 className="text-[15px] font-extrabold">חוקי ברזל שאסור להפר</h3>
        </div>
        <p className="text-xs leading-relaxed text-muted-foreground">
          הנחיות קשיחות לבוט ה-AI. חוקים אלו ייאכפו בקפדנות ולא יופרו בשום מקרה (למשל: תנאי מקדמה,
          איסור מתן הנחות מסוימות, מגבלות גיל או הנחיות התנהגות מיוחדות).
        </p>
        <Textarea
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
          placeholder={`רשום כאן את חוקי הברזל של הסטודיו. למשל:\n1. אין לקבוע תור ללא תשלום מקדמה של 200 ש"ח.\n2. לעולם אל תיתן מחיר סופי לקעקוע - תן טווח מחירים והבהר שמדובר בהערכה בלבד.`}
          className="min-h-[260px] resize-none"
          dir="rtl"
        />
      </div>

      <div className="sticky bottom-0 z-10 -mx-4 mt-2 flex flex-col gap-2 border-t border-border/60 bg-background/95 px-4 py-3 backdrop-blur lg:static lg:mx-0 lg:border-0 lg:bg-transparent lg:px-0 lg:py-0">
        <button
          type="button"
          disabled={saveInstructionsMutation.isPending}
          onClick={() => saveInstructionsMutation.mutate({ instructions })}
          className="btn-native"
        >
          <Save size={16} />
          {saveInstructionsMutation.isPending ? 'שומר חוקים…' : 'שמור חוקים'}
        </button>
        {instructionsSaved && (
          <span className="text-center text-xs font-semibold text-emerald-500">החוקים נשמרו בהצלחה ✓</span>
        )}
      </div>
    </div>
  )
}

export default FaqTab
