import React, { useEffect, useState } from 'react'
import {
  Save,
  Trash2,
  Clock,
  X,
  AtSign,
  Link as LinkIcon,
  User,
  Copy,
  Info,
  AlertTriangle,
} from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { HourPicker } from '@/components/ui/hour-picker'
import { OptionCardButton } from '@/components/ui/option-card-button'
import {
  getStyleOptions,
  saveArtistProfile,
  deleteArtistProfile,
  getWorkingHours,
  saveWorkingHours,
  type ApiArtistProfile,
  type WorkingHoursWindow,
  type StyleOption,
} from '../server/settings'

export const DAY_LABELS = ['יום א׳', 'יום ב׳', 'יום ג׳', 'יום ד׳', 'יום ה׳', 'יום ו׳', 'שבת']

interface ArtistProfileEditorProps {
  staffId: string
  profile: ApiArtistProfile | undefined
  onSaved: () => void
  readOnly?: boolean
}

const CompactWorkingHoursTimeline: React.FC<{ startTime?: string; endTime?: string }> = ({
  startTime,
  endTime,
}) => {
  const toMins = (t?: string) => {
    if (!t) return 0
    const [h = 0, m = 0] = t.split(':').map(Number)
    return (h || 0) * 60 + (m || 0)
  }

  const startMins = toMins(startTime || '11:00')
  const endMins = toMins(endTime || '19:00')
  const dayStart = 6 * 60 // 06:00
  const dayEnd = 24 * 60 // 24:00
  const total = dayEnd - dayStart

  const right = Math.max(0, Math.min(100, ((startMins - dayStart) / total) * 100))
  const endPercent = Math.max(0, Math.min(100, ((endMins - dayStart) / total) * 100))
  const width = Math.max(0, endPercent - right)

  return (
    <div
      className="relative h-1.5 w-full overflow-hidden rounded-full bg-muted"
      title={`טווח שעות מתוכנן: ${startTime || '11:00'} - ${endTime || '19:00'}`}
    >
      <div
        className="absolute h-full rounded-full bg-primary transition-all duration-300"
        style={{ right: `${right}%`, width: `${width}%` }}
      />
    </div>
  )
}

