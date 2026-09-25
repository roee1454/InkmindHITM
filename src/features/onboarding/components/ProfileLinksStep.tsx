import React, { useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link as LinkIcon } from '@/components/ui/icon'
import { getArtistProfiles, saveArtistProfile } from '@/features/settings/server/profiles'
import { getCurrentSession } from '@/features/auth/server/auth'
import { useOnboardingUiStore } from '../store/onboardingUiStore'
import type { CurrentSession } from '@/features/auth/server/auth'

interface ProfileLinksStepProps {
  session?: CurrentSession | null
}

export function ProfileLinksStep({ session: initialSession }: ProfileLinksStepProps) {
  const queryClient = useQueryClient()

  const { data: sessionData } = useQuery({
    queryKey: ['current-session'],
    queryFn: () => getCurrentSession(),
    enabled: !initialSession,
  })

  const session = initialSession ?? sessionData

  const portfolioUrl = useOnboardingUiStore((s) => s.portfolioUrl)
  const bio = useOnboardingUiStore((s) => s.bio)
  const profileError = useOnboardingUiStore((s) => s.profileError)

  const setPortfolioUrl = useOnboardingUiStore((s) => s.setPortfolioUrl)
  const setBio = useOnboardingUiStore((s) => s.setBio)
  const setProfileError = useOnboardingUiStore((s) => s.setProfileError)
  const nextStep = useOnboardingUiStore((s) => s.nextStep)

  const { data: profiles } = useQuery({
    queryKey: ['artist-profiles'],
    queryFn: () => getArtistProfiles(),
  })
  const existing = profiles?.find((p) => p.staffId === session?.staff?.id)

  useEffect(() => {
    if (!existing) return
    if (existing.portfolioUrl && !portfolioUrl) setPortfolioUrl(existing.portfolioUrl)
    if (existing.bio && !bio) setBio(existing.bio)
  }, [existing, setPortfolioUrl, setBio, portfolioUrl, bio])

  const saveMutation = useMutation({
    mutationFn: async () => {
      const staffId = session?.staff?.id
      if (!staffId) throw new Error('רשומת מנהל חסרה. נא לחזור לשלב הקודם.')
      return saveArtistProfile({
        data: {
          id: existing?.id,
          staffId,
          portfolioUrl: portfolioUrl.trim(),
          bio: bio.trim(),
        },
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['artist-profiles'] })
      nextStep()
    },
    onError: (err: unknown) =>
      setProfileError(err instanceof Error ? err.message : 'שגיאה בשמירת הפרופיל'),
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!portfolioUrl.trim()) {
      setProfileError('קישור לתיק עבודות או אינסטגרם הוא שדה חובה')
      return
    }
    setProfileError(null)
    saveMutation.mutate()
  }

  return (
    <form onSubmit={handleSubmit} className="step-body">
      <div className="flex flex-col gap-2">
        <h1 className="step-question text-3xl">תיק עבודות וקצת עליך</h1>
        <p className="step-hint">
          קישור לתיק עבודות או אינסטגרם ותיאור קצר שיאפשרו לבוט וללקוחות להכיר אותך.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex h-[54px] items-center gap-2.5 rounded-2xl border border-input bg-card px-4 shadow-xs focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/10">
          <LinkIcon className="size-[18px] shrink-0 text-muted-foreground" />
          <input
            type="text"
            dir="ltr"
            placeholder="קישור לתיק עבודות (אינסטגרם, אתר וכו') *"
            value={portfolioUrl}
            onChange={(e) => setPortfolioUrl(e.target.value)}
            className="h-full w-full border-0 bg-transparent p-0 text-base outline-none placeholder:text-muted-foreground/50"
          />
        </div>

        <textarea
          placeholder="מתמחה בקווי מתאר עדינים, ריאליזם, 8 שנות ניסיון..."
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          className="min-h-[82px] w-full rounded-2xl border border-input bg-card px-4 py-3 text-base leading-relaxed text-foreground shadow-xs outline-none placeholder:text-muted-foreground/50 focus:border-primary focus:ring-4 focus:ring-primary/10"
        />
      </div>

      {profileError && <p className="text-sm font-bold text-destructive">{profileError}</p>}

      <div className="flex-1" />

      <div className="step-footer">
        <button type="submit" disabled={saveMutation.isPending} className="btn-native">
          {saveMutation.isPending ? 'שומר…' : 'המשך לשעות פעילות'}
        </button>
      </div>
    </form>
  )
}
