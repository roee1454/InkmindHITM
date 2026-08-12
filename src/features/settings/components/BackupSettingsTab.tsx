import React, { useState } from 'react'
import { RefreshCw, Download, AlertTriangle } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getBackupSettings, runBackupNow, listBackups, restoreBackup } from '../server/settings'
import type { BackupSettings, BackupFile } from '../server/settings'
import { useConfirm } from '@/hooks/use-confirm'
import { SettingsTabSkeleton } from './SettingsTabSkeleton'

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export const BackupSettingsTab: React.FC = () => {
  const queryClient = useQueryClient()
  const confirm = useConfirm()
  const [error, setError] = useState<string | null>(null)

  const { data: settings } = useQuery<BackupSettings>({
    queryKey: ['backup-settings'],
    queryFn: () => getBackupSettings(),
  })

  const { data: backups = [], isLoading } = useQuery<BackupFile[]>({
    queryKey: ['backups'],
    queryFn: () => listBackups(),
  })

  const runNowMutation = useMutation({
    mutationFn: () => runBackupNow(),
    onSuccess: () => {
      setError(null)
      queryClient.invalidateQueries({ queryKey: ['backup-settings'] })
      queryClient.invalidateQueries({ queryKey: ['backups'] })
    },
    onError: (err: unknown) => setError(err instanceof Error ? err.message : 'הגיבוי נכשל'),
  })

  const restoreMutation = useMutation({
    mutationFn: (key: string) => restoreBackup({ data: { key } }),
    onError: (err: unknown) => setError(err instanceof Error ? err.message : 'השחזור נכשל'),
  })

  const handleRestore = async (backup: BackupFile) => {
    const ok = await confirm({
      title: 'שחזור מגיבוי',
      description: `כל הנתונים הנוכחיים יוחלפו בנתוני הגיבוי מ-${new Date(backup.modifiedAt).toLocaleString('he-IL')}. השרת יופעל מחדש. פעולה זו אינה הפיכה.`,
      confirmLabel: 'שחזר',
      variant: 'destructive',
    })
    if (ok) restoreMutation.mutate(backup.key)
  }

  return (
    <div className="flex max-w-xl flex-col gap-5 pb-8 font-assistant" dir="rtl">
      {error && (
        <div className="flex items-center gap-2 rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-xs font-semibold text-rose-500">
          <AlertTriangle size={14} />
          {error}
        </div>
      )}

      <p className="px-1 text-sm font-medium text-muted-foreground">
        גיבוי אוטומטי יומי של כל נתוני הסטודיו
        {settings?.lastBackupAt
          ? ` · גיבוי אחרון: ${new Date(settings.lastBackupAt).toLocaleString('he-IL')}`
          : ''}
      </p>

      <button
        type="button"
        disabled={runNowMutation.isPending}
        onClick={async () => {
          const ok = await confirm({
            title: 'גיבוי עכשיו',
            description: 'ייווצר גיבוי מלא של נתוני המערכת. פעולה זו עשויה לקחת מספר שניות.',
            confirmLabel: 'גבה עכשיו',
          })
          if (ok) runNowMutation.mutate()
        }}
        className="btn-native-ghost h-13 border border-border/80 bg-card !w-full shadow-xs md:!w-auto"
      >
        <RefreshCw size={16} className={runNowMutation.isPending ? 'animate-spin' : ''} />
        {runNowMutation.isPending ? 'מגבה…' : 'גיבוי עכשיו'}
      </button>

      {isLoading ? (
        <SettingsTabSkeleton fields={0} />
      ) : (
        <div className="card-native overflow-hidden">
          {backups.length === 0 ? (
            <div className="flex h-20 items-center justify-center text-xs text-muted-foreground">
              אין גיבויים שמורים
            </div>
          ) : (
            backups.map((b) => (
              <div key={b.key} className="row-native justify-between">
                <div className="min-w-0 flex-1">
                  <div className="text-[14.5px] font-bold text-foreground">
                    {new Date(b.modifiedAt).toLocaleString('he-IL')}
                  </div>
                  <div className="text-[13px] text-muted-foreground">
                    {formatSize(b.size)} · אוטומטי
                  </div>
                </div>
                <a
                  href={`/api/settings/backups/${encodeURIComponent(b.key)}/download`}
                  aria-label="הורדה"
                  title="הורדת קובץ הגיבוי"
                  className="tap-target shrink-0 text-muted-foreground"
                >
                  <Download size={16} />
                </a>
                <button
                  type="button"
                  disabled={restoreMutation.isPending}
                  onClick={() => handleRestore(b)}
                  className="shrink-0 cursor-pointer text-[13.5px] font-extrabold text-primary disabled:opacity-50"
                >
                  שחזור
                </button>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}

export default BackupSettingsTab
