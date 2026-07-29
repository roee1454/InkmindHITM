import React from 'react'
import { Plus, Trash2, AlertCircle } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  getFaqList,
  createFaq,
  updateFaq,
  deleteFaq,
  type ApiFaqEntry,
} from '../server/settings'
import { useSettingsUiStore } from '../store/settingsUiStore'

export const FaqTab: React.FC = () => {
  const queryClient = useQueryClient()
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
  } = useSettingsUiStore()

  const { data: entries = [], isLoading: loading } = useQuery<ApiFaqEntry[]>({
    queryKey: ['faq-list'],
    queryFn: () => getFaqList(),
  })

  const addFaqMutation = useMutation({
    mutationFn: (body: { question: string; answer: string }) =>
      createFaq({ data: body }),
    onSuccess: () => {
      setNewQuestion('')
      setNewAnswer('')
      setError(null)
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
    <div className="grid grid-cols-1 gap-6 font-assistant text-right lg:grid-cols-12" dir="rtl">
      <div className="space-y-1 lg:col-span-5">
        <h3 className="text-sm md:text-base font-bold text-foreground">מאגר ידע לבוט (FAQ)</h3>
        <p className="max-w-sm text-xs leading-relaxed text-muted-foreground">
          הבוט משתמש ברשימת השאלות והתשובות הזו כדי לענות ללקוחות על שאלות כלליות (שעות, מיקום,
          מדיניות, כאב, טיפוח).
        </p>
      </div>

      <div className="space-y-4 lg:col-span-7">
        {error && (
          <div className="flex items-center gap-2 rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-2.5 text-xs font-semibold text-rose-400">
            <AlertCircle size={14} />
            {error}
          </div>
        )}

        <form
          onSubmit={handleAddFaq}
          className="grid grid-cols-1 items-end gap-3 rounded-xl border border-border bg-card p-4 md:grid-cols-12 shadow-sm"
        >
          <div className="flex flex-col gap-1.5 md:col-span-5">
            <Input
              value={newQuestion}
              onChange={(e) => setNewQuestion(e.target.value)}
              placeholder="שאלה"
              dir="rtl"
              className="bg-white text-foreground border-input"
            />
          </div>
          <div className="flex flex-col gap-1.5 md:col-span-5">
            <Input
              value={newAnswer}
              onChange={(e) => setNewAnswer(e.target.value)}
              placeholder="תשובה"
              dir="rtl"
              className="bg-white text-foreground border-input"
            />
          </div>
          <div className="md:col-span-2">
            <Button
              type="submit"
              disabled={addFaqMutation.isPending}
              className="flex w-full items-center justify-center gap-1"
            >
              <Plus size={14} /> {addFaqMutation.isPending ? 'מוסיף…' : 'הוסף'}
            </Button>
          </div>
        </form>

        {loading ? (
          <p className="text-xs text-muted-foreground">טוען…</p>
        ) : (
          <div className="space-y-2.5">
            {entries.map((entry) =>
              editingId === entry.id ? (
                <div
                  key={entry.id}
                  className="space-y-2 rounded-xl border border-primary/40 bg-card p-3.5"
                >
                  <Input
                    value={editQuestion}
                    onChange={(e) => setEditQuestion(e.target.value)}
                    placeholder="ערוך שאלה"
                    dir="rtl"
                    className="bg-white text-foreground border-input"
                  />
                  <Input
                    value={editAnswer}
                    onChange={(e) => setEditAnswer(e.target.value)}
                    placeholder="ערוך תשובה"
                    dir="rtl"
                    className="bg-white text-foreground border-input"
                  />
                  <div className="flex gap-2">
                    <Button onClick={() => saveEdit(entry.id)} size="sm">
                      שמור
                    </Button>
                    <Button onClick={() => setEditingId(null)} variant="outline" size="sm">
                      ביטול
                    </Button>
                  </div>
                </div>
              ) : (
                <div
                  key={entry.id}
                  className="flex items-center justify-between gap-4 rounded-xl border border-border bg-card p-3.5 transition-colors hover:border-border/80 shadow-sm"
                >
                  <div className="flex-1 cursor-pointer" onClick={() => startEdit(entry)}>
                    <span className="text-xs font-bold text-primary">{entry.question}</span>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                      {entry.answer}
                    </p>
                  </div>
                  <Button
                    onClick={() => deleteFaqMutation.mutate(entry.id)}
                    variant="ghost"
                    size="icon"
                    className="border border-transparent text-muted-foreground hover:border-rose-500/20 hover:bg-rose-500/10 hover:text-rose-500"
                  >
                    <Trash2 size={14} />
                  </Button>
                </div>
              ),
            )}

            {entries.length === 0 && (
              <div className="flex h-24 items-center justify-center rounded-xl border border-dashed border-border text-xs text-muted-foreground">
                אין עדיין רשומות במאגר הידע
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default FaqTab
