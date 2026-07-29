import { useState, useEffect } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { getCurrentSession } from '@/features/auth/server/auth'
import {
  getArtistProfile,
  saveArtistProfile,
  getSettings,
  updateStudioSettings,
} from '@/features/onboarding/server/onboarding'
import { StyleTagSelector } from '@/features/onboarding/components/StyleTagSelector'
import { ArrowLeft, ArrowRight, Image as ImageIcon, Building2, User } from 'lucide-react'

export const Route = createFileRoute('/onboarding/profile')({
  loader: () => getCurrentSession(),
  component: ProfileStep,
})

function ProfileStep() {
  const session = Route.useLoaderData()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  // Studio Logo state (base64)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [studioName, setStudioName] = useState('')

  // Artist Profile state
  const [website, setWebsite] = useState('')
  const [instagram, setInstagram] = useState('')
  const [facebook, setFacebook] = useState('')
  const [bio, setBio] = useState('')
  const [styles, setStyles] = useState<string[]>([])

  // Load existing data
  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: () => getSettings(),
  })

  const { data: profile } = useQuery({
    queryKey: ['artist-profile', session?.staff.id],
    queryFn: () => getArtistProfile({ data: { staffId: session!.staff.id } }),
    enabled: Boolean(session?.staff.id),
  })

  useEffect(() => {
    // Load logo from localStorage if present
    const savedLogo = localStorage.getItem('studio_logo')
    if (savedLogo) setLogoPreview(savedLogo)
  }, [])

  useEffect(() => {
    if (settings) {
      setStudioName(settings.studio_name || '')
    }
  }, [settings])

  useEffect(() => {
    if (profile) {
      setWebsite(profile.portfolio_website || '')
      setInstagram(profile.portfolio_instagram || '')
      setFacebook(profile.portfolio_facebook || '')
      setBio(profile.bio || '')
      setStyles(profile.tattoo_styles || [])
    }
  }, [profile])

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = () => {
      const base64 = reader.result as string
      setLogoPreview(base64)
      localStorage.setItem('studio_logo', base64)
    }
    reader.readAsDataURL(file)
  }

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!session) return
      // 1. Save Studio Name to settings
      await updateStudioSettings({
        data: {
          studio_name: studioName || 'אינקמיינד סטודיו',
        },
      })
      // 2. Save Owner Artist Profile
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
      queryClient.invalidateQueries({ queryKey: ['settings'] })
      queryClient.invalidateQueries({ queryKey: ['artist-profile', session?.staff.id] })
      navigate({ to: '/onboarding/hours' })
    },
  })

  if (!session) return null

  return (
    <div className="space-y-6 text-right font-assistant" dir="rtl">
      {/* Section 1: Studio Identity */}
      <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <div className="flex size-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Building2 size={18} />
          </div>
          <div>
            <h2 className="text-base font-bold text-foreground">זהות הסטודיו</h2>
            <p className="text-xs text-muted-foreground">הגדירו את שם הסטודיו והלוגו שלכם שיופיע במערכת</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
          {/* Logo Placeholder / Upload Box */}
          <div className="md:col-span-4 flex flex-col items-center justify-center text-center">
            <label className="group relative flex size-28 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border bg-muted/30 transition-all hover:border-primary hover:bg-primary/5">
              {logoPreview ? (
                <img src={logoPreview} alt="Studio Logo" className="size-full rounded-2xl object-cover p-1" />
              ) : (
                <div className="flex flex-col items-center gap-1.5 p-2">
                  <div className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary transition-transform group-hover:scale-110">
                    <ImageIcon size={20} />
                  </div>
                  <span className="text-[11px] font-bold text-muted-foreground group-hover:text-primary">
                    העלאת לוגו סטודיו
                  </span>
                </div>
              )}
              <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
            </label>
            <span className="text-[10px] text-muted-foreground mt-1.5">לחץ להעלאת לוגו (PNG, JPG, SVG)</span>
          </div>

          {/* Studio Name Input */}
          <div className="md:col-span-8 space-y-2">
            <label className="text-xs font-bold text-foreground block">שם הסטודיו</label>
            <Input
              value={studioName}
              onChange={(e) => setStudioName(e.target.value)}
              placeholder="לדוגמה: INKMIND Tattoo Studio"
              className="h-11 rounded-xl text-sm"
            />
            <p className="text-[11px] text-muted-foreground">שם הסטודיו יוצג ללקוחות שלכם ובהתראות ה-WhatsApp.</p>
          </div>
        </div>
      </div>

      {/* Section 2: Owner Artist Profile */}
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
          onClick={() => navigate({ to: '/onboarding/whatsapp' })}
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
