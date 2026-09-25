import React, { useEffect, useState } from 'react'
import {
  Save,
  Trash2,
  Clock,
  Link as LinkIcon,
  User,
  Info,
  AlertTriangle,
} from '@/components/ui/icon'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { OptionCardButton } from '@/components/ui/option-card-button'
import { WeeklyHoursEditor } from '@/components/WeeklyHoursEditor'
import {
  saveArtistProfile,
  deleteArtistProfile,
  getWorkingHours,
  saveWorkingHours,
} from '@/features/settings/server/settings'
import type { ApiArtistProfile, WorkingHoursWindow } from '@/features/settings/server/settings'
import { isValidTimeRange } from '#/lib/working-hours.ts'
import { useConfirm } from '#/hooks/useConfirm'

interface ArtistProfileEditorProps {
  staffId: string
  profile: ApiArtistProfile | undefined
  onSaved: () => void
  readOnly?: boolean
  /** Controlled tab — when set, the parent (e.g. the Team detail screen's 3-tab segmented
   *  control) drives which section shows instead of the built-in selector below. */
  activeTab?: 'profile' | 'hours'
  onTabChange?: (tab: 'profile' | 'hours') => void
  /** Hides the built-in OptionCardButton selector — used when a parent renders its own tabs. */
  hideTabSelector?: boolean
  /** Drops the section's own bordered/shadowed wrapper — used when a parent already supplies
   *  a `.card-native` container, so sections don't nest cards. */
  bare?: boolean
  /** Pins the section's save button to the bottom of the scroll container instead of inline. */
  stickyFooter?: boolean
}

