import React, { useEffect, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Image as ImageIcon } from '@/components/ui/icon'
import { getSettings, updateStudioSettings, uploadStudioLogo } from '@/features/onboarding/server/onboarding'
import { Input } from '@/components/ui/input'
import { ThemeModeControl } from '@/components/ThemeModeControl'
import { SettingsTabSkeleton } from '@/features/settings/components/SettingsTabSkeleton'
import { SectionSaveButton } from '@/features/settings/components/SectionSaveButton'
import { SettingsErrorBanner } from '@/features/settings/components/SettingsErrorBanner'
import { useSavedFlash } from '@/features/settings/hooks/useSavedFlash'

function logoUrl(recordId: string, filename: string): string {
  const base = import.meta.env.VITE_POCKETBASE_URL ?? 'http://127.0.0.1:8090'
  return `${base}/api/files/settings/${recordId}/${encodeURIComponent(filename)}`
}

interface StagedLogo {
  base64: string
  filename: string
  mimeType: string
  previewUrl: string
}

export const GeneralTab: React.FC = () => {
  const queryClient = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { data, isLoading } = useQuery({ queryKey: ['settings'], queryFn: () => getSettings() })
  const { saved, triggerSaved } = useSavedFlash()

  const [studioName, setStudioName] = useState('')
  const [stagedLogo, setStagedLogo] = useState<StagedLogo | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (data?.studio_name) {
      setStudioName(data.studio_name as string)
    }
  }, [data?.studio_name])

  const saveMutation = useMutation({
    mutationFn: async () => {
      setError(null)
      const tasks: Promise<unknown>[] = []

      // 1. Update studio name if changed or present
      if (studioName.trim() && studioName !== data?.studio_name) {
        tasks.push(updateStudioSettings({ data: { studio_name: studioName.trim() } }))
      }

      // 2. Upload staged logo if present
      if (stagedLogo) {
        tasks.push(
          uploadStudioLogo({
            data: {
              base64: stagedLogo.base64,
              filename: stagedLogo.filename,
              mimeType: stagedLogo.mimeType,
            },
          }),
        )
      }

      if (tasks.length === 0) return

      await Promise.all(tasks)
    },
    onSuccess: async () => {
      setStagedLogo(null)
      await queryClient.invalidateQueries({ queryKey: ['settings'] })
      triggerSaved()
    },
    onError: (err: unknown) => {
      setError(err instanceof Error ? err.message : 'שגיאה בשמירת פרטי הסטודיו')
    },
  })

  function handleLogoSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const res = reader.result as string
      setStagedLogo({
        base64: res.split(',')[1] ?? '',
        filename: file.name,
        mimeType: file.type || 'image/png',
        previewUrl: res,
      })
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  if (isLoading) {
    return <SettingsTabSkeleton />
  }

  const currentLogoUrl = stagedLogo?.previewUrl
    ? stagedLogo.previewUrl
    : data?.id && data?.logo
      ? logoUrl(data.id, data.logo as string)
      : null

  const isDirty = (studioName.trim() !== (data?.studio_name || '')) || stagedLogo !== null

  return (
    <div className="flex flex-col gap-6 font-assistant max-w-xl pb-12" dir="rtl">
      <div className="page-head hidden lg:flex">
        <h1>כללי</h1>
        <p>פרטי הסטודיו, מיתוג ומצב תצוגה</p>
      </div>

      <SettingsErrorBanner error={error} onDismiss={() => setError(null)} />

      {/* Card 1: Studio Details & Branding */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-xs flex flex-col gap-6">
        <div className="flex items-center gap-4">
          <input
            type="file"
            ref={fileInputRef}
            accept="image/*"
            className="hidden"
            onChange={handleLogoSelect}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="relative flex size-16 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-full border-2 border-dashed border-border bg-muted/30 text-muted-foreground transition-all hover:border-primary/50"
            title="לחץ לבחירת לוגו"
          >
            {currentLogoUrl ? (
              <img src={currentLogoUrl} alt="לוגו הסטודיו" className="size-full object-cover" />
            ) : (
              <ImageIcon size={24} />
            )}
          </button>
          <div className="flex flex-col gap-1">
            <span className="text-base font-bold text-foreground">לוגו הסטודיו</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="cursor-pointer text-start text-xs font-bold text-primary hover:underline"
              >
                {currentLogoUrl ? 'החלפת תמונה' : 'העלאת לוגו'}
              </button>
              {stagedLogo && (
                <span className="text-2xs font-semibold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-full">
                  ממתין לשמירה
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-muted-foreground">שם הסטודיו</label>
          <Input
            value={studioName}
            onChange={(e) => setStudioName(e.target.value)}
            placeholder="שם הסטודיו"
            className="h-10"
          />
        </div>

        <div className="pt-2 flex justify-start">
          <SectionSaveButton
            onClick={() => saveMutation.mutate()}
            isPending={saveMutation.isPending}
            saved={saved}
            disabled={!isDirty || !studioName.trim()}
          />
        </div>
      </div>

      {/* Card 2: Theme / Display Mode */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-xs flex flex-col gap-3">
        <div className="flex flex-col gap-0.5">
          <span className="text-base font-bold text-foreground">מצב תצוגה</span>
          <span className="text-xs text-muted-foreground">
            ההעדפה נשמרת במכשיר הזה בלבד — לכל אחד בצוות יכולה להיות העדפה משלו.
          </span>
        </div>
        <ThemeModeControl />
      </div>
    </div>
  )
}

export default GeneralTab
