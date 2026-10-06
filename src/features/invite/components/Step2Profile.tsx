import React from 'react'
import { Input } from '@/components/ui/input'
import { Link2 } from '@/components/ui/icon'
import { useInviteUiStore } from '../store/inviteUiStore'
import { useInviteMutations } from '../hooks/useInviteMutations'

export function Step2Profile() {
  const portfolioUrl = useInviteUiStore((s) => s.portfolioUrl)
  const setPortfolioUrl = useInviteUiStore((s) => s.setPortfolioUrl)
  const bio = useInviteUiStore((s) => s.bio)
  const setBio = useInviteUiStore((s) => s.setBio)
  const profileError = useInviteUiStore((s) => s.profileError)
  const setProfileError = useInviteUiStore((s) => s.setProfileError)

  const { saveProfileMutation } = useInviteMutations()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!portfolioUrl.trim()) {
      setProfileError('קישור לאינסטגרם או תיק עבודות הוא שדה חובה')
      return
    }
    setProfileError(null)
    saveProfileMutation.mutate()
  }

  return (
    <form onSubmit={handleSubmit} className="step-body">
      <div className="flex flex-col gap-2">
        <h1 className="step-question text-3xl">פרופיל אמן וסגנונות</h1>
        <p className="step-hint">
          סוכן ה-AI בסטודיו לומד את הסגנון שלך כדי להתאים עבורך לקוחות באופן מדויק.
        </p>
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5 text-start">
          <label className="text-sm font-bold text-foreground">קישור לאינסטגרם או תיק עבודות *</label>
          <div className="flex h-14 w-full items-center gap-2.5 rounded-2xl border border-input bg-card px-4 shadow-xs outline-none transition-all duration-150 ease-native focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/10">
            <Link2 className="size-[18px] shrink-0 text-muted-foreground" />
            <Input
              dir="ltr"
              placeholder="https://instagram.com/your_handle"
              value={portfolioUrl}
              onChange={(e) => {
                setPortfolioUrl(e.target.value)
                if (profileError) setProfileError(null)
              }}
              className="h-full w-full border-0 bg-transparent p-0 text-base shadow-none outline-none focus-visible:ring-0"
            />
          </div>
        </div>

        <div className="flex flex-col gap-1.5 text-start">
          <label className="text-sm font-bold text-foreground">סגנונות קעקועים ותיאור קצר</label>
          <div className="flex min-h-[100px] w-full rounded-2xl border border-input bg-card p-3 shadow-xs outline-none transition-all duration-150 ease-native focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/10">
            <textarea
              rows={4}
              placeholder="לדוגמה: מתמחה ב-Fine Line, ריאליזם שחור-אפור ובוטניקה. עובד בדיוק גבוה וקווים עדינים."
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="w-full resize-none border-0 bg-transparent p-0 text-sm shadow-none outline-none focus-visible:ring-0 text-foreground"
            />
          </div>
        </div>
      </div>

      {profileError && (
        <p className="text-sm font-bold text-destructive">{profileError}</p>
      )}

      <div className="flex-1" />
      <div className="step-footer">
        <button
          type="submit"
          disabled={saveProfileMutation.isPending}
          className="btn-native cursor-pointer"
        >
          {saveProfileMutation.isPending ? 'שומר…' : 'המשך להגדרת שעות פעילות'}
        </button>
      </div>
    </form>
  )
}

