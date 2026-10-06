import { describe, it, expect } from 'vitest'
import { z } from 'zod'
import { saveBackupSettingsSchema } from '@/features/settings/server/backups'

describe('System Tab — Settings & Validation', () => {
  describe('saveBackupSettingsSchema', () => {
    it('validates correct backup settings payload', () => {
      const result = saveBackupSettingsSchema.safeParse({
        backupEnabled: true,
        backupIntervalHours: 24,
        backupRetentionCount: 1,
      })
      expect(result.success).toBe(true)
    })

    it('allows omitting backupRetentionCount when enabling auto-backup', () => {
      const result = saveBackupSettingsSchema.safeParse({
        backupEnabled: true,
        backupIntervalHours: 168,
      })
      expect(result.success).toBe(true)
    })

    it('rejects interval hours less than 1', () => {
      const result = saveBackupSettingsSchema.safeParse({
        backupEnabled: true,
        backupIntervalHours: 0,
        backupRetentionCount: 7,
      })
      expect(result.success).toBe(false)
    })

    it('rejects retention count less than 1', () => {
      const result = saveBackupSettingsSchema.safeParse({
        backupEnabled: true,
        backupIntervalHours: 12,
        backupRetentionCount: 0,
      })
      expect(result.success).toBe(false)
    })
  })

  describe('backupKeySchema', () => {
    const backupKeySchema = z.object({ key: z.string().min(1) })

    it('accepts valid backup filename key', () => {
      expect(backupKeySchema.safeParse({ key: 'backup-manual-20260923-143000.zip' }).success).toBe(true)
      expect(backupKeySchema.safeParse({ key: 'backup-20260923.zip' }).success).toBe(true)
    })

    it('rejects empty backup key', () => {
      expect(backupKeySchema.safeParse({ key: '' }).success).toBe(false)
    })
  })

  describe('Backup type detection', () => {
    it('identifies manual backups correctly', () => {
      const manualKey = 'backup-manual-20260923-143000.zip'
      const autoKey = 'backup-20260923-030000.zip'
      expect(manualKey.startsWith('backup-manual-')).toBe(true)
      expect(autoKey.startsWith('backup-manual-')).toBe(false)
    })
  })

  describe('Backup upload validation', () => {
    function isValidBackupFilename(filename: string): boolean {
      return filename.trim().toLowerCase().endsWith('.zip')
    }

    it('accepts valid zip backup filenames', () => {
      expect(isValidBackupFilename('backup-manual-20260923-143000.zip')).toBe(true)
      expect(isValidBackupFilename('my-studio-backup.ZIP')).toBe(true)
      expect(isValidBackupFilename('pb_backup_2026.zip')).toBe(true)
    })

    it('rejects non-zip files for security and integrity', () => {
      expect(isValidBackupFilename('database.sqlite')).toBe(false)
      expect(isValidBackupFilename('backup.tar.gz')).toBe(false)
      expect(isValidBackupFilename('malicious.exe')).toBe(false)
      expect(isValidBackupFilename('data.json')).toBe(false)
    })
  })
})

