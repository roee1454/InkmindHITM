import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useIMToast } from '@/components/ui/toast'
import { useConfirm } from '@/hooks/useConfirm'
import { queryKeys } from '@/lib/query-keys'
import { resetBotConversation } from '../server/bot-reset'

/** "איפוס שיחת הבוט": confirm, then start the bot's conversation over. */
export function useResetBotConversation(conversationId: string) {
  const confirm = useConfirm()
  const queryClient = useQueryClient()
  const { show: toast } = useIMToast()

  const reset = useMutation({
    mutationFn: () => resetBotConversation({ data: { conversationId } }),
    onSuccess: () => {
      toast({ tone: 'success', title: 'שיחת הבוט אופסה', description: 'ההודעה הבאה של הלקוח תתחיל תיאום חדש.' })
      return queryClient.invalidateQueries({ queryKey: queryKeys.conversations })
    },
    onError: (err) => toast({ tone: 'destructive', title: 'האיפוס נכשל', description: err instanceof Error ? err.message : '' }),
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
