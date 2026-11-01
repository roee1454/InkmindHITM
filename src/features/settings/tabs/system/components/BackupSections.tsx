import { useState } from 'react'
import { Plus, RefreshCw, Upload } from '@/components/ui/icon'
import { IMButton } from '@/components/ui/button'
import { IMSwitch } from '@/components/ui/switch'
import { IMSelect, IMSelectContent, IMSelectItem, IMSelectTrigger, IMSelectValue } from '@/components/ui/select'
import { IMSkeleton } from '@/components/ui/skeleton'
import { IMConfirmDialog } from '@/components/ui/confirm-dialog'
import { useIMToast } from '@/components/ui/toast'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getBackupSettings, saveBackupSettings, runBackupNow, listBackups, restoreBackup, deleteBackup } from '@/features/settings/server/settings'
import type { BackupSettings, BackupFile } from '@/features/settings/server/settings'
import { SettingsRow, SettingsSection } from '@/features/settings/components/settings-layout'
import { UploadBackupDialog } from './UploadBackupDialog'
import { BackupFileRow, formatBackupDate, formatBackupSize } from './BackupFileRow'

/** What a backup confirmation shows about the file it acts on. */
function backupDetails(backup: BackupFile) {
  return [
    { label: 'נוצר', value: formatBackupDate(backup.modifiedAt) },
    { label: 'גודל', value: <span dir="ltr">{formatBackupSize(backup.size)}</span> },
    { label: 'קובץ', value: <span dir="ltr">{backup.key}</span> },
  ]
}

const INTERVAL_OPTIONS = [
  { value: '12', label: 'כל 12 שעות' },
  { value: '24', label: 'פעם ביום' },
  { value: '168', label: 'פעם בשבוע' },
  { value: '720', label: 'פעם בחודש' },
]

function errorText(err: unknown, fallback: string): string {
  return err instanceof Error ? err.message : fallback
}

/**
 * Backups as two sections: how they're made (automatic or on demand), and the files kept. Outcomes
 * are toasts — they used to be banners that pushed the page around and dismissed themselves.
 */
