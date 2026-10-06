import { useState } from 'react'
import { Edit3, Plus, Trash2 } from '@/components/ui/icon'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { getFaqList, createFaq, updateFaq, deleteFaq } from '@/features/settings/server/settings'
import type { ApiFaqEntry } from '@/features/settings/server/settings'
import { SettingsSection } from '@/features/settings/components/settings-layout'
import { useConfirm } from '#/hooks/useConfirm'
import { useToast } from '@/components/ui/ToastProvider'
import { FaqDialog } from './FaqDialog'

/** Questions customers ask and the answer the bot gives: a list, each entry edited in a dialog. */
export function AiKnowledgeBaseSection() {
  const queryClient = useQueryClient()
  const confirm = useConfirm()
  const { toast } = useToast()
  const [faqTarget, setFaqTarget] = useState<ApiFaqEntry | 'new' | null>(null)
  const { data: entries = [], isLoading } = useQuery<ApiFaqEntry[]>({ queryKey: ['faq-list'], queryFn: () => getFaqList() })

  const saveFaq = useMutation({
    mutationFn: async (body: { question: string; answer: string }) => {
      if (faqTarget && faqTarget !== 'new') await updateFaq({ data: { id: faqTarget.id, ...body } })
      else await createFaq({ data: body })
    },
    onSuccess: () => {
      setFaqTarget(null)
      queryClient.invalidateQueries({ queryKey: ['faq-list'] })
    },
  })

  const removeFaq = useMutation({
    mutationFn: (id: string) => deleteFaq({ data: { id } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['faq-list'] }),
    onError: (err: unknown) => toast('המחיקה נכשלה', err instanceof Error ? err.message : '', 'error'),
  })

  const open = (target: ApiFaqEntry | 'new') => {
    saveFaq.reset()
    setFaqTarget(target)
  }

  const remove = async (entry: ApiFaqEntry) => {
    const ok = await confirm({
      title: 'מחיקת השאלה',
      description: `הבוט לא יענה יותר לפי "${entry.question}".`,
      confirmLabel: 'מחיקה',
      variant: 'destructive',
    })
    if (ok) removeFaq.mutate(entry.id)
  }

  return (
    <SettingsSection
      title="מאגר ידע"
      description="שאלות שלקוחות שואלים, והתשובה שהבוט ייתן להן."
      action={
        <Button type="button" variant="outline" size="sm" onClick={() => open('new')} className="gap-1.5">
          <Plus size={14} />
          הוספה
        </Button>
      }
    >
      {isLoading ? (
        <div className="flex flex-col gap-2 p-4">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : entries.length === 0 ? (
        <p className="px-4 py-6 text-center text-sm text-muted-foreground">
          עוד אין שאלות. כדאי להתחיל ממה שלקוחות שואלים הכי הרבה: טיפול אחרי קעקוע, חניה, שעות פתיחה.
        </p>
      ) : (
        entries.map((entry) => (
          <div key={entry.id} className="group flex items-start gap-3 border-t border-border/70 px-4 py-3.5 first:border-t-0">
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <span className="text-sm font-bold text-foreground">{entry.question}</span>
              <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">{entry.answer}</p>
            </div>
            <div className="flex shrink-0 items-center gap-0.5">
              <button
                type="button"
                onClick={() => open(entry)}
                aria-label={`עריכת "${entry.question}"`}
                className="flex size-8 cursor-pointer items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <Edit3 size={15} />
              </button>
              <button
                type="button"
                onClick={() => remove(entry)}
                aria-label={`מחיקת "${entry.question}"`}
                className="flex size-8 cursor-pointer items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
              >
                <Trash2 size={15} />
              </button>
            </div>
          </div>
        ))
      )}

      <FaqDialog
        target={faqTarget}
        onClose={() => setFaqTarget(null)}
        onSave={(values) => saveFaq.mutate(values)}
        isSaving={saveFaq.isPending}
        error={saveFaq.error instanceof Error ? saveFaq.error.message : null}
      />
    </SettingsSection>
  )
}
