import { useState, useEffect } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { getCurrentSession } from '@/features/auth/server/auth'
import { getArtistProfile, saveArtistProfile } from '@/features/onboarding/server/onboarding'
import { StyleTagSelector } from '@/features/onboarding/components/StyleTagSelector'
import { ArrowLeft, ArrowRight, User } from 'lucide-react'

export const Route = createFileRoute('/onboarding/artist-profile')({
  loader: () => getCurrentSession(),
  component: ArtistProfileStep,
})

function ArtistProfileStep() {
  const session = Route.useLoaderData()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [website, setWebsite] = useState('')
  const [instagram, setInstagram] = useState('')
  const [facebook, setFacebook] = useState('')
  const [bio, setBio] = useState('')
  const [styles, setStyles] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)

  const { data: profile } = useQuery({
    queryKey: ['artist-profile', session?.staff.id],
    queryFn: () => getArtistProfile({ data: { staffId: session!.staff.id } }),
    enabled: Boolean(session?.staff.id),
  })

  useEffect(() => {
    if (profile) {
      setWebsite(profile.portfolio_website || '')
      setInstagram(profile.portfolio_instagram || '')
      setFacebook(profile.portfolio_facebook || '')
      setBio(profile.bio || '')
      setStyles(profile.tattoo_styles || [])
    }
  }, [profile])

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!session) return
      await saveArtistProfile({
        data: {
          staffId: session.staff.id,
          portfolio_website: website,
          portfolio_instagram: instagram,
          portfolio_facebook: facebook,
          bio,
          tattoo_styles: styles,
          work_hours: profile?.work_hours || [],
        },
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['artist-profile', session?.staff.id] })
      navigate({ to: '/onboarding/hours' })
    },
    onError: (err: unknown) => {
      setError(err instanceof Error ? err.message : 'שגיאה בשמירת הפרופיל')
    },
  })

  if (!session) return null

  return (
    <div className="space-y-6 text-right font-assistant" dir="rtl">
      {error && <p className="text-xs font-semibold text-rose-500">{error}</p>}

      <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-sm space-y-5">
        <div className="flex items-center gap-2 mb-2">
          <div className="flex size-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <User size={18} />
          </div>
          <div>
            <h2 className="text-base font-bold text-foreground">פרופיל האמן האישי שלך ({session.staff.name || 'בעלים'})</h2>
            <p className="text-xs text-muted-foreground">סגנונות העבודה והקישורים העסקיים שלך</p>
          </div>
        </div>

        {/* Style Tag Selector */}
        <div>
          <label className="text-xs font-bold text-foreground mb-2 block">סגנונות קעקוע בולטים</label>
          <StyleTagSelector value={styles} onChange={setStyles} />
        </div>

        {/* Social & Portfolio Links */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1 block">אתר אינטרנט</label>
            <Input
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              placeholder="https://..."
              dir="ltr"
              className="rounded-xl text-xs"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1 block">אינסטגרם</label>
            <Input
              value={instagram}
              onChange={(e) => setInstagram(e.target.value)}
              placeholder="https://instagram.com/..."
              dir="ltr"
              className="rounded-xl text-xs"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1 block">פייסבוק</label>
            <Input
              value={facebook}
              onChange={(e) => setFacebook(e.target.value)}
              placeholder="https://facebook.com/..."
              dir="ltr"
              className="rounded-xl text-xs"
            />
          </div>
        </div>

        {/* Bio */}
        <div>
          <label className="text-xs font-semibold text-muted-foreground mb-1 block">אודות וביוגרפיה קצרה</label>
          <Textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="מתמחה בקעקועים רציונליים, ריאליזם וקווים עדינים..."
            rows={3}
            className="rounded-xl text-xs resize-none"
          />
        </div>
      </div>

      {/* Action Footer */}
      <div className="flex items-center justify-between pt-2">
        <Button
          variant="outline"
          onClick={() => navigate({ to: '/onboarding/profile' })}
          className="rounded-xl px-5 font-bold cursor-pointer gap-2"
        >
          <ArrowRight size={16} />
          <span>חזרה</span>
        </Button>
        <Button
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending}
          className="rounded-xl px-6 font-bold cursor-pointer gap-2"
        >
          <span>{saveMutation.isPending ? 'שומר פרטים...' : 'המשך לשעות פעילות'}</span>
          <ArrowLeft size={16} />
        </Button>
      </div>
    </div>
  )
}
