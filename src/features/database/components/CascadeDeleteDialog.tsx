import type React from 'react'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { AlertTriangle, Info, Loader2, Trash2 } from '@/components/ui/icon'
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
        'flex items-start gap-2.5 rounded-xl border p-3.5 text-xs leading-relaxed',
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
    <AlertDialog open={open} onOpenChange={(next) => !remove.isPending && onOpenChange(next)}>
      <AlertDialogContent dir="rtl" className="rounded-2xl border-border bg-card p-6 text-start font-assistant sm:max-w-lg">
        <AlertDialogHeader className="flex flex-col gap-2 text-start">
          <div className="flex items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-destructive/15 text-destructive">
              <Trash2 size={20} />
            </div>
            <div>
              <AlertDialogTitle className="text-lg font-black text-foreground">
                מחיקת {typeLabel}: {displayName}
              </AlertDialogTitle>
              <AlertDialogDescription className="mt-0.5 text-xs text-muted-foreground">
                המחיקה סופית ולא ניתן לשחזר אותה.
              </AlertDialogDescription>
            </div>
          </div>
        </AlertDialogHeader>

        <div className="flex flex-col gap-3 py-2">
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

        <AlertDialogFooter className="flex flex-row items-center justify-end gap-2.5 pt-2">
          <AlertDialogCancel disabled={remove.isPending} className="m-0 cursor-pointer rounded-xl font-bold">
            {preview?.status === 'not_found' ? 'סגירה' : 'ביטול'}
          </AlertDialogCancel>
          {preview?.status !== 'not_found' && (
            <Button
              type="button"
              variant="destructive"
              disabled={!canDelete}
              onClick={() => remove.mutate()}
              className="min-w-[130px] cursor-pointer gap-2 rounded-xl font-bold"
            >
              {remove.isPending ? (
                <>
                  <Loader2 className="animate-spin" size={16} />
                  <span>מוחק…</span>
                </>
              ) : (
                <span>{hasCascade ? 'מחיקה כולל הנתונים המקושרים' : 'מחיקה לצמיתות'}</span>
              )}
            </Button>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
