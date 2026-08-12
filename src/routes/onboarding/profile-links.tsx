import { useEffect, useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AtSign, Globe, Image as ImageIcon } from 'lucide-react'
import { getCurrentSession } from '@/features/auth/server/auth'
import { getArtistProfiles, saveArtistProfile } from '@/features/settings/server/profiles'

export const Route = createFileRoute('/onboarding/profile-links')({
  loader: () => getCurrentSession(),
  component: ProfileLinksStep,
})

function ProfileLinksStep() {
  const session = Route.useLoaderData()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { data: profiles } = useQuery({ queryKey: ['artist-profiles'], queryFn: () => getArtistProfiles() })
  const existing = profiles?.find((p) => p.staffId === session?.staff.id)

  const [instagram, setInstagram] = useState('')
  const [portfolioUrl, setPortfolioUrl] = useState('')
  const [websiteUrl, setWebsiteUrl] = useState('')
  const [bio, setBio] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!existing) return
    setInstagram(existing.instagramHandle ?? '')
    setPortfolioUrl(existing.portfolioUrl ?? '')
    setWebsiteUrl(existing.websiteUrl ?? '')
    setBio(existing.bio ?? '')
  }, [existing?.id])

  const saveMutation = useMutation({
    mutationFn: () =>
      saveArtistProfile({
        data: {
          id: existing?.id,
          staffId: session!.staff.id,
          instagramHandle: instagram,
          portfolioUrl,
          websiteUrl,
          bio,
        },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['artist-profiles'] })
      navigate({ to: '/onboarding/done' })
    },
    onError: (err: unknown) => setError(err instanceof Error ? err.message : 'שגיאה בשמירת הפרופיל'),
  })

  if (!session) return null

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        saveMutation.mutate()
      }}
      className="step-body"
    >
      <div className="flex flex-col gap-2">
        <h1 className="step-question text-[27px]">ספר לנו עליך</h1>
        <p className="step-hint">כדי שהסוכן יפנה לקוחות לתיק העבודות שלך. הכל אופציונלי.</p>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex h-[54px] items-center gap-2.5 rounded-[17px] border border-input/80 bg-card px-4 shadow-xs focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/10">
          <AtSign className="size-[18px] shrink-0 text-muted-foreground" />
          <input
            type="text"
            dir="ltr"
            placeholder="inkmind.tattoo"
            value={instagram}
            onChange={(e) => setInstagram(e.target.value)}
            className="h-full w-full border-0 bg-transparent p-0 text-base outline-none placeholder:text-muted-foreground/50"
          />
        </div>

        <div className="flex h-[54px] items-center gap-2.5 rounded-[17px] border border-input/80 bg-card px-4 shadow-xs focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/10">
          <ImageIcon className="size-[18px] shrink-0 text-muted-foreground" />
          <input
            type="text"
            placeholder="קישור לתיק עבודות"
            value={portfolioUrl}
            onChange={(e) => setPortfolioUrl(e.target.value)}
            className="h-full w-full border-0 bg-transparent p-0 text-base outline-none placeholder:text-muted-foreground/50"
          />
        </div>

        <div className="flex h-[54px] items-center gap-2.5 rounded-[17px] border border-input/80 bg-card px-4 shadow-xs focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/10">
          <Globe className="size-[18px] shrink-0 text-muted-foreground" />
          <input
            type="text"
            placeholder="אתר הסטודיו"
            value={websiteUrl}
            onChange={(e) => setWebsiteUrl(e.target.value)}
            className="h-full w-full border-0 bg-transparent p-0 text-base outline-none placeholder:text-muted-foreground/50"
          />
        </div>

        <textarea
          placeholder="מתמחה בקווי מתאר עדינים ופרחוניות, 8 שנות ניסיון"
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          className="min-h-[82px] w-full rounded-[17px] border border-input/80 bg-card px-4 py-3 text-base leading-relaxed text-foreground shadow-xs outline-none placeholder:text-muted-foreground/50 focus:border-primary focus:ring-4 focus:ring-primary/10"
        />
      </div>

      {error && <p className="text-[13px] font-bold text-destructive">{error}</p>}

      <div className="flex-1" />

      <div className="step-footer">
        <button type="submit" disabled={saveMutation.isPending} className="btn-native">
          {saveMutation.isPending ? 'שומר…' : 'סיום'}
        </button>
      </div>
    </form>
  )
}
