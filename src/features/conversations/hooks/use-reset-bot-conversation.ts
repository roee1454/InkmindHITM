import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useToast } from '@/components/ui/ToastProvider'
import { useConfirm } from '@/hooks/useConfirm'
import { queryKeys } from '@/lib/query-keys'
import { resetBotConversation } from '../server/bot-reset'

/** "איפוס שיחת הבוט": confirm, then start the bot's conversation over. */
export function useResetBotConversation(conversationId: string) {
  const confirm = useConfirm()
  const queryClient = useQueryClient()
  const { toast } = useToast()

  const reset = useMutation({
    mutationFn: () => resetBotConversation({ data: { conversationId } }),
    onSuccess: () => {
      toast('שיחת הבוט אופסה', 'ההודעה הבאה של הלקוח תתחיל תיאום חדש.', 'success')
      return queryClient.invalidateQueries({ queryKey: queryKeys.conversations })
    },
    onError: (err) => toast('האיפוס נכשל', err instanceof Error ? err.message : '', 'error'),
  })

  return async () => {
    const ok = await confirm({
      title: 'לאפס את שיחת הבוט?',
      description: 'הבוט יתחיל מחדש עם הלקוח: הפרטים שנאספו והפרויקט הפעיל ינותקו מהשיחה. תורים, פרויקטים והיסטוריית ההודעות לא נמחקים.',
      confirmLabel: 'איפוס',
      variant: 'destructive',
    })
    if (ok) reset.mutate()
  }
}
