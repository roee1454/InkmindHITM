import React, { useRef } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Image as ImageIcon } from '@/components/ui/icon'
import {
  getSettings,
  updateStudioSettings,
  uploadStudioLogo,
} from '@/features/onboarding/server/onboarding'
import { needsBootstrap } from '@/features/auth/server/auth'
import { useOnboardingUiStore } from '../store/onboardingUiStore'

export function StudioStep() {
  const queryClient = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { data: settings } = useQuery({ queryKey: ['settings'], queryFn: () => getSettings() })

  const studioName = useOnboardingUiStore((s) => s.studioName)
  const hasEditedStudioName = useOnboardingUiStore((s) => s.hasEditedStudioName)
  const studioLogoPreview = useOnboardingUiStore((s) => s.studioLogoPreview)
  const studioError = useOnboardingUiStore((s) => s.studioError)

  const setStudioName = useOnboardingUiStore((s) => s.setStudioName)
  const setStudioLogoPreview = useOnboardingUiStore((s) => s.setStudioLogoPreview)
  const setStudioError = useOnboardingUiStore((s) => s.setStudioError)
  const nextStep = useOnboardingUiStore((s) => s.nextStep)

  const initialStudioName =
    settings?.studio_name && settings.studio_name !== 'My Studio'
      ? (settings.studio_name as string)
      : ''

  const displayName = hasEditedStudioName
    ? studioName
    : studioName || initialStudioName

  const { data: isBootstrapping = true } = useQuery({
    queryKey: ['needs-bootstrap'],
    queryFn: () => needsBootstrap(),
  })

  const setCurrentStep = useOnboardingUiStore((s) => s.setCurrentStep)

  const saveMutation = useMutation({
    mutationFn: async () => {
      await updateStudioSettings({
        data: {
          studio_name: displayName.trim(),
        },
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] })
      if (!isBootstrapping) {
        setCurrentStep(3)
      } else {
        nextStep()
      }
    },
    onError: (err: unknown) =>
      setStudioError(err instanceof Error ? err.message : 'שגיאה בשמירת פרטי הסטודיו'),
  })

  const uploadLogoMutation = useMutation({
    mutationFn: (file: { base64: string; filename: string; mimeType: string }) =>
      uploadStudioLogo({ data: file }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['settings'] }),
  })

  function handleLogoSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const res = reader.result as string
      setStudioLogoPreview(res)
      uploadLogoMutation.mutate({
        base64: res.split(',')[1] ?? '',
        filename: file.name,
        mimeType: file.type || 'image/png',
      })
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = displayName.trim()
    if (!trimmed || trimmed === 'My Studio' || trimmed.length < 2) {
      setStudioError('נא להזין שם סטודיו תקין (לפחות 2 תווים)')
      return
    }
    setStudioError(null)
    saveMutation.mutate()
  }

  return (
    <form onSubmit={handleSubmit} className="step-body">
      <div className="flex flex-col gap-2">
        <h1 className="step-question text-3xl">מה שם הסטודיו שלכם?</h1>
        <p className="step-hint">זה השם שיוצג ללקוחות בהודעות הבוט, והלוגו שייצג את הסטודיו.</p>
      </div>

      <div className="flex flex-col gap-5">
        {/* Studio Name */}
        <div className="flex flex-col gap-1.5 text-start">
          <label className="text-sm font-bold text-foreground">שם הסטודיו *</label>
          <input
            type="text"
            autoFocus
            value={displayName}
            onChange={(e) => {
              setStudioName(e.target.value)
              if (studioError) setStudioError(null)
            }}
            placeholder="למשל: INKMIND Tattoo"
            className="flex h-[56px] w-full items-center rounded-2xl border border-input bg-card px-4 text-lg font-semibold text-foreground shadow-xs outline-none transition-all duration-150 ease-native focus:border-primary focus:ring-4 focus:ring-primary/10"
          />
        </div>

        {/* Studio Logo */}
        <div className="flex items-center gap-3.5 rounded-2xl border border-border bg-card p-3 shadow-xs">
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
            className="flex size-14 shrink-0 cursor-pointer items-center justify-center rounded-full border-2 border-dashed border-border text-muted-foreground transition-colors hover:border-primary"
          >
            {studioLogoPreview ? (
              <img
                src={studioLogoPreview}
                alt="לוגו"
                className="size-full rounded-full object-cover"
              />
            ) : (
              <ImageIcon size={22} />
            )}
          </button>
          <div className="flex min-w-0 flex-col text-start">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="cursor-pointer text-start text-sm font-bold text-foreground"
            >
              {studioLogoPreview ? 'החלפת לוגו' : 'להעלות לוגו לסטודיו?'}
            </button>
            <span className="text-sm text-muted-foreground">
              {studioLogoPreview ? 'הלוגו הועלה בהצלחה' : 'מומלץ תמונה מרובעת או עגולה (לא חובה)'}
            </span>
          </div>
        </div>
      </div>

      {studioError && <p className="text-sm font-bold text-destructive">{studioError}</p>}

      <div className="flex-1" />

      <div className="step-footer">
        <button type="submit" disabled={saveMutation.isPending} className="btn-native">
          {saveMutation.isPending
            ? 'שומר…'
            : isBootstrapping
              ? 'המשך לפתיחת משתמש מנהל'
              : 'המשך להגדרת פרופיל'}
        </button>
      </div>
    </form>
  )
}
