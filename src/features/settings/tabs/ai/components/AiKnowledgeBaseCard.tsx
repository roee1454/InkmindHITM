import React, { useState } from 'react'
import { Plus, Trash2, Edit3, HelpCircle } from '@/components/ui/icon'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getFaqList, createFaq, updateFaq, deleteFaq } from '@/features/settings/server/settings'
import type { ApiFaqEntry } from '@/features/settings/server/settings'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { ResponsiveDialog } from '@/components/ui/responsive-dialog'
import { SettingsErrorBanner } from '@/features/settings/components/SettingsErrorBanner'
import { useConfirm } from '#/hooks/useConfirm'

export const AiKnowledgeBaseCard: React.FC = () => {
  const queryClient = useQueryClient()
  const confirm = useConfirm()
  const [addOpen, setAddOpen] = useState(false)
  const [editItem, setEditItem] = useState<ApiFaqEntry | null>(null)
  const [error, setError] = useState<string | null>(null)

  // New FAQ form state
  const [newQuestion, setNewQuestion] = useState('')
  const [newAnswer, setNewAnswer] = useState('')

  // Edit FAQ form state
  const [editQuestion, setEditQuestion] = useState('')
  const [editAnswer, setEditAnswer] = useState('')

  const { data: entries = [], isLoading } = useQuery<ApiFaqEntry[]>({
    queryKey: ['faq-list'],
    queryFn: () => getFaqList(),
  })

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
      setError(err instanceof Error ? err.message : 'שגיאה בהוספת שאלה')
    },
  })

  const editFaqMutation = useMutation({
    mutationFn: ({ id, question, answer }: { id: string; question: string; answer: string }) =>
      updateFaq({ data: { id, question, answer } }),
    onSuccess: () => {
      setEditItem(null)
      setError(null)
      queryClient.invalidateQueries({ queryKey: ['faq-list'] })
    },
    onError: (err: unknown) => {
      setError(err instanceof Error ? err.message : 'שגיאה בעריכת שאלה')
    },
  })

  const deleteFaqMutation = useMutation({
    mutationFn: (id: string) => deleteFaq({ data: { id } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['faq-list'] })
    },
    onError: (err: unknown) => {
      setError(err instanceof Error ? err.message : 'שגיאה במחיקת שאלה')
    },
  })

  const handleStartEdit = (entry: ApiFaqEntry) => {
    setEditItem(entry)
    setEditQuestion(entry.question)
    setEditAnswer(entry.answer)
  }

  const handleDelete = async (entry: ApiFaqEntry) => {
    const ok = await confirm({
      title: 'מחיקת שאלה נפוצה',
      description: `האם למחוק את השאלה "${entry.question}"? הסוכן לא ידע יותר לענות לפיה.`,
      confirmLabel: 'מחק',
      variant: 'destructive',
    })
    if (ok) deleteFaqMutation.mutate(entry.id)
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-xs flex flex-col gap-4 font-assistant" dir="rtl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-3">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <HelpCircle size={18} className="shrink-0 text-primary" />
          <div className="min-w-0">
            <h3 className="text-base font-bold text-foreground">מאגר ידע ושאלות נפוצות</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              שאלות ותשובות שהסוכן לומד מהן ומשתמש בהן כדי לספק תשובות מדויקות ללקוחות.
            </p>
          </div>
        </div>
        <Button
          type="button"
          onClick={() => setAddOpen(true)}
          className="shrink-0 gap-1.5 text-xs font-bold"
        >
          <Plus size={14} />
          הוספת שאלה
        </Button>
      </div>

      <SettingsErrorBanner error={error} onDismiss={() => setError(null)} />

      {/* Entry List */}
      <div className="flex flex-col gap-2">
        {isLoading ? (
          <div className="rounded-xl border border-border bg-muted/20 p-6 text-center text-xs text-muted-foreground">
            טוען שאלות ותשובות…
          </div>
        ) : entries.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
            אין עדיין שאלות במאגר. הוסף שאלות נפוצות שלקוחות מרבים לשאול (למשל: הנחיות טיפול, חניה, שעות פעילות).
          </div>
        ) : (
          entries.map((entry) => (
            <div
              key={entry.id}
              className="rounded-xl border border-border bg-muted/30 p-4 flex items-start justify-between gap-4 transition-colors hover:bg-muted/50"
            >
              <div className="flex flex-col gap-1 min-w-0 flex-1">
                <span className="text-sm font-bold text-foreground">{entry.question}</span>
                <p className="text-xs leading-relaxed text-muted-foreground line-clamp-3">
                  {entry.answer}
                </p>
              </div>
              <div className="flex items-center gap-1 shrink-0 pt-0.5">
                <button
                  type="button"
                  onClick={() => handleStartEdit(entry)}
                  className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
                  title="ערוך שאלה"
                >
                  <Edit3 size={15} />
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(entry)}
                  className="rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors cursor-pointer"
                  title="מחק שאלה"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add Dialog */}
      <ResponsiveDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        title="הוספת שאלה נפוצה למאגר"
      >
        <div className="flex flex-col gap-4 font-assistant pt-2" dir="rtl">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-muted-foreground">שאלה</label>
            <Input
              value={newQuestion}
              onChange={(e) => setNewQuestion(e.target.value)}
              placeholder="למשל: האם כואב לעשות קעקוע?"
              dir="rtl"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-muted-foreground">תשובה שהסוכן ימסור</label>
            <Textarea
              value={newAnswer}
              onChange={(e) => setNewAnswer(e.target.value)}
              placeholder="הסבר קצר, ברור ובגובה העיניים שהסוכן ישתמש בו בתשובותיו…"
              className="min-h-28"
              dir="rtl"
            />
          </div>
          <div className="flex items-center justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setAddOpen(false)}>
              ביטול
            </Button>
            <Button
              onClick={() => addFaqMutation.mutate({ question: newQuestion, answer: newAnswer })}
              disabled={!newQuestion.trim() || !newAnswer.trim() || addFaqMutation.isPending}
            >
              {addFaqMutation.isPending ? 'מוסיף…' : 'הוסף שאלה'}
            </Button>
          </div>
        </div>
      </ResponsiveDialog>

      {/* Edit Dialog */}
      <ResponsiveDialog
        open={Boolean(editItem)}
        onOpenChange={(open) => !open && setEditItem(null)}
        title="עריכת שאלה נפוצה"
      >
        <div className="flex flex-col gap-4 font-assistant pt-2" dir="rtl">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-muted-foreground">שאלה</label>
            <Input
              value={editQuestion}
              onChange={(e) => setEditQuestion(e.target.value)}
              dir="rtl"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-muted-foreground">תשובה</label>
            <Textarea
              value={editAnswer}
              onChange={(e) => setEditAnswer(e.target.value)}
              className="min-h-28"
              dir="rtl"
            />
          </div>
          <div className="flex items-center justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setEditItem(null)}>
              ביטול
            </Button>
            <Button
              onClick={() =>
                editItem &&
                editFaqMutation.mutate({
                  id: editItem.id,
                  question: editQuestion,
                  answer: editAnswer,
                })
              }
              disabled={!editQuestion.trim() || !editAnswer.trim() || editFaqMutation.isPending}
            >
              {editFaqMutation.isPending ? 'שומר…' : 'שמור שינויים'}
            </Button>
          </div>
        </div>
      </ResponsiveDialog>
    </div>
  )
}

