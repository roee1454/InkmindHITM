import { useEffect, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { saveArtistProfile } from '@/features/settings/server/settings'
import type { StaffMember } from '@/features/settings/server/settings'
import { SettingsRow, SettingsSection } from '@/features/settings/components/settings-layout'
import { useSettingsSave } from '@/features/settings/components/settings-save'

/** What customers learn about the artist from the bot: where their work is, and a line about it. */
export function MemberProfileSection({ member, readOnly }: { member: StaffMember; readOnly: boolean }) {
  const queryClient = useQueryClient()
  const [portfolioUrl, setPortfolioUrl] = useState(member.portfolioUrl ?? '')
  const [bio, setBio] = useState(member.bio ?? '')
  const saved = { portfolioUrl: member.portfolioUrl ?? '', bio: member.bio ?? '' }

  useEffect(() => {
    setPortfolioUrl(member.portfolioUrl ?? '')
    setBio(member.bio ?? '')
  }, [member.id, member.portfolioUrl, member.bio])

  const save = useMutation({
    mutationFn: () => saveArtistProfile({ data: { id: member.id, staffId: member.id, portfolioUrl: portfolioUrl.trim() || null, bio: bio.trim() || null } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-list'] })
      queryClient.invalidateQueries({ queryKey: ['artist-profiles'] })
    },
  })

  useSettingsSave(`member-profile-${member.id}`, {
    dirty: !readOnly && (portfolioUrl !== saved.portfolioUrl || bio !== saved.bio),
    save: () => save.mutateAsync(),
    reset: () => {
      setPortfolioUrl(saved.portfolioUrl)
      setBio(saved.bio)
    },
  })

  return (
    <SettingsSection title="פרופיל" description="הבוט משתמש בזה כשלקוח שואל על המקעקע. הכל אופציונלי.">
      <SettingsRow label="תיק עבודות" htmlFor={`portfolio-${member.id}`} hint="אינסטגרם, אתר או כל קישור לעבודות.">
        <Input id={`portfolio-${member.id}`} value={portfolioUrl} onChange={(e) => setPortfolioUrl(e.target.value)} placeholder="https://…" dir="ltr" disabled={readOnly} />
      </SettingsRow>
      <SettingsRow label="תיאור קצר" htmlFor={`bio-${member.id}`} stacked>
        <Textarea
          id={`bio-${member.id}`}
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          placeholder="למשל: מתמחה בקו עדין ופרחים, 8 שנות ניסיון."
          disabled={readOnly}
          className="min-h-20"
        />
      </SettingsRow>
    </SettingsSection>
  )
}
