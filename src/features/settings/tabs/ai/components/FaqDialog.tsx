import type React from 'react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { DialogActions, ResponsiveDialog } from '@/components/ui/responsive-dialog'
import type { ApiFaqEntry } from '@/features/settings/server/settings'

interface FaqDialogProps {
  /** The entry being edited, 'new' to add one, null when closed. */
  target: ApiFaqEntry | 'new' | null
  onClose: () => void
  onSave: (values: { question: string; answer: string }) => void
  isSaving: boolean
  error: string | null
}

function FaqForm({ entry, onSave }: { entry: ApiFaqEntry | null; onSave: FaqDialogProps['onSave'] }) {
  const [question, setQuestion] = useState(entry?.question ?? '')
  const [answer, setAnswer] = useState(entry?.answer ?? '')

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (question.trim() && answer.trim()) onSave({ question: question.trim(), answer: answer.trim() })
  }

  return (
    <form id="faq-form" onSubmit={submit} className="form-stack">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="faq-question" className="form-label">
          שאלה
        </label>
        <Input id="faq-question" value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="למשל: האם כואב לעשות קעקוע?" required />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="faq-answer" className="form-label">
          התשובה שהבוט ייתן
        </label>
        <Textarea
          id="faq-answer"
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          placeholder="תשובה קצרה וברורה, במילים של הסטודיו."
          className="min-h-32"
          required
        />
      </div>
    </form>
  )
}

/** Adding and editing a knowledge-base entry are the same two fields, so they're one dialog. */
export function FaqDialog({ target, onClose, onSave, isSaving, error }: FaqDialogProps) {
  const entry = target === 'new' ? null : target
  return (
    <ResponsiveDialog
      open={target !== null}
      onOpenChange={(open) => !open && onClose()}
      title={entry ? 'עריכת שאלה נפוצה' : 'שאלה נפוצה חדשה'}
      description="הבוט עונה ללקוחות לפי השאלות והתשובות במאגר."
      footer={
        <DialogActions error={error}>
            <Button type="button" variant="ghost" onClick={onClose}>
              ביטול
            </Button>
            <Button type="submit" form="faq-form" disabled={isSaving} className="min-w-28">
              {isSaving ? 'שומר…' : entry ? 'שמירה' : 'הוספה למאגר'}
            </Button>
        </DialogActions>
      }
    >
      {/* Keyed so opening another entry (or "new") starts from its own text, not the last one's. */}
      {target !== null && <FaqForm key={entry?.id ?? 'new'} entry={entry} onSave={onSave} />}
    </ResponsiveDialog>
  )
}
