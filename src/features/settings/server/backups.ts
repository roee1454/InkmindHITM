import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { requireAuth, requireAdmin, getSettingsRecord } from './helpers.server'

export interface BackupSettings {
  backupEnabled: boolean
  backupIntervalHours: number
  backupRetentionCount: number
  lastBackupAt: string | null
  lastBackupOk: boolean | null
  lastBackupError: string | null
}

export const getBackupSettings = createServerFn({ method: 'GET' }).handler(
  async (): Promise<BackupSettings> => {
    await requireAuth()
    const { record } = await getSettingsRecord()
    return {
      backupEnabled: Boolean(record?.backup_enabled),
      backupIntervalHours: (record?.backup_interval_hours as number) || 24,
      backupRetentionCount: (record?.backup_retention_count as number) || 7,
      lastBackupAt: (record?.last_backup_at as string) || null,
      lastBackupOk: record?.last_backup_ok == null ? null : Boolean(record.last_backup_ok),
      lastBackupError: (record?.last_backup_error as string) || null,
    }
  },
)

const saveBackupSettingsSchema = z.object({
  backupEnabled: z.boolean(),
  backupIntervalHours: z.number().min(1),
  backupRetentionCount: z.number().min(1),
})

export const saveBackupSettings = createServerFn({ method: 'POST' })
  .validator(saveBackupSettingsSchema)
  .handler(async ({ data }) => {
    await requireAdmin()
    const { su, record } = await getSettingsRecord()
    if (!record) throw new Error('רשומת ההגדרות חסרה.')

    await su.collection('settings').update(record.id, {
      backup_enabled: data.backupEnabled,
      backup_interval_hours: data.backupIntervalHours,
      backup_retention_count: data.backupRetentionCount,
    })
    return { ok: true }
  })

export interface BackupFile {
  key: string
  size: number
  modifiedAt: string
}

export const listBackups = createServerFn({ method: 'GET' }).handler(
  async (): Promise<BackupFile[]> => {
    await requireAuth()
    const { su } = await getSettingsRecord()
    const files = await su.backups.getFullList()
    return files
      .map((f) => ({ key: f.key, size: f.size, modifiedAt: f.modified }))
      .sort((a, b) => (a.modifiedAt < b.modifiedAt ? 1 : -1))
  },
)

/** PocketBase backup names must match a lowercase-only pattern — `Date#toISOString()`'s literal
 *  `T`/`Z` characters get rejected with "Must be in a valid format." (confirmed against the
 *  live instance). pocketbase/scripts/backup.sh's `date -u +%Y%m%d-%H%M%S` format sidesteps
 *  this by construction; mirror that shape here instead of ISO. */
function backupTimestamp(): string {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}-${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}`
}

/** Manual "Backup Now" — mirrors pocketbase/scripts/backup.sh's create step so the Settings
 *  UI's last-backup status stays accurate regardless of whether the run was scheduled or manual. */
export const runBackupNow = createServerFn({ method: 'POST' }).handler(async () => {
  await requireAdmin()
  const { su, record } = await getSettingsRecord()
  if (!record) throw new Error('רשומת ההגדרות חסרה.')

  const name = `backup-manual-${backupTimestamp()}.zip`
  try {
    await su.backups.create(name)
    await su.collection('settings').update(record.id, {
      last_backup_at: new Date().toISOString(),
      last_backup_ok: true,
      last_backup_error: '',
    })
    return { ok: true, name }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'שגיאה לא ידועה'
    await su.collection('settings').update(record.id, {
      last_backup_at: new Date().toISOString(),
      last_backup_ok: false,
      last_backup_error: message,
    })
    throw new Error(`הגיבוי נכשל: ${message}`)
  }
})

export const deleteBackup = createServerFn({ method: 'POST' })
  .validator(z.object({ key: z.string() }))
  .handler(async ({ data }) => {
    await requireAdmin()
    const { su } = await getSettingsRecord()
    await su.backups.delete(data.key)
    return { ok: true }
  })
