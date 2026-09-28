import React, { useRef, useState } from 'react'
import { DialogActions, ResponsiveDialog } from '@/components/ui/responsive-dialog'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { AlertTriangle, Upload, FileText, X, RotateCcw } from '@/components/ui/icon'
import { restoreBackup } from '@/features/settings/server/settings'

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

interface UploadBackupDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: (uploadedKey: string, autoRestored: boolean) => void
}

export const UploadBackupDialog: React.FC<UploadBackupDialogProps> = ({
  open,
  onOpenChange,
  onSuccess,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [shouldRestore, setShouldRestore] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const resetState = () => {
    setSelectedFile(null)
    setIsDragging(false)
    setShouldRestore(false)
    setIsProcessing(false)
    setError(null)
  }

  const handleDialogChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      resetState()
    }
    onOpenChange(nextOpen)
  }

  const validateAndSetFile = (file: File) => {
    setError(null)
    if (!file.name.toLowerCase().endsWith('.zip')) {
      setError('קובץ לא תקין. יש להעלות קובץ גיבוי בסיומת .zip בלבד.')
      return
    }
    setSelectedFile(file)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) validateAndSetFile(file)
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) validateAndSetFile(file)
  }

  const handleUpload = async () => {
    if (!selectedFile) return

    setIsProcessing(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append('file', selectedFile)

      const response = await fetch('/api/settings/backups/upload', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const errorJson = await response.json().catch(() => null)
        throw new Error(errorJson?.error || `שגיאה בהעלאה (קוד ${response.status})`)
      }

      const result = await response.json()
      const uploadedKey = result.name || selectedFile.name

      // If user selected immediate restore
      if (shouldRestore) {
        await restoreBackup({ data: { key: uploadedKey } })
      }

      onSuccess(uploadedKey, shouldRestore)
      handleDialogChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'העלאת קובץ הגיבוי נכשלה.')
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={handleDialogChange}
      title="העלאת גיבוי"
      description="קובץ ZIP של גיבוי שנשמר אצלך. הוא נשמר ברשימת הגיבויים, ואפשר גם לשחזר ממנו מיד."
      footer={
        <DialogActions error={error}>
          <Button type="button" variant="ghost" onClick={() => handleDialogChange(false)} disabled={isProcessing}>
            ביטול
          </Button>
          <Button
            type="button"
            variant={shouldRestore ? 'destructive' : 'default'}
            disabled={!selectedFile || isProcessing}
            onClick={handleUpload}
            className="min-w-28 gap-1.5"
          >
            {shouldRestore ? <RotateCcw size={15} /> : <Upload size={15} />}
            {isProcessing ? (shouldRestore ? 'מעלה ומשחזר…' : 'מעלה…') : shouldRestore ? 'העלאה ושחזור' : 'העלאה'}
          </Button>
        </DialogActions>
      }
    >
      <div className="form-stack">

        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".zip,application/zip"
          onChange={handleFileChange}
          className="hidden"
        />

        {/* Dropzone */}
        {!selectedFile ? (
          <div
            onDragOver={(e) => {
              e.preventDefault()
              setIsDragging(true)
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed p-6 text-center cursor-pointer transition-colors ${
              isDragging
                ? 'border-primary bg-primary/10'
                : 'border-border/80 bg-muted/20 hover:border-primary/50 hover:bg-muted/30'
            }`}
          >
            <div className="flex size-12 items-center justify-center rounded-lg bg-muted text-muted-foreground">
              <Upload size={22} className="text-primary" />
            </div>
            <div className="flex flex-col gap-1">
              <p className="text-sm font-bold text-foreground">גרור לכאן קובץ גיבוי ZIP</p>
              <p className="text-xs text-muted-foreground">או לחץ כאן לבחירת קובץ מהמחשב</p>
            </div>
            <span className="rounded-md bg-muted px-2 py-0.5 font-medium text-2xs text-muted-foreground">
              סיומת .zip בלבד
            </span>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-3 rounded-lg border border-border p-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                <FileText size={20} />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-bold text-foreground truncate" dir="ltr">
                  {selectedFile.name}
                </span>
                <span className="text-2xs text-muted-foreground font-medium">
                  {formatSize(selectedFile.size)}
                </span>
              </div>
            </div>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={isProcessing}
              onClick={() => setSelectedFile(null)}
              className="size-8 p-0 rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive cursor-pointer"
              title="בחר קובץ אחר"
            >
              <X size={15} />
            </Button>
          </div>
        )}

        <div className="flex flex-col gap-2">
          <label className="flex cursor-pointer items-center justify-between gap-3">
            <span className="flex flex-col">
              <span className="text-sm font-bold text-foreground">לשחזר מיד אחרי ההעלאה</span>
              <span className="text-xs text-muted-foreground">אחרת הקובץ רק נשמר ברשימת הגיבויים.</span>
            </span>
            <Switch checked={shouldRestore} onCheckedChange={setShouldRestore} disabled={isProcessing} aria-label="לשחזר מיד" />
          </label>
          {shouldRestore && (
            <p className="flex items-start gap-2 text-xs font-bold text-destructive">
              <AlertTriangle size={14} className="mt-0.5 shrink-0" />
              השחזור מחליף את כל הנתונים והקבצים בנתוני הגיבוי, והשרת מופעל מחדש. אי אפשר לבטל.
            </p>
          )}
        </div>
      </div>
    </ResponsiveDialog>
  )
}

export default UploadBackupDialog

