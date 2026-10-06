import React, { useEffect, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Image as ImageIcon } from '@/components/ui/icon'
import { getSettings, updateStudioSettings, uploadStudioLogo } from '@/features/onboarding/server/onboarding'
import { Input } from '@/components/ui/input'
import { ThemeModeControl } from '@/components/ThemeModeControl'
import { SettingsTabSkeleton } from '@/features/settings/components/SettingsTabSkeleton'
import { SettingsPage, SettingsRow, SettingsSection } from '@/features/settings/components/settings-layout'
import { useSettingsSave } from '@/features/settings/components/settings-save'

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

function GeneralSettings() {
  const queryClient = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { data, isLoading } = useQuery({ queryKey: ['settings'], queryFn: () => getSettings() })

  const [studioName, setStudioName] = useState('')
  const [stagedLogo, setStagedLogo] = useState<StagedLogo | null>(null)

  useEffect(() => {
    if (data?.studio_name) {
      setStudioName(data.studio_name as string)
    }
  }, [data?.studio_name])

  const saveMutation = useMutation({
    mutationFn: async () => {
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

  const isDirty = studioName.trim() !== (data?.studio_name || '') || stagedLogo !== null
  useSettingsSave('general-studio', {
    dirty: isDirty && Boolean(studioName.trim()),
    save: () => saveMutation.mutateAsync(),
    reset: () => {
      setStudioName((data?.studio_name as string) || '')
      setStagedLogo(null)
    },
  })

  const currentLogoUrl = stagedLogo?.previewUrl
    ? stagedLogo.previewUrl
    : data?.id && data?.logo
      ? logoUrl(data.id, data.logo as string)
      : null

  return (
    <>
      {isLoading ? (
        <SettingsTabSkeleton />
      ) : (
        <>
          <SettingsSection title="הסטודיו" description="השם והלוגו מופיעים במערכת ובהודעות ללקוחות.">
            <SettingsRow label="לוגו" hint={stagedLogo ? 'הלוגו החדש יישמר עם שאר השינויים.' : 'תמונה ריבועית נראית הכי טוב.'}>
              <div className="flex items-center gap-3 sm:justify-end">
                <input type="file" ref={fileInputRef} accept="image/*" className="hidden" onChange={handleLogoSelect} />
                <span className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-muted text-muted-foreground">
                  {currentLogoUrl ? <img src={currentLogoUrl} alt="לוגו הסטודיו" className="size-full object-cover" /> : <ImageIcon size={20} />}
                </span>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="h-9 cursor-pointer rounded-lg border border-border px-3 text-sm font-bold text-foreground transition-colors duration-150 hover:bg-muted"
                >
                  {currentLogoUrl ? 'החלפה' : 'העלאה'}
                </button>
              </div>
            </SettingsRow>
            <SettingsRow label="שם הסטודיו" htmlFor="studio-name">
              <Input id="studio-name" value={studioName} onChange={(e) => setStudioName(e.target.value)} placeholder="שם הסטודיו" />
            </SettingsRow>
          </SettingsSection>

          <SettingsSection title="תצוגה">
            <SettingsRow label="מצב תצוגה" hint="נשמר במכשיר הזה בלבד, כך שלכל אחד בצוות יכולה להיות העדפה משלו.">
              <ThemeModeControl />
            </SettingsRow>
          </SettingsSection>
        </>
      )}
    </>
  )
}

/** The general settings page: the studio's name and logo, and how the app looks on this device. */
export function GeneralTab() {
  return (
    <SettingsPage title="כללי" description="פרטי הסטודיו ותצוגה">
      <GeneralSettings />
    </SettingsPage>
  )
}

export default GeneralTab