export function BackupSections() {
  const queryClient = useQueryClient()
  const { show: toast } = useIMToast()
  const [backupToDelete, setBackupToDelete] = useState<BackupFile | null>(null)
  const [backupToRestore, setBackupToRestore] = useState<BackupFile | null>(null)
  const [isUploadOpen, setIsUploadOpen] = useState(false)

  const { data: settings } = useQuery<BackupSettings>({ queryKey: ['backup-settings'], queryFn: () => getBackupSettings() })
  const { data: backups = [], isLoading } = useQuery<BackupFile[]>({ queryKey: ['backups'], queryFn: () => listBackups() })
  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['backup-settings'] })
    queryClient.invalidateQueries({ queryKey: ['backups'] })
  }

  const saveSettings = useMutation({
    mutationFn: (vars: { enabled: boolean; intervalHours: number }) =>
      saveBackupSettings({ data: { backupEnabled: vars.enabled, backupIntervalHours: vars.intervalHours, backupRetentionCount: 1 } }),
    onSuccess: (_, vars) => {
      toast({ tone: 'success', title: vars.enabled ? 'גיבוי אוטומטי מופעל' : 'גיבוי אוטומטי כבוי' })
      refresh()
    },
    onError: (err: unknown) => toast({ tone: 'destructive', title: 'שמירת הגדרות הגיבוי נכשלה', description: errorText(err, '') }),
  })

  const runNow = useMutation({
    mutationFn: () => runBackupNow(),
    onSuccess: () => {
      toast({ tone: 'success', title: 'נוצר גיבוי' })
      refresh()
    },
    onError: (err: unknown) => toast({ tone: 'destructive', title: 'הגיבוי נכשל', description: errorText(err, '') }),
  })

  const deleteMutation = useMutation({
    mutationFn: (key: string) => deleteBackup({ data: { key } }),
    onSuccess: () => {
      setBackupToDelete(null)
      queryClient.invalidateQueries({ queryKey: ['backups'] })
    },
  })

  const restoreMutation = useMutation({
    mutationFn: (key: string) => restoreBackup({ data: { key } }),
    onSuccess: () => {
      setBackupToRestore(null)
      toast({ tone: 'success', title: 'הנתונים שוחזרו', description: 'השרת הופעל מחדש.' })
      queryClient.invalidateQueries({ queryKey: ['backups'] })
    },
  })

  const autoEnabled = settings?.backupEnabled ?? false
  const interval = String(settings?.backupIntervalHours ?? 24)
  const lastBackup = settings?.lastBackupAt ? `הגיבוי האחרון: ${formatBackupDate(settings.lastBackupAt)}${settings.lastBackupOk === false ? ' (נכשל)' : ''}` : 'עוד לא נוצר גיבוי.'

  return (
    <>
      <SettingsSection title="גיבויים" description="גיבוי מלא של הנתונים והקבצים. גיבוי חדש מחליף את הקודם, כדי לא למלא את השרת.">
        <SettingsRow label="גיבוי אוטומטי" hint={autoEnabled ? lastBackup : 'כבוי: גיבוי נוצר רק כשמבקשים.'}>
          <div className="flex justify-end">
            <IMSwitch
              checked={autoEnabled}
              disabled={!settings || saveSettings.isPending}
              onCheckedChange={(checked) => saveSettings.mutate({ enabled: checked, intervalHours: Number(interval) })}
              aria-label="גיבוי אוטומטי"
            />
          </div>
        </SettingsRow>
        {autoEnabled && (
          <SettingsRow label="תדירות">
            <IMSelect value={interval} onValueChange={(v) => saveSettings.mutate({ enabled: true, intervalHours: Number(v) })} disabled={saveSettings.isPending}>
              <IMSelectTrigger className="w-full" aria-label="תדירות">
                <IMSelectValue />
              </IMSelectTrigger>
              <IMSelectContent dir="rtl">
                {INTERVAL_OPTIONS.map((opt) => (
                  <IMSelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </IMSelectItem>
                ))}
              </IMSelectContent>
            </IMSelect>
          </SettingsRow>
        )}
        <SettingsRow label="גיבוי ידני" hint={autoEnabled ? 'לא זמין כשהגיבוי האוטומטי פעיל.' : lastBackup}>
          <div className="flex flex-wrap justify-end gap-2">
            <IMButton type="button" variant="outline" size="sm" onClick={() => setIsUploadOpen(true)} className="gap-1.5">
              <Upload size={14} />
              העלאה
            </IMButton>
            <IMButton type="button" size="sm" onClick={() => runNow.mutate()} disabled={autoEnabled || runNow.isPending} className="gap-1.5">
              <RefreshCw size={14} className={runNow.isPending ? 'animate-spin' : ''} />
              {runNow.isPending ? 'מגבה…' : 'גיבוי עכשיו'}
            </IMButton>
          </div>
        </SettingsRow>
      </SettingsSection>

      <SettingsSection title="קבצים שמורים" description={backups.length > 0 ? `${backups.length} קבצים` : undefined}>
        {isLoading ? (
          <div className="flex flex-col gap-2 p-4">
            <IMSkeleton className="h-10 w-full" />
            <IMSkeleton className="h-10 w-full" />
          </div>
        ) : backups.length === 0 ? (
          <div className="flex flex-col items-center gap-3 px-4 py-8 text-center">
            <p className="text-sm text-muted-foreground">אין גיבויים שמורים. אפשר ליצור גיבוי עכשיו או להעלות קובץ ZIP קיים.</p>
            {!autoEnabled && (
              <IMButton type="button" size="sm" onClick={() => runNow.mutate()} disabled={runNow.isPending} className="gap-1.5">
                <Plus size={14} />
                גיבוי ראשון
              </IMButton>
            )}
          </div>
        ) : (
          backups.map((b) => <BackupFileRow key={b.key} backup={b} onRestore={() => setBackupToRestore(b)} onDelete={() => setBackupToDelete(b)} />)
        )}
      </SettingsSection>

      <UploadBackupDialog
        open={isUploadOpen}
        onOpenChange={setIsUploadOpen}
        onSuccess={(uploadedKey, autoRestored) => {
          queryClient.invalidateQueries({ queryKey: ['backups'] })
          toast({ tone: 'success', title: autoRestored ? 'הגיבוי הועלה והנתונים שוחזרו' : 'הגיבוי הועלה', description: autoRestored ? 'השרת הופעל מחדש.' : uploadedKey })
        }}
      />

      <IMConfirmDialog
        open={backupToDelete !== null}
        onOpenChange={(open) => !open && setBackupToDelete(null)}
        title="מחיקת קובץ הגיבוי"
        description="אי אפשר יהיה לשחזר ממנו אחרי המחיקה."
        details={backupToDelete ? backupDetails(backupToDelete) : undefined}
        variant="destructive"
        confirmLabel="מחיקה"
        pendingLabel="מוחק…"
        isPending={deleteMutation.isPending}
        error={deleteMutation.isError ? errorText(deleteMutation.error, 'המחיקה נכשלה.') : null}
        onConfirm={() => backupToDelete && deleteMutation.mutate(backupToDelete.key)}
      />

      <IMConfirmDialog
        open={backupToRestore !== null}
        onOpenChange={(open) => !open && setBackupToRestore(null)}
        title="שחזור מהגיבוי"
        description="כל מה שנוצר אחרי הגיבוי — תורים, שיחות, לקוחות, הודעות — יימחק, והשרת יופעל מחדש. אי אפשר לבטל."
        details={backupToRestore ? backupDetails(backupToRestore) : undefined}
        variant="destructive"
        confirmLabel="שחזור"
        pendingLabel="משחזר…"
        isPending={restoreMutation.isPending}
        error={restoreMutation.isError ? errorText(restoreMutation.error, 'השחזור נכשל.') : null}
        onConfirm={() => backupToRestore && restoreMutation.mutate(backupToRestore.key)}
      />
    </>
  )
}
