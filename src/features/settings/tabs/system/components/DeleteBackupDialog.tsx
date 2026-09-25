import React from 'react'
import { ResponsiveDialog } from '@/components/ui/responsive-dialog'
import { Button } from '@/components/ui/button'
import { AlertTriangle, Trash2 } from '@/components/ui/icon'
import type { BackupFile } from '@/features/settings/server/settings'

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

interface DeleteBackupDialogProps {
  backup: BackupFile | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (key: string) => void
  isPending: boolean
}

export const DeleteBackupDialog: React.FC<DeleteBackupDialogProps> = ({
  backup,
  open,
  onOpenChange,
  onConfirm,
  isPending,
}) => {
  if (!backup) return null

  const formattedDate = new Date(backup.modifiedAt).toLocaleString('he-IL', {
    dateStyle: 'medium',
    timeStyle: 'short',
  })

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title={
        <div className="flex items-center gap-2 text-destructive font-bold text-base" dir="rtl">
          <Trash2 size={18} />
          <span>מחיקת קובץ גיבוי</span>
        </div>
      }
      description="פעולה זו תמחק לצמיתות את קובץ הגיבוי מאחסון המערכת."
    >
      <div className="flex flex-col gap-4 py-2 font-assistant" dir="rtl">
        <div className="rounded-xl border border-destructive/20 bg-destructive/10 p-3.5 flex items-start gap-2.5 text-xs text-destructive">
          <AlertTriangle size={16} className="shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            לאחר המחיקה לא ניתן יהיה לשחזר נתונים מקובץ גיבוי זה. אנא ודא כי אינך זקוק לו.
          </p>
        </div>

        <div className="rounded-xl border border-border bg-muted/40 p-3 flex flex-col gap-1.5 text-xs">
          <div className="flex justify-between items-center text-muted-foreground">
            <span>מועד יצירת הגיבוי:</span>
            <span className="font-semibold text-foreground">{formattedDate}</span>
          </div>
          <div className="flex justify-between items-center text-muted-foreground">
            <span>גודל הקובץ:</span>
            <span className="font-mono font-medium text-foreground">{formatSize(backup.size)}</span>
          </div>
          <div className="flex justify-between items-center text-muted-foreground">
            <span>שם הקובץ:</span>
            <span className="font-mono text-2xs truncate max-w-[200px] text-foreground" dir="ltr">
              {backup.key}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
            className="rounded-xl font-bold cursor-pointer"
          >
            ביטול
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={() => onConfirm(backup.key)}
            disabled={isPending}
            className="rounded-xl font-bold cursor-pointer gap-1.5"
          >
            <Trash2 size={15} />
            {isPending ? 'מוחק...' : 'מחק גיבוי'}
          </Button>
        </div>
      </div>
    </ResponsiveDialog>
  )
}

export default DeleteBackupDialog

