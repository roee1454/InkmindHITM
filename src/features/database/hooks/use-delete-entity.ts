import { useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useToast } from '@/components/ui/ToastProvider'
import { invalidateEntityLists, queryKeys } from '@/lib/query-keys'
import { formatDatabaseError } from '@/lib/pocketbase-error'
import { deleteEntity, getDeleteImpact } from '../server/delete-entity'
import { ENTITY_LABELS, NOT_FOUND_MESSAGE } from '../utils/delete-messages'
import type { DeletableCollection, DeleteEntityResult } from '../types'

interface UseDeleteEntityOptions {
  collection: DeletableCollection
  id: string | null
  open: boolean
  onClose: () => void
  onDeleted?: () => void
}

function removeFromList(queryClient: ReturnType<typeof useQueryClient>, collection: DeletableCollection, id: string) {
  const key = collection === 'staff' ? queryKeys.staffList : queryKeys[collection]
  queryClient.setQueryData<Array<{ id: string }>>(key, (list) => (Array.isArray(list) ? list.filter((item) => item.id !== id) : list))
}

/**
 * Drives the delete dialog: loads the preview, runs the delete, and keeps the cache honest either
 * way. A record that turns out to be gone refreshes the lists that offered it, so the same dead id
 * can't be clicked twice (the loop the old dialog got stuck in).
 */
export function useDeleteEntity({ collection, id, open, onClose, onDeleted }: UseDeleteEntityOptions) {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  const impact = useQuery({
    queryKey: ['delete-impact', collection, id],
    queryFn: () => getDeleteImpact({ data: { collection, id: id ?? '' } }),
    enabled: open && Boolean(id),
    staleTime: 0,
    gcTime: 0,
    retry: false,
  })

  const targetIsGone = impact.data?.status === 'not_found'
  useEffect(() => {
    if (targetIsGone) void invalidateEntityLists(queryClient, collection)
  }, [targetIsGone, collection, queryClient])

  const remove = useMutation({
    mutationFn: () => deleteEntity({ data: { collection, id: id ?? '' } }),
    onSuccess: (result: DeleteEntityResult) => {
      if (result.status === 'deleted' || result.status === 'not_found') {
        if (id) removeFromList(queryClient, collection, id)
        void invalidateEntityLists(queryClient, collection)
      }
      if (result.status === 'deleted') {
        toast('המחיקה הושלמה', `${ENTITY_LABELS[collection]} "${result.label}" נמחק/ה לצמיתות.`, 'success')
        onClose()
        onDeleted?.()
      } else if (result.status === 'not_found') {
        toast('הרשומה כבר לא קיימת', NOT_FOUND_MESSAGE, 'info')
        onClose()
      } else if (result.status === 'blocked') {
        // Something changed since the preview (e.g. an appointment was just booked): show why.
        void impact.refetch()
      }
    },
  })

  const failureMessage =
    remove.data?.status === 'failed'
      ? remove.data.message
      : remove.isError
        ? formatDatabaseError(remove.error, 'מחיקת הרשומה נכשלה. בדקו את החיבור ונסו שוב.')
        : null

  return { impact, remove, failureMessage }
}
