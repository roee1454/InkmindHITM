import type React from 'react'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Button } from '@/components/ui/button'
import { AlertTriangle, Info } from '@/components/ui/icon'
import { formatDatabaseError } from '@/lib/pocketbase-error'
import { cn } from '@/lib/utils'
import { useDeleteEntity } from '../hooks/use-delete-entity'
import { ENTITY_LABELS, FORBIDDEN_MESSAGE, NOT_FOUND_MESSAGE } from '../utils/delete-messages'
import type { DeletableCollection } from '../types'
import { DeleteBlockerNotice } from './DeleteBlockerNotice'
import { DeleteImpactSkeleton, DeleteImpactSummary } from './DeleteImpactSummary'

export interface CascadeDeleteDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  collection: DeletableCollection
  id: string | null
  /** Shown while the preview loads; the server's label replaces it once known. */
  entityName?: string
  onDeleted?: () => void
}

function Notice({ tone, children }: { tone: 'info' | 'error'; children: React.ReactNode }) {
  const Icon = tone === 'error' ? AlertTriangle : Info
  return (
    <div
      className={cn(
        'flex items-start gap-2.5 rounded-lg border p-3 text-xs leading-relaxed',
        tone === 'error' ? 'border-destructive/30 bg-destructive/10 text-destructive' : 'border-border bg-muted/40 text-foreground',
      )}
    >
      <Icon size={16} className="mt-0.5 shrink-0" />
      <div className="flex-1 whitespace-pre-line">{children}</div>
    </div>
  )
}

/**
 * Confirms a delete after showing exactly what it will take with it, as computed by PocketBase's
 * own relation rules (features/database/server/delete-entity.server.ts). Deletion itself is one
 * PocketBase transaction; this dialog never deletes related records on its own.
 */
export function CascadeDeleteDialog({ open, onOpenChange, collection, id, entityName, onDeleted }: CascadeDeleteDialogProps) {
  const { impact, remove, failureMessage } = useDeleteEntity({
    collection,
    id,
    open,
    onClose: () => onOpenChange(false),
    onDeleted,
  })

  const typeLabel = ENTITY_LABELS[collection]
  const preview = impact.data
  const ready = preview?.status === 'ok'
  const blockers = ready ? preview.blockers : []
  const hasCascade = ready && preview.items.some((item) => item.policy === 'cascade')
  const canDelete = ready && blockers.length === 0 && !remove.isPending
  const displayName = (ready && preview.label) || entityName || typeLabel

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`מחיקת ${typeLabel}: ${displayName}`}
      description="המחיקה סופית ואי אפשר לשחזר אותה."
      tone="destructive"
      confirmLabel={hasCascade ? 'מחיקה כולל הנתונים המקושרים' : 'מחיקה'}
      pendingLabel="מוחק…"
      isPending={remove.isPending}
      confirmDisabled={!canDelete}
      hideConfirm={preview?.status === 'not_found'}
      cancelLabel={preview?.status === 'not_found' ? 'סגירה' : 'ביטול'}
      onConfirm={() => remove.mutate()}
    >
      <div className="flex flex-col gap-3">
        {impact.isLoading && <DeleteImpactSkeleton />}

        {impact.isError && (
          <Notice tone="error">
            {formatDatabaseError(impact.error, 'לא הצלחנו לבדוק מה עוד יושפע מהמחיקה.')}
            <Button type="button" variant="link" size="sm" className="block h-auto px-0 pt-1 text-xs" onClick={() => void impact.refetch()}>
              נסה שוב
            </Button>
          </Notice>
        )}

        {preview?.status === 'not_found' && <Notice tone="info">{NOT_FOUND_MESSAGE}</Notice>}
        {preview?.status === 'forbidden' && <Notice tone="error">{FORBIDDEN_MESSAGE}</Notice>}

        {ready && blockers.map((blocker) => <DeleteBlockerNotice key={blocker.code} blocker={blocker} />)}
        {ready && blockers.length === 0 && <DeleteImpactSummary items={preview.items} label={preview.label} />}

        {failureMessage && <Notice tone="error">{failureMessage}</Notice>}
      </div>
    </ConfirmDialog>
  )
}
