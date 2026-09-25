import React from 'react'
import { Trash2 } from '@/components/ui/icon'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { resetConversations } from '@/features/conversations/server/debug'
import { useConfirm } from '#/hooks/useConfirm'

export const AiDevResetCard: React.FC = () => {
  const queryClient = useQueryClient()
  const confirm = useConfirm()

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
      description:
        'פעולה זו תמחק לצמיתות את כל השיחות וההודעות במערכת (לקוחות ותורים יישארו). לא ניתן לבטל פעולה זו.',
      confirmLabel: 'איפוס',
      variant: 'destructive',
    })
    if (ok) resetConversationsMutation.mutate()
  }

  // Only render in dev mode or test
  if (!import.meta.env.DEV) return null

  return (
    <div className="rounded-2xl border border-destructive/25 bg-destructive/5 p-6 shadow-xs flex flex-col gap-3 font-assistant" dir="rtl">
      <div className="flex items-center gap-2 text-destructive">
        <Trash2 size={18} />
        <h3 className="text-sm font-bold">כלי פיתוח — איפוס שיחות והודעות</h3>
      </div>
      <p className="text-xs leading-relaxed text-muted-foreground">
        מוחק לצמיתות את כל השיחות וההודעות במערכת כדי לאפשר בדיקות נקיות של הסוכן. לקוחות ותורים לא נמחקים.
      </p>
      <div className="pt-1">
        <button
          type="button"
          disabled={resetConversationsMutation.isPending}
          onClick={handleResetConversations}
          className="rounded-xl bg-destructive px-4 py-2 text-xs font-bold text-destructive-foreground hover:bg-destructive/90 transition-colors cursor-pointer disabled:opacity-50"
        >
          {resetConversationsMutation.isPending ? 'מאפס…' : 'איפוס כל השיחות וההודעות'}
        </button>
      </div>
      {resetConversationsMutation.isSuccess && (
        <p className="text-xs font-semibold text-emerald-500">
          נמחקו {resetConversationsMutation.data.deletedConversations} שיחות ו-
          {resetConversationsMutation.data.deletedMessages} הודעות.
        </p>
      )}
    </div>
  )
}