export const ArtistProfileEditor: React.FC<ArtistProfileEditorProps> = ({
  staffId,
  profile,
  onSaved,
  readOnly = false,
}) => {
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<'profile' | 'hours'>('profile')

  const [styles, setStyles] = useState<string[]>(profile?.styles ?? [])
  const [styleDraft, setStyleDraft] = useState('')
  const [portfolioUrl, setPortfolioUrl] = useState(profile?.portfolioUrl ?? '')
  const [instagramHandle, setInstagramHandle] = useState(profile?.instagramHandle ?? '')
  const [bio, setBio] = useState(profile?.bio ?? '')
  const [error, setError] = useState<string | null>(null)

  const [windows, setWindows] = useState<WorkingHoursWindow[] | null>(null)
  const [savingHours, setSavingHours] = useState(false)
  const [hasUnsavedHours, setHasUnsavedHours] = useState(false)

  const { data: styleOptions = [] } = useQuery<StyleOption[]>({
    queryKey: ['artist-profile-style-options'],
    queryFn: () => getStyleOptions(),
  })
  const styleLabel = (value: string) =>
    styleOptions.find((o) => o.value === value)?.label ?? value

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

  const addStyleValue = (value: string) => {
    if (readOnly || !value || styles.includes(value)) return
    setStyles([...styles, value])
  }

  const addStyleFromDraft = () => {
    if (readOnly) return
    addStyleValue(styleDraft.trim())
    setStyleDraft('')
  }

  const removeStyle = (value: string) => {
    if (readOnly) return
    setStyles(styles.filter((s) => s !== value))
  }

  const saveProfileMutation = useMutation({
    mutationFn: async () => {
      return saveArtistProfile({
        data: {
          id: profile?.id,
          staffId,
          styles,
          portfolioUrl: portfolioUrl || null,
          instagramHandle: instagramHandle || null,
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

  const dayWindow = (dayOfWeek: number) => windows?.find((w) => w.dayOfWeek === dayOfWeek)

  const toggleDay = (dayOfWeek: number) => {
    if (readOnly || !windows) return
    const existing = dayWindow(dayOfWeek)
    setWindows(
      existing
        ? windows.filter((w) => w.dayOfWeek !== dayOfWeek)
        : [...windows, { dayOfWeek, startTime: '11:00', endTime: '19:00' }],
    )
    setHasUnsavedHours(true)
  }

  const updateDayTime = (dayOfWeek: number, field: 'startTime' | 'endTime', value: string) => {
    if (readOnly || !windows) return
    setWindows(windows.map((w) => (w.dayOfWeek === dayOfWeek ? { ...w, [field]: value } : w)))
    setHasUnsavedHours(true)
  }

  const applyPresetToAll = (start: string, end: string) => {
    if (readOnly || !windows) return
    setWindows(windows.map((w) => ({ ...w, startTime: start, endTime: end })))
    setHasUnsavedHours(true)
  }

  const copyHoursToAll = (sourceHours: WorkingHoursWindow) => {
    if (readOnly || !windows) return
    setWindows(
      windows.map((w) => ({
        ...w,
        startTime: sourceHours.startTime || '11:00',
        endTime: sourceHours.endTime || '19:00',
      })),
    )
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
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'שגיאה בשמירת שעות העבודה')
    } finally {
      setSavingHours(false)
    }
  }

  const hasInvalidHours =
    windows?.some((w) => {
      if (!w || !w.startTime || !w.endTime) return false
      const [sh = 0, sm = 0] = (w.startTime || '00:00').split(':').map(Number)
      const [eh = 0, em = 0] = (w.endTime || '00:00').split(':').map(Number)
      return sh * 60 + sm >= eh * 60 + em
    }) ?? false

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
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <OptionCardButton
          icon={<User size={18} />}
          title="שינוי פרופיל"
          description="סגנונות עבודה, אינסטגרם, תיק עבודות ותיאור"
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

      {/* Profile Edit Tab Content */}
      {activeTab === 'profile' && (
        <div className="space-y-5 rounded-2xl border border-border/80 bg-card p-5 shadow-sm">
          {!readOnly && (
            <p className="text-xs text-muted-foreground">
              רק שם וסגנון אחד מספיקים כדי להתחיל — אפשר להשלים את השאר בכל עת.
            </p>
          )}

          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold text-muted-foreground">סגנונות עבודה</label>

            {!readOnly && styleOptions.filter((o) => !styles.includes(o.value)).length > 0 && (
              <div className="flex flex-wrap gap-2">
                {styleOptions
                  .filter((o) => !styles.includes(o.value))
                  .map((o) => (
                    <button
                      key={o.value}
                      type="button"
                      onClick={() => addStyleValue(o.value)}
                      className="cursor-pointer rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary"
                    >
                      + {o.label}
                    </button>
                  ))}
              </div>
            )}

            {/* Custom style input */}
            {!readOnly && (
              <div className="flex gap-2">
                <Input
                  value={styleDraft}
                  onChange={(e) => setStyleDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      addStyleFromDraft()
                    }
                  }}
                  placeholder="סגנון אחר שלא ברשימה — ואז Enter"
                  dir="rtl"
                />
                <Button type="button" variant="outline" onClick={addStyleFromDraft} className="shrink-0">
                  הוסף
                </Button>
              </div>
            )}

            {styles.length > 0 ? (
              <div className="flex flex-wrap gap-2 pt-1">
                {styles.map((s) => (
                  <span
                    key={s}
                    className="flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary"
                  >
                    {styleLabel(s)}
                    {!readOnly && (
                      <button
                        type="button"
                        onClick={() => removeStyle(s)}
                        className="cursor-pointer hover:text-destructive"
                        aria-label={`הסר את הסגנון ${styleLabel(s)}`}
                      >
                        <X size={12} />
                      </button>
                    )}
                  </span>
                ))}
              </div>
            ) : readOnly ? (
              <p className="text-xs text-muted-foreground">לא הוגדרו סגנונות עבודה.</p>
            ) : null}
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <label className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                <AtSign size={13} className="text-muted-foreground" /> אינסטגרם
              </label>
              <Input
                value={instagramHandle}
                onChange={(e) => setInstagramHandle(e.target.value)}
                placeholder="@studio_artist"
                dir="ltr"
                disabled={readOnly}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                <LinkIcon size={13} className="text-muted-foreground" /> קישור לתיק עבודות
              </label>
              <Input
                value={portfolioUrl}
                onChange={(e) => setPortfolioUrl(e.target.value)}
                placeholder="https://…"
                dir="ltr"
                disabled={readOnly}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-muted-foreground">תיאור וסגנון</label>
            <Input
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="לדוגמה: מתמחה בעבודות קו עדין ופרחוניות"
              dir="rtl"
              disabled={readOnly}
            />
          </div>

          {!readOnly && (
            <div className="flex flex-wrap gap-3 pt-2">
              <Button
                onClick={() => saveProfileMutation.mutate()}
                disabled={saveProfileMutation.isPending}
                className="w-full md:w-auto"
              >
                <Save size={13} className="ml-1.5" />
                {saveProfileMutation.isPending ? 'שומר פרופיל…' : 'שמור פרופיל'}
              </Button>

              {profile && (
                <Button
                  onClick={() => {
                    if (window.confirm('האם אתה בטוח שברצונך למחוק את פרופיל המקעקע/ת?')) {
                      deleteProfileMutation.mutate()
                    }
                  }}
                  disabled={deleteProfileMutation.isPending}
                  variant="outline"
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
        <div className="space-y-4 rounded-2xl border border-border/80 bg-card p-5 shadow-sm">
          {windows === null ? (
            <p className="text-xs text-muted-foreground">טוען שעות עבודה…</p>
          ) : (
            <div className="space-y-4">
              {!readOnly && (
                <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border/60 bg-muted/50 p-3">
                  <span className="text-xs font-bold text-muted-foreground">שבלונות מהירות:</span>
                  <button
                    type="button"
                    onClick={() => applyPresetToAll('09:00', '17:00')}
                    disabled={activeDaysCount === 0}
                    className="cursor-pointer rounded-lg border border-border bg-card px-2.5 py-1.5 text-[11px] font-bold text-muted-foreground transition-all hover:border-primary/40 hover:text-primary disabled:opacity-40"
                  >
                    בוקר (09:00 - 17:00)
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPresetToAll('11:00', '19:00')}
                    disabled={activeDaysCount === 0}
                    className="cursor-pointer rounded-lg border border-border bg-card px-2.5 py-1.5 text-[11px] font-bold text-muted-foreground transition-all hover:border-primary/40 hover:text-primary disabled:opacity-40"
                  >
                    צהריים (11:00 - 19:00)
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPresetToAll('12:00', '20:00')}
                    disabled={activeDaysCount === 0}
                    className="cursor-pointer rounded-lg border border-border bg-card px-2.5 py-1.5 text-[11px] font-bold text-muted-foreground transition-all hover:border-primary/40 hover:text-primary disabled:opacity-40"
                  >
                    ערב (12:00 - 20:00)
                  </button>
                </div>
              )}

              {hasUnsavedHours && !hasInvalidHours && !readOnly && (
                <div className="flex items-center gap-2 rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-2.5 text-xs font-semibold text-amber-500">
                  <Info size={14} className="shrink-0" />
                  ישנם שינויים לא שמורים בשעות העבודה. זכור/י ללחוץ על "שמור שעות עבודה".
                </div>
              )}

              {hasInvalidHours && !readOnly && (
                <div className="flex items-center gap-2 rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-2.5 text-xs font-semibold text-rose-400">
                  <AlertTriangle size={14} className="shrink-0" />
                  שגיאה: שעת ההתחלה חייבת להיות מוקדמת משעת הסיום. לא ניתן לשמור שעות לא תקינות.
                </div>
              )}

              <div className="divide-y divide-border/40 overflow-hidden rounded-xl border border-border bg-card shadow-sm">
                {DAY_LABELS.map((label, dayOfWeek) => {
                  const w = dayWindow(dayOfWeek)
                  const active = !!w
                  return (
                    <div
                      key={dayOfWeek}
                      className={`flex h-[52px] items-center justify-between px-3.5 transition-colors duration-150 ${
                        active ? 'bg-card' : 'bg-muted/10'
                      }`}
                    >
                      <div className="flex w-32 shrink-0 items-center gap-3 text-right">
                        <Switch
                          checked={active}
                          onCheckedChange={() => toggleDay(dayOfWeek)}
                          disabled={readOnly}
                        />
                        <span
                          className={`text-sm font-bold ${
                            active ? 'text-foreground' : 'text-muted-foreground/50'
                          }`}
                        >
                          {label}
                        </span>
                      </div>

                      {w ? (
                        <div className="flex flex-1 items-center justify-between gap-4">
                          <div className="flex items-center gap-2">
                            <HourPicker
                              value={w.startTime || '11:00'}
                              onChange={(val) => updateDayTime(dayOfWeek, 'startTime', val)}
                              step={30}
                              hideIcon
                              className="h-8 w-[74px] justify-center px-2.5 text-xs font-bold hover:border-primary/30"
                            />
                            <span className="select-none text-xs font-bold text-muted-foreground/60">
                              עד
                            </span>
                            <HourPicker
                              value={w.endTime || '19:00'}
                              onChange={(val) => updateDayTime(dayOfWeek, 'endTime', val)}
                              step={30}
                              hideIcon
                              className="h-8 w-[74px] justify-center px-2.5 text-xs font-bold hover:border-primary/30"
                            />
                          </div>

                          <div className="hidden max-w-[160px] flex-1 px-2 md:block">
                            <CompactWorkingHoursTimeline
                              startTime={w.startTime || '11:00'}
                              endTime={w.endTime || '19:00'}
                            />
                          </div>

                          {!readOnly && (
                            <button
                              type="button"
                              onClick={() => copyHoursToAll(w)}
                              className="shrink-0 cursor-pointer rounded-lg border border-border p-1.5 text-muted-foreground/70 transition-all hover:border-primary/40 hover:bg-primary/5 hover:text-primary"
                              title="העתק שעות אלו לכל הימים הפעילים"
                            >
                              <Copy size={13} />
                            </button>
                          )}
                        </div>
                      ) : (
                        <div className="flex h-8 flex-1 items-center justify-start text-xs font-medium text-muted-foreground/40">
                          יום חופש / מנוחה
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

              {!readOnly && (
                <Button
                  onClick={handleSaveWorkingHours}
                  disabled={savingHours || windows === null || hasInvalidHours}
                  variant="secondary"
                  className={`w-full md:w-auto ${
                    hasUnsavedHours && !hasInvalidHours
                      ? 'animate-pulse shadow-[0_0_10px_rgba(79,70,229,0.2)]'
                      : ''
                  }`}
                >
                  <Save size={13} className="ml-1.5" />
                  {savingHours ? 'שומר שעות עבודה…' : 'שמור שעות עבודה'}
                </Button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default ArtistProfileEditor