export const ArtistProfileEditor: React.FC<ArtistProfileEditorProps> = ({
  staffId,
  profile,
  onSaved,
  readOnly = false,
  activeTab: controlledTab,
  onTabChange,
  hideTabSelector = false,
  bare = false,
  stickyFooter = false,
}) => {
  const queryClient = useQueryClient()
  const confirm = useConfirm()
  const [internalTab, setInternalTab] = useState<'profile' | 'hours'>('profile')
  const activeTab = controlledTab ?? internalTab
  const setActiveTab = onTabChange ?? setInternalTab
  const sectionClass = bare
    ? 'space-y-5'
    : 'space-y-5 rounded-2xl border border-border bg-card p-5 shadow-sm'
  const footerClass = stickyFooter
    ? 'sticky bottom-0 z-10 -mx-4 mt-2 flex flex-col gap-2 border-t border-border bg-background/95 px-4 py-3 backdrop-blur lg:static lg:mx-0 lg:border-0 lg:bg-transparent lg:px-0 lg:py-0'
    : 'flex flex-wrap gap-3 pt-2'

  const [portfolioUrl, setPortfolioUrl] = useState(profile?.portfolioUrl ?? '')
  const [bio, setBio] = useState(profile?.bio ?? '')
  const [error, setError] = useState<string | null>(null)

  const [windows, setWindows] = useState<WorkingHoursWindow[] | null>(null)
  const [savingHours, setSavingHours] = useState(false)
  const [hasUnsavedHours, setHasUnsavedHours] = useState(false)



  const hoursQuery = useQuery<WorkingHoursWindow[]>({
    queryKey: ['working-hours', staffId],
    queryFn: () => getWorkingHours({ data: { staffId } }),
  })

  useEffect(() => {
    if (hoursQuery.data !== undefined) {
      setWindows(hoursQuery.data)
      setHasUnsavedHours(false)
    }
  }, [hoursQuery.data])

  const saveProfileMutation = useMutation({
    mutationFn: async () => {
      return saveArtistProfile({
        data: {
          id: profile?.id,
          staffId,
          portfolioUrl: portfolioUrl || null,
          bio: bio || null,
        },
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['artist-profiles'] })
      onSaved()
    },
    onError: (err: unknown) => {
      setError(err instanceof Error ? err.message : 'שגיאה בשמירת הפרופיל')
    },
  })

  const deleteProfileMutation = useMutation({
    mutationFn: () => deleteArtistProfile({ data: { id: profile!.id } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['artist-profiles'] })
      onSaved()
    },
    onError: (err: unknown) => {
      setError(err instanceof Error ? err.message : 'שגיאה במחיקת הפרופיל')
    },
  })

  const handleWindowsChange = (next: WorkingHoursWindow[]) => {
    if (readOnly) return
    setWindows(next)
    setHasUnsavedHours(true)
  }

  const handleSaveWorkingHours = async () => {
    if (readOnly || !windows) return
    setSavingHours(true)
    setError(null)
    try {
      const saved = await saveWorkingHours({ data: { staffId, windows } })
      setWindows(saved)
      setHasUnsavedHours(false)
      queryClient.invalidateQueries({ queryKey: ['working-hours', staffId] })
      queryClient.invalidateQueries({ queryKey: ['artist-profiles'] })
    } catch (err: unknown) {
    } finally {
      setSavingHours(false)
    }
  }

  const hasInvalidHours = windows?.some((w) => !isValidTimeRange(w)) ?? false

  const activeDaysCount = windows?.length ?? 0

  return (
    <div className="space-y-6 py-2 font-assistant" dir="rtl">
      {error && <p className="text-xs font-semibold text-destructive">{error}</p>}

      {readOnly && (
        <div className="rounded-xl border border-border bg-muted/50 px-4 py-2 text-xs font-semibold text-muted-foreground">
          צפייה בפרופיל (מצב קריאה בלבד)
        </div>
      )}

      {/* Mode Selector Option Buttons */}
      {!hideTabSelector && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <OptionCardButton
            icon={<User size={18} />}
            title="שינוי פרופיל"
            description="תיק עבודות, תיאור והתמחות"
            active={activeTab === 'profile'}
            onClick={() => setActiveTab('profile')}
          />
          <OptionCardButton
            icon={<Clock size={18} />}
            title="שינוי שעות עבודה"
            description="שעות פעילות שבועיות ושבלונות מהירות"
            badge={activeDaysCount ? `${activeDaysCount} ימים` : undefined}
            active={activeTab === 'hours'}
            onClick={() => setActiveTab('hours')}
          />
        </div>
      )}

      {/* Profile Edit Tab Content */}
      {activeTab === 'profile' && (
        <div className={sectionClass}>
          {!readOnly && (
            <p className="text-xs text-muted-foreground">
              הכל אופציונלי — אפשר להשלים בכל עת.
            </p>
          )}

          <div className="flex flex-col gap-1.5">
            <label className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
              <LinkIcon size={13} className="text-muted-foreground" /> קישור לתיק עבודות
            </label>
            <Input
              value={portfolioUrl}
              onChange={(e) => setPortfolioUrl(e.target.value)}
              placeholder="https://… (אינסטגרם, אתר, תיק עבודות)"
              dir="ltr"
              disabled={readOnly}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-muted-foreground">תיאור קצר</label>
            <Textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="לדוגמה: מתמחה בעבודות קו עדין ופרחוניות, 8 שנות ניסיון"
              dir="rtl"
              disabled={readOnly}
              className="min-h-16"
            />
          </div>

          {!readOnly && (
            <div className={footerClass}>
              <Button
                onClick={() => saveProfileMutation.mutate()}
                disabled={saveProfileMutation.isPending}
                size={stickyFooter ? 'lg' : 'default'}
                className="w-full md:w-auto"
              >
                <Save size={13} className="ml-1.5" />
                {saveProfileMutation.isPending ? 'שומר פרופיל…' : 'שמור פרופיל'}
              </Button>

              {profile && (
                <Button
                  onClick={async () => {
                    const ok = await confirm({
                      title: 'מחיקת פרופיל מקעקע/ת',
                      description: 'הפרופיל, הביוגרפיה והקישורים יימחקו לצמיתות.',
                      confirmLabel: 'מחק',
                      variant: 'destructive',
                    })
                    if (ok) deleteProfileMutation.mutate()
                  }}
                  disabled={deleteProfileMutation.isPending}
                  variant="outline"
                  size={stickyFooter ? 'lg' : 'default'}
                  className="w-full text-muted-foreground hover:border-destructive/30 hover:text-destructive md:w-auto"
                >
                  <Trash2 size={13} className="ml-1.5" />
                  {deleteProfileMutation.isPending ? 'מוחק…' : 'מחק פרופיל'}
                </Button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Working Hours Edit Tab Content */}
      {activeTab === 'hours' && (
        <div className={sectionClass.replace('space-y-5', 'space-y-4')}>
          {windows === null ? (
            <p className="text-xs text-muted-foreground">טוען שעות עבודה…</p>
          ) : (
            <div className="space-y-4">
              {hasUnsavedHours && !hasInvalidHours && !readOnly && (
                <div className="flex items-center gap-2 rounded-xl border border-accent-ink/20 bg-accent-ink/10 px-4 py-2.5 text-xs font-semibold text-accent-ink">
                  <Info size={14} className="shrink-0" />
                  ישנם שינויים לא שמורים בשעות העבודה. זכור/י ללחוץ על "שמור שעות עבודה".
                </div>
              )}

              {hasInvalidHours && !readOnly && (
                <div className="flex items-center gap-2 rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-2.5 text-xs font-semibold text-destructive">
                  <AlertTriangle size={14} className="shrink-0" />
                  שגיאה: שעת ההתחלה חייבת להיות מוקדמת משעת הסיום. לא ניתן לשמור שעות לא תקינות.
                </div>
              )}

              <WeeklyHoursEditor windows={windows} onChange={handleWindowsChange} readOnly={readOnly} />

              {!readOnly && (
                <div className={footerClass}>
                  <Button
                    onClick={handleSaveWorkingHours}
                    disabled={savingHours || windows === null || hasInvalidHours}
                    variant={stickyFooter ? 'default' : 'secondary'}
                    size={stickyFooter ? 'lg' : 'default'}
                    className={`w-full md:w-auto ${
                      hasUnsavedHours && !hasInvalidHours && !stickyFooter
                        ? 'animate-pulse'
                        : ''
                    }`}
                  >
                    <Save size={13} className="ml-1.5" />
                    {savingHours ? 'שומר שעות עבודה…' : 'שמור שעות עבודה'}
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default ArtistProfileEditor
