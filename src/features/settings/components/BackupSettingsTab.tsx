import React, { useEffect, useState } from 'react'
import { Save, RefreshCw, Trash2, CheckCircle2, AlertTriangle, Download } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import {
  getBackupSettings,
  saveBackupSettings,
  runBackupNow,
  listBackups,
  deleteBackup,
} from '../server/settings'
import type { BackupSettings, BackupFile } from '../server/settings'
import { useConfirm } from '@/hooks/use-confirm'

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export const BackupSettingsTab: React.FC = () => {
  const queryClient = useQueryClient()
  const confirm = useConfirm()
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  const { data: settings } = useQuery<BackupSettings>({
    queryKey: ['backup-settings'],
    queryFn: () => getBackupSettings(),
  })

  const { data: backups = [] } = useQuery<BackupFile[]>({
    queryKey: ['backups'],
    queryFn: () => listBackups(),
  })

  const [enabled, setEnabled] = useState(true)
  const [intervalHours, setIntervalHours] = useState('24')
  const [retentionCount, setRetentionCount] = useState('7')

  useEffect(() => {
    if (!settings) return
    setEnabled(settings.backupEnabled)
    setIntervalHours(String(settings.backupIntervalHours))
    setRetentionCount(String(settings.backupRetentionCount))
  }, [settings])

  const saveMutation = useMutation({
    mutationFn: () =>
      saveBackupSettings({
        data: {
          backupEnabled: enabled,
          backupIntervalHours: Number(intervalHours),
          backupRetentionCount: Number(retentionCount),
        },
      }),
    onSuccess: () => {
      setError(null)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
      queryClient.invalidateQueries({ queryKey: ['backup-settings'] })
    },
    onError: (err: unknown) =>
      setError(err instanceof Error ? err.message : 'שגיאה בשמירת ההגדרות'),
  })

  const runNowMutation = useMutation({
    mutationFn: () => runBackupNow(),
    onSuccess: () => {
      setError(null)
      queryClient.invalidateQueries({ queryKey: ['backup-settings'] })
      queryClient.invalidateQueries({ queryKey: ['backups'] })
    },
    onError: (err: unknown) =>
      setError(err instanceof Error ? err.message : 'הגיבוי נכשל'),
  })

  const deleteMutation = useMutation({
    mutationFn: (key: string) => deleteBackup({ data: { key } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['backups'] }),
  })

  const intervalInvalid = intervalHours !== '' && (isNaN(Number(intervalHours)) || Number(intervalHours) < 1)
  const retentionInvalid = retentionCount !== '' && (isNaN(Number(retentionCount)) || Number(retentionCount) < 1)

  return (
    <div className="space-y-0 font-assistant text-right" dir="rtl">
      {error && (
        <div className="mb-6 rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-xs font-semibold text-rose-400">
          {error}
        </div>
      )}

      {/* Section 1: Schedule */}
      <div className="grid grid-cols-1 gap-6 border-b border-border/60 py-6 lg:grid-cols-12">
        <div className="space-y-1 lg:col-span-5">
          <h3 className="text-sm md:text-base font-bold text-foreground">תדירות ומדיניות גיבוי</h3>
          <p className="max-w-sm text-xs leading-relaxed text-muted-foreground">
            גיבויים רצים ברקע לפי משתנה סביבה (cron) שבודק כל שעה אם הגיע הזמן — שינוי התדירות
            כאן לא דורש גישה לשרת.
          </p>
        </div>

        <div className="space-y-4 lg:col-span-7">
          <div className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3">
            <div className="flex flex-col gap-0.5">
              <span className="text-xs font-bold text-foreground">גיבוי אוטומטי מופעל</span>
              <span className="text-[10px] text-muted-foreground">כיבוי ישהה את הגיבוי המתוזמן, לא ימחק גיבויים קיימים</span>
            </div>
            <Switch checked={enabled} onCheckedChange={setEnabled} />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">תדירות (שעות)</label>
              <Input
                type="number"
                min={1}
                value={intervalHours}
                onChange={(e) => setIntervalHours(e.target.value)}
                dir="rtl"
                className="bg-white text-foreground border-input text-right"
              />
              <p className="text-[11px] text-muted-foreground">לדוגמה: 24 לגיבוי יומי, 168 לשבועי.</p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">מספר גיבויים לשמירה</label>
              <Input
                type="number"
                min={1}
                value={retentionCount}
                onChange={(e) => setRetentionCount(e.target.value)}
                dir="rtl"
                className="bg-white text-foreground border-input text-right"
              />
              <p className="text-[11px] text-muted-foreground">גיבויים ישנים יותר יימחקו אוטומטית.</p>
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <Button
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending || intervalInvalid || retentionInvalid}
            >
              <Save size={16} className="ml-1.5" />
              {saveMutation.isPending ? 'שומר…' : 'שמור שינויים'}
            </Button>
            {saved && <span className="text-xs font-semibold text-emerald-400">נשמר בהצלחה ✓</span>}
          </div>
        </div>
      </div>

      {/* Section 2: Status + manual run */}
      <div className="grid grid-cols-1 gap-6 border-b border-border/60 py-6 lg:grid-cols-12">
        <div className="space-y-1 lg:col-span-5">
          <h3 className="text-sm md:text-base font-bold text-foreground">גיבוי עכשיו</h3>
          <p className="max-w-sm text-xs leading-relaxed text-muted-foreground">
            הרצה ידנית של גיבוי, ללא קשר לתזמון האוטומטי.
          </p>
        </div>

        <div className="space-y-3 lg:col-span-7">
          <Button
            type="button"
            variant="outline"
            onClick={async () => {
              const ok = await confirm({
                title: 'גיבוי עכשיו',
                description: 'ייווצר גיבוי מלא של נתוני המערכת. פעולה זו עשויה לקחת מספר שניות.',
                confirmLabel: 'גבה עכשיו',
              })
              if (ok) runNowMutation.mutate()
            }}
            disabled={runNowMutation.isPending}
          >
            <RefreshCw size={14} className={`ml-1.5 ${runNowMutation.isPending ? 'animate-spin' : ''}`} />
            {runNowMutation.isPending ? 'מגבה…' : 'גיבוי עכשיו'}
          </Button>

          {settings?.lastBackupAt ? (
            <div className="flex items-center gap-1.5 text-xs">
              {settings.lastBackupOk ? (
                <CheckCircle2 size={13} className="text-emerald-500" />
              ) : (
                <AlertTriangle size={13} className="text-amber-500" />
              )}
              <span className="text-muted-foreground">
                גיבוי אחרון: {new Date(settings.lastBackupAt).toLocaleString('he-IL')}
                {settings.lastBackupOk === false && settings.lastBackupError
                  ? ` — ${settings.lastBackupError}`
                  : ''}
              </span>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">עדיין לא בוצע גיבוי.</p>
          )}
        </div>
      </div>

      {/* Section 3: Backup list */}
      <div className="grid grid-cols-1 gap-6 py-6 lg:grid-cols-12">
        <div className="space-y-1 lg:col-span-5">
          <h3 className="text-sm md:text-base font-bold text-foreground">גיבויים קיימים</h3>
          <p className="max-w-sm text-xs leading-relaxed text-muted-foreground">
            כל הגיבויים השמורים כרגע בשרת.
          </p>
        </div>

        <div className="space-y-2 lg:col-span-7">
          {backups.length === 0 ? (
            <p className="text-[11px] text-muted-foreground">אין גיבויים שמורים.</p>
          ) : (
            <ul className="space-y-1.5">
              {backups.map((b) => (
                <li
                  key={b.key}
                  className="flex items-center justify-between rounded-lg border border-border bg-card px-3 py-2 text-xs shadow-sm"
                >
                  <div className="flex flex-col gap-0.5">
                    <span className="font-mono text-foreground">{b.key}</span>
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(b.modifiedAt).toLocaleString('he-IL')} — {formatSize(b.size)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <a
                      href={`/api/settings/backups/${encodeURIComponent(b.key)}/download`}
                      className="text-primary hover:text-primary/80"
                      aria-label="הורדה"
                      title="הורדת קובץ הגיבוי"
                    >
                      <Download size={14} />
                    </a>
                    <button
                      type="button"
                      onClick={async () => {
                        const ok = await confirm({
                          title: 'מחיקת גיבוי',
                          description: `הקובץ ${b.key} יימחק לצמיתות ולא ניתן יהיה לשחזר אותו.`,
                          confirmLabel: 'מחק',
                          variant: 'destructive',
                        })
                        if (ok) deleteMutation.mutate(b.key)
                      }}
                      disabled={deleteMutation.isPending}
                      className="cursor-pointer text-rose-400 hover:text-rose-300"
                      aria-label="מחיקה"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}

export default BackupSettingsTab
