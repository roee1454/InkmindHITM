import { Download, RotateCcw, Trash2 } from '@/components/ui/icon'
import type { BackupFile } from '@/features/settings/server/settings'

export function formatBackupSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function formatBackupDate(iso: string): string {
  const date = new Date(iso)
  return Number.isNaN(date.getTime()) ? iso : date.toLocaleString('he-IL', { dateStyle: 'medium', timeStyle: 'short' })
}

const ICON_BUTTON = 'flex size-8 cursor-pointer items-center justify-center rounded-lg text-muted-foreground transition-colors'

/** One stored backup: when, how it was made, how big — and download, restore, delete. */
export function BackupFileRow({ backup, onRestore, onDelete }: { backup: BackupFile; onRestore: () => void; onDelete: () => void }) {
  const manual = backup.key.startsWith('backup-manual-')
  return (
    <div className="flex items-center gap-3 border-t border-border/70 px-4 py-3 first:border-t-0">
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-sm font-bold text-foreground">{formatBackupDate(backup.modifiedAt)}</span>
        <span className="flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
          <span>{manual ? 'ידני' : 'אוטומטי'}</span>
          <span aria-hidden>·</span>
          <span dir="ltr" className="tabular-nums">
            {formatBackupSize(backup.size)}
          </span>
        </span>
      </div>
      <div className="flex shrink-0 items-center gap-0.5">
        <a href={`/api/settings/backups/${encodeURIComponent(backup.key)}/download`} aria-label="הורדה" title="הורדה" className={`${ICON_BUTTON} hover:bg-muted hover:text-foreground`}>
          <Download size={15} />
        </a>
        <button type="button" onClick={onRestore} aria-label="שחזור" title="שחזור" className={`${ICON_BUTTON} hover:bg-muted hover:text-foreground`}>
          <RotateCcw size={15} />
        </button>
        <button type="button" onClick={onDelete} aria-label="מחיקה" title="מחיקה" className={`${ICON_BUTTON} hover:bg-destructive/10 hover:text-destructive`}>
          <Trash2 size={15} />
        </button>
      </div>
    </div>
  )
}
