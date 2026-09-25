import React, { useRef, useState } from 'react'
import { ResponsiveDialog } from '@/components/ui/responsive-dialog'
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
      title={
        <div className="flex items-center gap-2 text-foreground font-bold text-base" dir="rtl">
          <Upload size={18} className="text-primary" />
          <span>העלאת קובץ גיבוי ZIP</span>
        </div>
      }
      description="העלאת קובץ גיבוי שנשמר במחשבך לאחסון המערכת ושחזור אפשרי."
    >
      <div className="flex flex-col gap-4 py-2 font-assistant" dir="rtl">
        {error && (
          <div className="flex items-center gap-2 rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-xs font-semibold text-destructive">
            <AlertTriangle size={15} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

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
            className={`flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed p-6 text-center cursor-pointer transition-colors ${
              isDragging
                ? 'border-primary bg-primary/10'
                : 'border-border/80 bg-muted/20 hover:border-primary/50 hover:bg-muted/30'
            }`}
          >
            <div className="flex size-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground shadow-2xs">
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
          <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-3.5 shadow-2xs">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
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

        {/* Immediate Restore Toggle */}
        <div className="flex flex-col gap-2 rounded-xl border border-border/80 bg-muted/20 p-3.5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex flex-col gap-0.5">
              <span className="text-xs font-bold text-foreground">שחזר נתונים מיד לאחר ההעלאה</span>
              <span className="text-2xs text-muted-foreground">
                אם כבוי, הקובץ יישמר באחסון ויופיע ברשימת הגיבויים בלבד.
              </span>
            </div>
            <Switch
              checked={shouldRestore}
              onCheckedChange={setShouldRestore}
              disabled={isProcessing}
              aria-label="שחזר נתונים מיד"
            />
          </div>

          {shouldRestore && (
            <div className="mt-2 flex items-start gap-2.5 rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-2xs text-destructive leading-relaxed">
              <AlertTriangle size={15} className="shrink-0 mt-0.5" />
              <span>
                <strong>אזהרה:</strong> שחזור מידי יחליף לחלוטין את כל נתוני מסד הנתונים והקבצים
                הקיימים בנתוני הגיבוי שהעלית. השרת יופעל מחדש מיד בסיום התהליך.
              </span>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2.5 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => handleDialogChange(false)}
            disabled={isProcessing}
            className="rounded-xl font-bold cursor-pointer"
          >
            ביטול
          </Button>

          <Button
            type="button"
            variant={shouldRestore ? 'destructive' : 'default'}
            disabled={!selectedFile || isProcessing}
            onClick={handleUpload}
            className="gap-2 rounded-xl font-bold cursor-pointer"
          >
            {shouldRestore ? <RotateCcw size={15} /> : <Upload size={15} />}
            <span>
              {isProcessing
                ? shouldRestore
                  ? 'מעלה ומשחזר נתונים…'
                  : 'מעלה קובץ גיבוי…'
                : shouldRestore
                  ? 'העלה ושחזר עכשיו'
                  : 'העלה לאחסון הגיבויים'}
            </span>
          </Button>
        </div>
      </div>
    </ResponsiveDialog>
  )
}

export default UploadBackupDialog

