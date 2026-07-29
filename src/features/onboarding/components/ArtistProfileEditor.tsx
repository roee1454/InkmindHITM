import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { StyleTagSelector } from './StyleTagSelector'
import { WorkHoursEditor } from './WorkHoursEditor'
import { getArtistProfile, saveArtistProfile } from '@/features/onboarding/server/onboarding'
import type { WorkHoursWindow } from '@/integrations/pocketbase/types'

interface ArtistProfileEditorProps {
  staffId: string
  onSaved?: () => void
}

export function ArtistProfileEditor({ staffId, onSaved }: ArtistProfileEditorProps) {
  const queryClient = useQueryClient()
  const profileQuery = useQuery({
    queryKey: ['artist-profile', staffId],
    queryFn: () => getArtistProfile({ data: { staffId } }),
  })

  const [website, setWebsite] = useState('')
  const [instagram, setInstagram] = useState('')
  const [facebook, setFacebook] = useState('')
  const [bio, setBio] = useState('')
  const [styles, setStyles] = useState<string[]>([])
  const [workHours, setWorkHours] = useState<WorkHoursWindow[]>([])

  useEffect(() => {
    const profile = profileQuery.data
    if (!profile) return
    setWebsite(profile.portfolio_website ?? '')
    setInstagram(profile.portfolio_instagram ?? '')
    setFacebook(profile.portfolio_facebook ?? '')
    setBio(profile.bio ?? '')
    setStyles(profile.tattoo_styles ?? [])
    setWorkHours(profile.work_hours ?? [])
  }, [profileQuery.data])

  const mutation = useMutation({
    mutationFn: () =>
      saveArtistProfile({
        data: {
          staffId,
          portfolio_website: website,
          portfolio_instagram: instagram,
          portfolio_facebook: facebook,
          bio,
          tattoo_styles: styles,
          work_hours: workHours,
        },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['artist-profile', staffId] })
      onSaved?.()
    },
  })

  if (profileQuery.isLoading) {
    return <p className="text-sm text-muted-foreground">טוען פרופיל…</p>
  }

  return (
    <div className="space-y-6">
      <div>
        <Label className="mb-2 block">סגנונות קעקוע</Label>
        <StyleTagSelector value={styles} onChange={setStyles} />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <Label htmlFor="portfolio_website" className="mb-2 block">
            אתר אינטרנט
          </Label>
          <Input
            id="portfolio_website"
            placeholder="https://…"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="portfolio_instagram" className="mb-2 block">
            Instagram
          </Label>
          <Input
            id="portfolio_instagram"
            placeholder="https://instagram.com/…"
            value={instagram}
            onChange={(e) => setInstagram(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="portfolio_facebook" className="mb-2 block">
            Facebook
          </Label>
          <Input
            id="portfolio_facebook"
            placeholder="https://facebook.com/…"
            value={facebook}
            onChange={(e) => setFacebook(e.target.value)}
          />
        </div>
      </div>

      <div>
        <Label htmlFor="bio" className="mb-2 block">
          ביוגרפיה
        </Label>
        <Textarea id="bio" rows={3} value={bio} onChange={(e) => setBio(e.target.value)} />
      </div>

      <div>
        <Label className="mb-2 block">שעות עבודה</Label>
        <WorkHoursEditor value={workHours} onChange={setWorkHours} />
      </div>

      {mutation.error && (
        <p className="text-sm text-destructive">{mutation.error.message}</p>
      )}

      <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
        {mutation.isPending ? 'שומר…' : 'שמירת פרופיל'}
      </Button>
    </div>
  )
}
