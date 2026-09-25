import React, { useState } from 'react'
import {
  RefreshCw,
  Download,
  AlertTriangle,
  CheckCircle2,
  Database,
  RotateCcw,
  Trash2,
  Clock,
  Upload,
} from '@/components/ui/icon'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getBackupSettings,
  saveBackupSettings,
  runBackupNow,
  listBackups,
  restoreBackup,
  deleteBackup,
} from '@/features/settings/server/settings'
import type { BackupSettings, BackupFile } from '@/features/settings/server/settings'
import { DeleteBackupDialog } from './DeleteBackupDialog'
import { RestoreBackupDialog } from './RestoreBackupDialog'
import { UploadBackupDialog } from './UploadBackupDialog'

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso)
    return d.toLocaleString('he-IL', {
      dateStyle: 'medium',
      timeStyle: 'short',
    })
  } catch {
    return iso
  }
}

const INTERVAL_OPTIONS = [
  { value: '12', label: 'כל 12 שעות' },
  { value: '24', label: 'פעם ביום (כל 24 שעות)' },
  { value: '168', label: 'פעם בשבוע (כל 7 ימים)' },
  { value: '720', label: 'פעם בחודש (כל 30 ימים)' },
]

export const BackupSettingsTab: React.FC = () => {
  const queryClient = useQueryClient()
  const [error, setError] = useState<string | null>(null)
  const [successNotice, setSuccessNotice] = useState<string | null>(null)
  const [backupToDelete, setBackupToDelete] = useState<BackupFile | null>(null)
  const [backupToRestore, setBackupToRestore] = useState<BackupFile | null>(null)
  const [isUploadOpen, setIsUploadOpen] = useState(false)

  const { data: settings } = useQuery<BackupSettings>({
    queryKey: ['backup-settings'],
    queryFn: () => getBackupSettings(),
  })

  const { data: backups = [], isLoading } = useQuery<BackupFile[]>({
    queryKey: ['backups'],
    queryFn: () => listBackups(),
  })

  const saveSettingsMutation = useMutation({
    mutationFn: (vars: { enabled: boolean; intervalHours: number }) =>
      saveBackupSettings({
        data: {
          backupEnabled: vars.enabled,
          backupIntervalHours: vars.intervalHours,
          backupRetentionCount: 1,
        },
      }),
    onSuccess: (_, vars) => {
      setError(null)
      setSuccessNotice(
        vars.enabled
          ? 'הגדרות גיבוי אוטומטי נשמרו. גיבויים קודמים נמחקו לשמירה על שטח האחסון.'
          : 'גיבוי אוטומטי הושבת.',
      )
      setTimeout(() => setSuccessNotice(null), 4000)
      queryClient.invalidateQueries({ queryKey: ['backup-settings'] })
      queryClient.invalidateQueries({ queryKey: ['backups'] })
    },
    onError: (err: unknown) => {
      setError(err instanceof Error ? err.message : 'שגיאה בשמירת הגדרות הגיבוי')
    },
  })

  const runNowMutation = useMutation({
    mutationFn: () => runBackupNow(),
    onSuccess: () => {
      setError(null)
      setSuccessNotice('נוצר גיבוי מלא חדש בהצלחה!')
      setTimeout(() => setSuccessNotice(null), 4000)
      queryClient.invalidateQueries({ queryKey: ['backup-settings'] })
      queryClient.invalidateQueries({ queryKey: ['backups'] })
    },
    onError: (err: unknown) => {
      setSuccessNotice(null)
      setError(err instanceof Error ? err.message : 'הגיבוי נכשל')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (key: string) => deleteBackup({ data: { key } }),
    onSuccess: () => {
      setError(null)
      setBackupToDelete(null)
      setSuccessNotice('קובץ הגיבוי נמחק בהצלחה.')
      setTimeout(() => setSuccessNotice(null), 3000)
      queryClient.invalidateQueries({ queryKey: ['backups'] })
    },
    onError: (err: unknown) => {
      setError(err instanceof Error ? err.message : 'מחיקת הגיבוי נכשלה')
    },
  })

  const restoreMutation = useMutation({
    mutationFn: (key: string) => restoreBackup({ data: { key } }),
    onSuccess: () => {
      setError(null)
      setBackupToRestore(null)
      setSuccessNotice('הנתונים שוחזרו בהצלחה! השרת הופעל מחדש.')
      queryClient.invalidateQueries({ queryKey: ['backups'] })
    },
    onError: (err: unknown) => {
      setError(err instanceof Error ? err.message : 'השחזור נכשל')
    },
  })

  const isAutoEnabled = settings?.backupEnabled ?? false
  const currentInterval = String(settings?.backupIntervalHours ?? 24)

  const handleToggleAutoBackup = (checked: boolean) => {
    saveSettingsMutation.mutate({
      enabled: checked,
      intervalHours: Number(currentInterval),
    })
  }

  const handleIntervalChange = (val: string) => {
    saveSettingsMutation.mutate({
      enabled: isAutoEnabled,
      intervalHours: Number(val),
    })
  }

  return (
    <div className="flex flex-col gap-6 font-assistant" dir="rtl">
      {/* Automatic Backups Card */}
      <div className="flex flex-col gap-4 rounded-xl border border-border/80 bg-muted/20 p-4 sm:p-5">
        <div className="flex items-center justify-between gap-4">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-foreground">גיבוי אוטומטי מתוזמן</h3>
              <span
                className={`rounded-md px-2 py-0.5 text-2xs font-bold ${
                  isAutoEnabled
                    ? 'bg-emerald-500/15 text-emerald-400'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {isAutoEnabled ? 'מופעל' : 'כבוי'}
              </span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              מגבה את נתוני הסטודיו במחזוריות קבועה. כל גיבוי חדש מוחק את הגיבויים שקדמו לו כדי לשמור
              על שטח האחסון בשרת.
            </p>
          </div>

          <Switch
            checked={isAutoEnabled}
            disabled={saveSettingsMutation.isPending}
            onCheckedChange={handleToggleAutoBackup}
            aria-label="הפעל או השבת גיבוי אוטומטי"
          />
        </div>

        {/* Interval Selector (Only when enabled) */}
        {isAutoEnabled && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-border/60">
            <div className="flex items-center gap-2 text-xs font-medium text-foreground">
              <Clock size={15} className="text-primary shrink-0" />
              <span>תדירות גיבוי:</span>
            </div>

            <div className="w-full sm:w-64">
              <Select
                value={currentInterval}
                onValueChange={handleIntervalChange}
                disabled={saveSettingsMutation.isPending}
              >
                <SelectTrigger size="sm" className="h-9 rounded-xl text-xs">
                  <SelectValue placeholder="בחר תדירות" />
                </SelectTrigger>
                <SelectContent>
                  {INTERVAL_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value} className="text-xs">
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
      </div>

      {/* Manual Backup Action Row */}
      {/* Manual Actions Row: Backup Now + Upload Backup */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 rounded-xl border border-border/80 bg-muted/30 p-4">
        <div className="flex flex-col gap-1 text-xs">
          <div className="flex items-center gap-2">
            <span
              className={`flex size-2 rounded-full shrink-0 ${
                settings?.lastBackupOk === false
                  ? 'bg-destructive'
                  : 'bg-emerald-500 animate-pulse'
              }`}
            />
            <span className="font-semibold text-foreground">
              {isAutoEnabled ? 'גיבוי ידני מושבת' : 'גיבוי ידני וייבוא'}
            </span>
          </div>
          <span className="text-muted-foreground text-2xs">
            {isAutoEnabled
              ? 'כאשר גיבוי אוטומטי מופעל, לא ניתן לגבות ידנית (למניעת נפח אחסון עודף).'
              : settings?.lastBackupAt
                ? `גיבוי אחרון: ${formatDate(settings.lastBackupAt)}`
                : 'טרם נוצר גיבוי'}
          </span>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-2.5 w-full sm:w-auto">
          <Button
            type="button"
            variant="outline"
            onClick={() => setIsUploadOpen(true)}
            className="gap-2 rounded-xl font-bold cursor-pointer h-10 w-full sm:w-auto"
          >
            <Upload size={15} className="text-primary" />
            <span>העלאת גיבוי</span>
          </Button>

          <Button
            type="button"
            onClick={() => runNowMutation.mutate()}
            disabled={isAutoEnabled || runNowMutation.isPending}
            className="gap-2 rounded-xl font-bold cursor-pointer h-10 w-full sm:w-auto"
          >
            <RefreshCw size={15} className={runNowMutation.isPending ? 'animate-spin' : ''} />
            <span>
              {runNowMutation.isPending
                ? 'יוצר גיבוי...'
                : isAutoEnabled
                  ? 'גיבוי אוטומטי פעיל'
                  : 'צור גיבוי עכשיו'}
            </span>
          </Button>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="flex items-center justify-between gap-2 rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-xs font-medium text-destructive">
          <div className="flex items-center gap-2">
            <AlertTriangle size={15} className="shrink-0" />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={() => setError(null)}
            className="text-destructive/80 hover:text-destructive text-2xs underline cursor-pointer"
          >
            סגור
          </button>
        </div>
      )}

      {successNotice && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-xs font-semibold text-emerald-400">
          <CheckCircle2 size={15} className="shrink-0" />
          <span>{successNotice}</span>
        </div>
      )}

      {/* Backups List */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-xs font-bold text-foreground">
            קבצי גיבוי שמורים ({isLoading ? '…' : backups.length})
          </h3>
          <span className="text-2xs text-muted-foreground">שמירה מקומית מאובטחת</span>
        </div>

        {isLoading ? (
          <div className="flex flex-col gap-2.5">
            <Skeleton className="h-16 w-full rounded-xl" />
            <Skeleton className="h-16 w-full rounded-xl" />
          </div>
        ) : backups.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2.5 rounded-xl border border-dashed border-border/80 bg-muted/20 py-10 px-4 text-center">
            <div className="flex size-10 items-center justify-center rounded-xl bg-muted text-muted-foreground">
              <Database size={20} />
            </div>
            <p className="text-sm font-semibold text-foreground mt-1">אין גיבויים שמורים במערכת</p>
            <p className="text-xs text-muted-foreground max-w-xs">
              {isAutoEnabled
                ? 'המערכת תיצור גיבוי אוטומטי במועד המתוזמן הקרוב, או שתוכל להעלות קובץ גיבוי קיים.'
                : 'באפשרותך ליצור גיבוי מלא חדש, או להעלות קובץ גיבוי ZIP קיים שהורדת בעבר.'}
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2.5 mt-2">
              <Button
                type="button"
                onClick={() => runNowMutation.mutate()}
                disabled={isAutoEnabled || runNowMutation.isPending}
                className="gap-2 rounded-xl font-bold cursor-pointer h-9 text-xs"
              >
                <RefreshCw size={14} className={runNowMutation.isPending ? 'animate-spin' : ''} />
                <span>צור גיבוי ראשון</span>
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsUploadOpen(true)}
                className="gap-2 rounded-xl font-bold cursor-pointer h-9 text-xs"
              >
                <Upload size={14} className="text-primary" />
                <span>העלה קובץ גיבוי ZIP</span>
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {backups.map((b) => {
              const isManual = b.key.startsWith('backup-manual-')

              return (
                <div
                  key={b.key}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 rounded-xl border border-border/70 bg-card p-3.5 sm:p-4 shadow-2xs transition-colors hover:border-border"
                >
                  {/* Backup Info */}
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary mt-0.5 sm:mt-0">
                      <Database size={17} />
                    </div>
                    <div className="flex flex-col gap-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold text-foreground">
                          {formatDate(b.modifiedAt)}
                        </span>
                        <span
                          className={`rounded-md px-1.5 py-0.5 text-2xs font-bold ${
                            isManual
                              ? 'bg-muted text-muted-foreground'
                              : 'bg-emerald-500/15 text-emerald-400'
                          }`}
                        >
                          {isManual ? 'ידני' : 'אוטומטי'}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-2xs text-muted-foreground">
                        <span className="font-mono">{formatSize(b.size)}</span>
                        <span className="font-mono truncate max-w-[180px] sm:max-w-[240px]" dir="ltr">
                          {b.key}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions Cluster (Mobile-first & Touch-friendly) */}
                  <div className="flex items-center gap-2 self-end sm:self-auto shrink-0 pt-1 sm:pt-0 border-t border-border/40 sm:border-0 w-full sm:w-auto justify-end">
                    <a
                      href={`/api/settings/backups/${encodeURIComponent(b.key)}/download`}
                      aria-label="הורדת קובץ ZIP"
                      title="הורדת קובץ גיבוי למחשב"
                      className="inline-flex size-9 items-center justify-center rounded-lg border border-border bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
                    >
                      <Download size={15} />
                    </a>

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setBackupToRestore(b)}
                      className="h-9 gap-1.5 rounded-lg border-border text-foreground hover:bg-muted font-bold cursor-pointer"
                    >
                      <RotateCcw size={14} className="text-muted-foreground" />
                      <span>שחזור</span>
                    </Button>

                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setBackupToDelete(b)}
                      title="מחק גיבוי"
                      className="size-9 p-0 rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive cursor-pointer"
                    >
                      <Trash2 size={15} />
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <UploadBackupDialog
        open={isUploadOpen}
        onOpenChange={setIsUploadOpen}
        onSuccess={(uploadedKey, autoRestored) => {
          queryClient.invalidateQueries({ queryKey: ['backups'] })
          setSuccessNotice(
            autoRestored
              ? 'קובץ הגיבוי הועלה והמערכת שוחזרה בהצלחה! השרת הופעל מחדש.'
              : `קובץ הגיבוי "${uploadedKey}" הועלה בהצלחה לאחסון המערכת.`,
          )
          setTimeout(() => setSuccessNotice(null), 5000)
        }}
      />

      <DeleteBackupDialog
        backup={backupToDelete}
        open={backupToDelete !== null}
        onOpenChange={(open) => !open && setBackupToDelete(null)}
        onConfirm={(key) => deleteMutation.mutate(key)}
        isPending={deleteMutation.isPending}
      />

      <RestoreBackupDialog
        backup={backupToRestore}
        open={backupToRestore !== null}
        onOpenChange={(open) => !open && setBackupToRestore(null)}
        onConfirm={(key) => restoreMutation.mutate(key)}
        isPending={restoreMutation.isPending}
      />
    </div>
  )
}

export default BackupSettingsTab
