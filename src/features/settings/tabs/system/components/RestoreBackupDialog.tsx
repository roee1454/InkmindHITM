import React from 'react'
import { ResponsiveDialog } from '@/components/ui/responsive-dialog'
import { Button } from '@/components/ui/button'
import { AlertTriangle, RotateCcw } from '@/components/ui/icon'
import type { BackupFile } from '@/features/settings/server/settings'

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

interface RestoreBackupDialogProps {
  backup: BackupFile | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (key: string) => void
  isPending: boolean
}

export const RestoreBackupDialog: React.FC<RestoreBackupDialogProps> = ({
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
        <div className="flex items-center gap-2 text-foreground font-bold text-base" dir="rtl">
          <RotateCcw size={18} className="text-primary" />
          <span>שחזור נתוני מערכת מגיבוי</span>
        </div>
      }
      description="שחזור יחליף את כל נתוני המערכת בנתוני הגיבוי שנבחר."
    >
      <div className="flex flex-col gap-4 py-2 font-assistant" dir="rtl">
        <div className="rounded-xl border border-destructive/20 bg-destructive/10 p-3.5 flex items-start gap-2.5 text-xs text-destructive">
          <AlertTriangle size={18} className="shrink-0 mt-0.5 text-destructive" />
          <div className="flex flex-col gap-1 leading-relaxed">
            <span className="font-bold">אזהרה: פעולה קריטית ואינה הפיכה!</span>
            <span>
              כל הנתונים שנוצרו לאחר מועד גיבוי זה (תורים, שיחות, לקוחות והודעות) יידרסו לחלוטין.
              השרת יופעל מחדש מיד בסיום השחזור.
            </span>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-muted/40 p-3 flex flex-col gap-1.5 text-xs">
          <div className="flex justify-between items-center text-muted-foreground">
            <span>תאריך הגיבוי לשחזור:</span>
            <span className="font-semibold text-foreground">{formattedDate}</span>
          </div>
          <div className="flex justify-between items-center text-muted-foreground">
            <span>גודל קובץ הגיבוי:</span>
            <span className="font-mono font-medium text-foreground">{formatSize(backup.size)}</span>
          </div>
          <div className="flex justify-between items-center text-muted-foreground">
            <span>מזהה קובץ:</span>
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
            <RotateCcw size={15} />
            {isPending ? 'משחזר נתונים…' : 'החלף נתונים ושחזר'}
          </Button>
        </div>
      </div>
    </ResponsiveDialog>
  )
}

export default RestoreBackupDialog
