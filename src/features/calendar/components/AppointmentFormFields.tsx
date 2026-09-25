import React, { useState } from 'react'
import {
  Calendar,
  Coins,
  Paperclip,
  Needle,
  PencilLine,
  Plus,
  PaperPlaneTilt,
  TriangleAlert,
  Image as ImageIcon,
  Receipt,
  CalendarCheck,
  CalendarX,
  ArrowsClockwise,
  Sparkle,
} from '@/components/ui/icon'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { DatePicker } from '@/components/ui/date-picker'
import { HourPicker } from '@/components/ui/hour-picker'
import { ResponsiveDialog } from '@/components/ui/responsive-dialog'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import type { ApiAppointment, ApiGoogleConnection, AppointmentFormValues, AppointmentStatus } from '../types'
import { STATUS_LABELS } from '../types'
import { useWorkingHoursCheck } from '../hooks/useWorkingHoursCheck'
import { formatDuration } from '@/features/conversations/utils/format'
import { cn } from '@/lib/utils'
import { useToast } from '@/components/ui/ToastProvider'
import { retrySyncAppointmentToGoogle } from '../server/appointments'
import { formatPhoneForDisplay } from '@/lib/phone'
import { HealthDeclarationViewer } from '@/features/health-declaration/components/HealthDeclarationViewer'
import { HealthDeclarationDialog } from '@/features/health-declaration/components/HealthDeclarationDialog'

const NO_ARTIST = 'none'

// 30-minute increments, 30 minutes to 8 hours.
const DURATION_OPTIONS = Array.from({ length: 16 }, (_, i) => (i + 1) * 30)

interface StaffItem {
  id: string
  name: string
  avatar?: string
}

interface AppointmentFormFieldsProps {
  values: AppointmentFormValues
  onChange: (patch: Partial<AppointmentFormValues>) => void
  staff: StaffItem[]
  googleConnections: ApiGoogleConnection[]
  appointment?: ApiAppointment | null
  onSendQuote?: (priceMinIls: number, priceMaxIls: number, depositAmount: number, durationMinutes: number) => void
  isSendingQuote?: boolean
  onOpenGallery?: (images: string[], index: number) => void
  isEdit?: boolean
  readOnly?: boolean
}

export const AppointmentFormFields: React.FC<AppointmentFormFieldsProps> = ({
  values,
  onChange,
  staff,
  googleConnections,
  appointment,
  onSendQuote,
  isSendingQuote = false,
  onOpenGallery,
  isEdit = false,
  readOnly = false,
}) => {
  const { toast } = useToast()
  const closesViaCloseOut = Boolean(isEdit && appointment && appointment.kind !== 'consultation' && appointment.status !== 'completed')
  const [noCalendarArtistName, setNoCalendarArtistName] = useState<string | null>(null)
  const [showNotes, setShowNotes] = useState<boolean>(Boolean(values.notes && values.notes.trim().length > 0))
  const [isRetryingSync, setIsRetryingSync] = useState(false)
  const [localSyncStatus, setLocalSyncStatus] = useState<'synced' | 'push_failed' | null | undefined>(
    appointment?.googleSyncStatus,
  )
  const [healthDialogOpen, setHealthDialogOpen] = useState(false)

  const handleRetryGoogleSync = async () => {
    if (!appointment?.id) return
    setIsRetryingSync(true)
    try {
      const res = await retrySyncAppointmentToGoogle({ data: { appointmentId: appointment.id } })
      if (res.ok) {
        setLocalSyncStatus('synced')
        toast('סנכרון יומן', 'התור סונכרן בהצלחה ל-Google Calendar!', 'success')
      } else {
        setLocalSyncStatus('push_failed')
        toast('שגיאת סנכרון', 'הסנכרון ליומן גוגל נכשל. ודא/י שהמקעקע חיבר יומן גוגל.', 'warning')
      }
    } catch {
      toast('שגיאה', 'אירעה שגיאה בלתי צפויה בביצוע הסנכרון.', 'error')
    } finally {
      setIsRetryingSync(false)
    }
  }

  const { fitsWorkingHours, isStudioClosed, closureReason } = useWorkingHoursCheck(
    values.staffId,
    values.date,
    values.timeSlot,
    values.durationMinutes / 60,
  )

  const refImages = appointment?.referenceImages ?? values.referenceImages ?? []
  const hasReceipt = Boolean(appointment?.paymentReceiptUrl ?? values.paymentReceiptUrl)
  const hasHealthDeclaration = Boolean(
    (appointment?.healthDeclarationSigned ?? values.healthDeclarationSigned) ||
    (appointment?.healthDeclarationFileUrl ?? values.healthDeclarationFileUrl)
  )
  const docCount = (refImages.length > 0 ? 1 : 0) + (hasReceipt ? 1 : 0) + (hasHealthDeclaration ? 1 : 0)

  const isSketch = values.type === 'sketch'

  return (
    <div className="space-y-4 font-assistant text-right" dir="rtl">
      <Tabs defaultValue="details" dir="rtl" className="w-full text-right">
        {/* Navigation Tabs */}
        <TabsList className="grid grid-cols-3 mb-3 bg-muted/60 p-1 rounded-2xl" dir="rtl">
          <TabsTrigger value="details" className="flex items-center justify-center gap-1.5 text-xs font-extrabold cursor-pointer">
            <Calendar size={14} className="shrink-0" />
            <span>פרטים</span>
          </TabsTrigger>
          <TabsTrigger value="pricing" className="flex items-center justify-center gap-1.5 text-xs font-extrabold cursor-pointer">
            <Coins size={14} className="shrink-0" />
            <span>תמחור וסטטוס</span>
          </TabsTrigger>
          <TabsTrigger value="documents" className="flex items-center justify-center gap-1.5 text-xs font-extrabold cursor-pointer relative">
            <Paperclip size={14} className="shrink-0" />
            <span>מסמכים</span>
            {docCount > 0 && (
              <span className="ms-1 py-0.5 px-1 rounded-full text-micro bg-primary/20 text-primary font-black">
                {docCount}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* 1. Tab Details */}
        <TabsContent value="details" className="space-y-3.5 focus-visible:outline-none text-right" dir="rtl">
          {/* Customer & Appointment Type Summary Card (Read-Only) */}
          <div className="rounded-2xl border border-border bg-muted/30 p-3.5 flex items-center justify-between text-right" dir="rtl">
            <div className="flex items-center gap-2.5">
              <div className="size-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-extrabold text-xs shrink-0">
                {(values.leadName || 'ל')[0]}
              </div>
              <div className="flex flex-col text-right">
                <span className="text-xs font-extrabold text-foreground">{values.leadName || 'לקוח ללא שם'}</span>
                <span className="text-mini text-muted-foreground font-assistant dir-ltr text-right">{formatPhoneForDisplay(values.leadPhone) || '—'}</span>
              </div>
            </div>
            <div className="flex flex-col items-end gap-1 shrink-0 text-end">
              <span
                className={cn(
                  'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-extrabold border',
                  isSketch
                    ? 'bg-accent-ink/15 text-accent-ink border-accent-ink/30'
                    : 'bg-primary/15 text-primary border-primary/30',
                )}
              >
                {isSketch ? (
                  <>
                    <PencilLine size={12} />
                    <span>פגישת סקיצה / ייעוץ</span>
                  </>
                ) : (
                  <>
                    <Needle size={12} />
                    <span>סשן קעקוע</span>
                  </>
                )}
              </span>
            </div>
          </div>

          {/* Schedule details: Date & Time */}
          <div className="grid grid-cols-2 gap-3 text-right" dir="rtl">
            <div className="flex flex-col gap-1.5 text-right" dir="rtl">
              <label className="text-xs font-semibold text-foreground text-right">תאריך *</label>
              <DatePicker
                value={values.date}
                onChange={(ymd) => onChange({ date: ymd })}
                disabled={readOnly}
              />
            </div>
            <div className="flex flex-col gap-1.5 text-right" dir="rtl">
              <label className="text-xs font-semibold text-foreground text-right">שעה *</label>
              <HourPicker
                value={values.timeSlot}
                onChange={(time) => onChange({ timeSlot: time })}
                disabled={readOnly}
              />
            </div>
          </div>

          {/* Staff & Duration */}
          <div className="grid grid-cols-2 gap-3 text-right" dir="rtl">
            <div className="flex flex-col gap-1.5 text-right" dir="rtl">
              <label className="text-xs font-semibold text-foreground text-right">מקעקע</label>
              <Select
                dir="rtl"
                disabled={readOnly}
                value={values.staffId ?? NO_ARTIST}
                onValueChange={(val) => {
                  const staffId = val === NO_ARTIST ? null : val
                  onChange({ staffId })
                  const connection = googleConnections.find((c) => c.staffId === staffId)
                  if (staffId && (!connection || connection.status === 'disconnected')) {
                    setNoCalendarArtistName(staff.find((s) => s.id === staffId)?.name ?? null)
                  }
                }}
              >
                <SelectTrigger className="w-full text-right" dir="rtl">
                  <SelectValue placeholder="ללא שיוך" />
                </SelectTrigger>
                <SelectContent align="end" dir="rtl">
                  <SelectItem value={NO_ARTIST}>ללא שיוך</SelectItem>
                  {staff.map((artist) => {
                    const connection = googleConnections.find(
                      (c) => c.staffId === artist.id && c.status === 'connected',
                    )
                    const picture = connection?.googleAccountPicture || artist.avatar

                    return (
                      <SelectItem key={artist.id} value={artist.id}>
                        <div className="flex items-center gap-2">
                          <Avatar className="size-5">
                            <AvatarImage src={picture ?? undefined} />
                            <AvatarFallback className="text-micro bg-muted">
                              {artist.name.slice(0, 2)}
                            </AvatarFallback>
                          </Avatar>
                          <span>{artist.name}</span>
                        </div>
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5 text-right" dir="rtl">
              <label className="text-xs font-semibold text-foreground text-right">משך זמן</label>
              <Select
                dir="rtl"
                disabled={readOnly}
                value={String(values.durationMinutes)}
                onValueChange={(val) => onChange({ durationMinutes: Number(val) })}
              >
                <SelectTrigger className="w-full text-right" dir="rtl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent align="end" dir="rtl">
                  {DURATION_OPTIONS.map((minutes) => (
                    <SelectItem key={minutes} value={String(minutes)}>
                      {formatDuration(minutes)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Exceptions Warnings */}
          {isStudioClosed && (
            <div className="flex flex-col gap-2 rounded-xl border border-accent-ink/30 bg-accent-ink/10 p-3 text-right" dir="rtl">
              <div className="flex items-center gap-1.5 text-xs font-bold text-accent-ink text-right">
                <TriangleAlert size={13} className="shrink-0" />
                הסטודיו סגור בתאריך זה
              </div>
              <p className="text-mini text-muted-foreground text-right">
                {closureReason ? `סיבת הסגירה: ${closureReason}.` : 'התאריך שנבחר מוגדר כיום סגירה של הסטודיו.'}
              </p>
              <div className="flex items-center justify-between pt-1 text-right" dir="rtl">
                <span className="text-xs font-semibold text-foreground">אני מודע/ת שהסטודיו סגור — שריין בכל זאת</span>
                <Switch
                  id="appointment-allow-closure-exception"
                  disabled={readOnly}
                  checked={values.allowException}
                  onCheckedChange={(checked) => onChange({ allowException: checked })}
                />
              </div>
            </div>
          )}

          {!fitsWorkingHours && (
            <div className="flex flex-col gap-2 rounded-xl border border-accent-ink/30 bg-accent-ink/10 p-3 text-right" dir="rtl">
              <div className="flex items-center gap-1.5 text-xs font-bold text-accent-ink text-right">
                <TriangleAlert size={13} className="shrink-0" />
                מחוץ לשעות העבודה
              </div>
              <p className="text-mini text-muted-foreground text-right">
                המועד שנבחר אינו בתוך שעות העבודה של האמן/ית שנבחר/ה.
              </p>
              <div className="flex items-center justify-between pt-1 text-right" dir="rtl">
                <span className="text-xs font-semibold text-foreground">אני מודע/ת שזה מחוץ לשעות העבודה — שריין בכל זאת</span>
                <Switch
                  id="appointment-allow-exception"
                  disabled={readOnly}
                  checked={values.allowException}
                  onCheckedChange={(checked) => onChange({ allowException: checked })}
                />
              </div>
            </div>
          )}

          {/* Tattoo / Project Description (Textarea) */}
          <div className="flex flex-col gap-1.5 text-right" dir="rtl">
            <label className="text-xs font-semibold text-foreground text-right">
              {isSketch ? 'נושא פגישת הסקיצה / ייעוץ' : 'תיאור הקעקוע'}
            </label>
            <Textarea
              rows={3}
              dir="rtl"
              disabled={readOnly}
              placeholder={
                isSketch
                  ? 'תיאור הרעיון לסקיצה, כיוון עיצובי, קאבראפ או מיקום מבוקש…'
                  : 'תיאור הקעקוע, מיקום על הגוף, גודל משוער וסגנון…'
              }
              value={values.tattooDescription}
              onChange={(e) => onChange({ tattooDescription: e.target.value })}
              className="resize-none text-xs min-h-[72px] text-right"
            />
          </div>

          {/* Optional Collapsible Internal Notes for Staff */}
          <div className="pt-1 text-right" dir="rtl">
            {!showNotes && !values.notes ? (
              !readOnly ? (
                <button
                  type="button"
                  onClick={() => setShowNotes(true)}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-muted-foreground hover:text-primary transition-colors cursor-pointer"
                >
                  <Plus size={13} />
                  <span>הוסף הערה פנימית (לצוות בלבד)</span>
                </button>
              ) : null
            ) : (
              <div className="space-y-1.5 rounded-xl border border-border bg-muted/20 p-2.5 text-right" dir="rtl">
                <div className="flex items-center justify-between text-right" dir="rtl">
                  <span className="text-xs font-bold text-muted-foreground">הערה פנימית (לצוות בלבד)</span>
                  {!values.notes && !readOnly && (
                    <button
                      type="button"
                      onClick={() => setShowNotes(false)}
                      className="text-micro text-muted-foreground hover:text-foreground cursor-pointer"
                    >
                      ביטול
                    </button>
                  )}
                </div>
                <Textarea
                  rows={2}
                  dir="rtl"
                  disabled={readOnly}
                  placeholder="הערות תפעוליות לצוות (למשל: רגישות לחומרים, מלווה, בקשות מיוחדות)…"
                  value={values.notes}
                  onChange={(e) => onChange({ notes: e.target.value })}
                  className="resize-none text-xs min-h-[56px] text-right"
                />
              </div>
            )}
          </div>
        </TabsContent>

        {/* 2. Tab Pricing & Status */}
        <TabsContent value="pricing" className="space-y-3.5 focus-visible:outline-none text-right" dir="rtl">
          {/* Price Range */}
          {isSketch ? (
            <div className="rounded-2xl border border-accent-ink/20 bg-accent-ink/5 p-3.5 space-y-1 text-right" dir="rtl">
              <div className="flex items-center gap-1.5 text-accent-ink">
                <Sparkle size={14} className="shrink-0" />
                <span className="text-xs font-bold">מחיר הקעקוע ייקבע בפגישה בסטודיו</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                בפגישת סקיצה וייעוץ לא נדרש טווח מחיר מראש. הגדר/י מקדמת שריון לפגישה (אם נדרש) — היא תקוזז בהמשך מעלות הקעקוע.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 text-right" dir="rtl">
              <div className="flex flex-col gap-1.5 text-right" dir="rtl">
                <label className="text-xs font-semibold text-foreground text-right">מחיר מינימלי (₪)</label>
                <Input
                  type="number"
                  min="0"
                  dir="rtl"
                  disabled={readOnly}
                  value={values.priceMinIls ?? ''}
                  onChange={(e) => onChange({ priceMinIls: e.target.value === '' ? null : Number(e.target.value) })}
                  className="text-right font-assistant"
                />
              </div>
              <div className="flex flex-col gap-1.5 text-right" dir="rtl">
                <label className="text-xs font-semibold text-foreground text-right">מחיר מקסימלי (₪)</label>
                <Input
                  type="number"
                  min="0"
                  dir="rtl"
                  disabled={readOnly}
                  value={values.priceMaxIls ?? ''}
                  onChange={(e) => onChange({ priceMaxIls: e.target.value === '' ? null : Number(e.target.value) })}
                  className="text-right font-assistant"
                />
              </div>
            </div>
          )}

          {/* Deposit */}
          <div className="flex flex-col gap-1.5 text-right" dir="rtl">
            <label className="text-xs font-semibold text-foreground text-right">
              {isSketch ? 'מקדמה לשריון הפגישה (₪)' : 'מקדמה (₪)'}
            </label>
            <Input
              type="number"
              min="0"
              dir="rtl"
              disabled={readOnly}
              value={values.depositAmount ?? ''}
              onChange={(e) => onChange({ depositAmount: e.target.value === '' ? null : Number(e.target.value) })}
              className="text-right font-assistant"
            />
          </div>

          {/* Deposit Paid Toggle */}
          <div className="flex items-center justify-between rounded-xl border border-border bg-muted/20 p-3 text-right" dir="rtl">
            <div className="flex flex-col gap-0.5 text-right">
              <span className="text-xs font-bold text-foreground">מקדמה שולמה</span>
              <span className="text-micro text-muted-foreground">סמן אם מקדמת התור שולמה במלואה</span>
            </div>
            <Switch
              id="appointment-deposit-paid"
              disabled={readOnly}
              checked={values.depositPaid}
              onCheckedChange={(checked) => onChange({ depositPaid: checked })}
            />
          </div>

          {/* Status */}
          <div className="flex flex-col gap-1.5 text-right" dir="rtl">
            <label className="text-xs font-semibold text-foreground text-right">סטטוס התור</label>
            <Select
              dir="rtl"
              disabled={readOnly}
              value={values.status}
              onValueChange={(val) => onChange({ status: val as AppointmentStatus })}
            >
              <SelectTrigger className="w-full text-right" dir="rtl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent align="end" dir="rtl">
                {Object.entries(STATUS_LABELS).map(([key, label]) => {
                  // A session is completed by closing it with its final price, not from this list.
                  const viaCloseOut = key === 'completed' && closesViaCloseOut
                  return (
                    <SelectItem key={key} value={key} disabled={viaCloseOut}>
                      {viaCloseOut ? `${label} (דרך "סגירת סשן")` : label}
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>
          </div>

          {/* Google Calendar Sync Status & Retry (Bug 27 & Full-Spectrum UX) */}
          {values.status === 'confirmed' && isEdit && (
            <div className="rounded-2xl border border-border bg-muted/20 p-3 mt-2 text-right" dir="rtl">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Calendar size={14} className="text-primary" />
                  <span className="text-xs font-bold text-foreground">סנכרון ל-Google Calendar</span>
                </div>
                {localSyncStatus === 'synced' ? (
                  <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-micro font-bold bg-status-done/15 text-status-done border border-status-done/30">
                    <CalendarCheck size={11} />
                    <span>מסונכרן</span>
                  </span>
                ) : localSyncStatus === 'push_failed' ? (
                  <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-micro font-bold bg-destructive/15 text-destructive border border-destructive/30">
                    <CalendarX size={11} />
                    <span>סנכרון נכשל</span>
                  </span>
                ) : (
                  <span className="text-micro text-muted-foreground font-medium">טרם סונכרן</span>
                )}
              </div>

              {localSyncStatus === 'push_failed' && (
                <div className="mt-2.5 pt-2.5 border-t border-border flex flex-col gap-2">
                  <p className="text-micro text-muted-foreground">
                    הסנכרון ליומן Google נכשל (ייתכן שהמקעקע טרם חיבר יומן גוגל בהגדרות או שפג תוקף הטוקן).
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={isRetryingSync || readOnly}
                    onClick={handleRetryGoogleSync}
                    className="w-full text-xs font-bold gap-1.5 h-8 cursor-pointer"
                  >
                    <ArrowsClockwise size={12} className={cn(isRetryingSync && 'animate-spin')} />
                    <span>{isRetryingSync ? 'מסנכרן כעת…' : 'סנכרן מחדש ל-Google'}</span>
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Bot Price Quote Banner (if applicable) */}
          {appointment?.source === 'ai_bot' && appointment.status === 'pending' && onSendQuote && (
            <div className="space-y-2 rounded-2xl border border-primary/25 bg-primary/5 p-3.5 mt-2 text-right" dir="rtl">
              <div className="flex items-center gap-1.5">
                <Coins size={14} className="text-primary" />
                <p className="text-sm font-bold text-foreground">
                  {isSketch ? 'בקשת פגישת סקיצה מהבוט — ממתינה לאישור ושריון' : 'בקשת הזמנה מהבוט — ממתינה להצעת מחיר'}
                </p>
              </div>
              <p className="text-mini text-muted-foreground">
                {isSketch
                  ? 'אשר/י את מועד הפגישה והגדר/י מקדמת שריון (אם נדרש) ואז שלח/י ללקוח אישור בוואטסאפ.'
                  : 'מלא/י טווח מחיר ומקדמה למעלה ואז שלח/י ללקוח את הצעת המחיר ישירות בוואטסאפ.'}
              </p>
              <Button
                type="button"
                variant="outline"
                disabled={
                  readOnly ||
                  isSendingQuote ||
                  (!isSketch && (values.priceMinIls == null || values.priceMaxIls == null)) ||
                  values.depositAmount == null
                }
                onClick={() =>
                  values.depositAmount != null &&
                  onSendQuote(
                    isSketch ? 0 : (values.priceMinIls ?? 0),
                    isSketch ? 0 : (values.priceMaxIls ?? 0),
                    values.depositAmount,
                    values.durationMinutes,
                  )
                }
                className="w-full mt-1 font-bold text-xs"
              >
                <PaperPlaneTilt size={13} className="ms-1.5" />
                {isSendingQuote
                  ? 'שולח אישור…'
                  : isSketch
                    ? 'שלח אישור פגישה ללקוח בוואטסאפ'
                    : 'שלח הצעת מחיר ללקוח בוואטסאפ'}
              </Button>
            </div>
          )}
        </TabsContent>

        {/* 3. Tab Documents & Media */}
        <TabsContent value="documents" className="space-y-3.5 focus-visible:outline-none text-right" dir="rtl">
          {/* Card 1: Reference Images */}
          <div className="rounded-2xl border border-border bg-card p-3.5 space-y-2.5 text-right" dir="rtl">
            <div className="flex items-center justify-between text-right" dir="rtl">
              <div className="flex items-center gap-2">
                <ImageIcon size={14} className="text-primary" />
                <span className="text-xs font-bold text-foreground">תמונות השראה ורפרנס</span>
              </div>
              <span className="text-micro font-bold text-muted-foreground">
                {refImages.length > 0 ? `${refImages.length} תמונות` : 'ללא תמונות'}
              </span>
            </div>

            {refImages.length > 0 ? (
              <div className="flex gap-2 overflow-x-auto py-1" dir="rtl">
                {refImages.map((img, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => onOpenGallery?.(refImages, idx)}
                    className="relative size-16 rounded-xl overflow-hidden border border-border shrink-0 bg-muted cursor-pointer hover:opacity-85 transition-opacity"
                    title={`תמונה ${idx + 1}`}
                  >
                    <img src={img} alt={`Reference ${idx + 1}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            ) : (
              <div className="flex items-center gap-2 p-2.5 text-mini text-muted-foreground bg-muted/20 rounded-xl border border-border text-right" dir="rtl">
                <ImageIcon size={14} className="shrink-0 text-muted-foreground/60" />
                <span>לא הועלו תמונות השראה לשיחה זו</span>
              </div>
            )}
          </div>

          {/* Card 2: Payment Receipt */}
          <div className="rounded-2xl border border-border bg-card p-3.5 space-y-2.5 text-right" dir="rtl">
            <div className="flex items-center justify-between text-right" dir="rtl">
              <div className="flex items-center gap-2">
                <Receipt size={14} className="text-primary" />
                <span className="text-xs font-bold text-foreground">אסמכתת תשלום מקדמה</span>
              </div>
              {hasReceipt && (
                <span className="inline-flex items-center gap-1 rounded-full bg-status-done/10 px-2 py-0.5 text-micro font-bold text-status-done">
                  מאומת ✓
                </span>
              )}
            </div>

            {appointment?.paymentReceiptUrl || values.paymentReceiptUrl ? (
              <div className="flex items-center justify-between rounded-xl border border-border bg-muted/20 p-2 text-right" dir="rtl">
                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => onOpenGallery?.([appointment?.paymentReceiptUrl || values.paymentReceiptUrl!], 0)}
                    className="relative size-12 rounded-lg overflow-hidden border border-border shrink-0 bg-muted cursor-pointer hover:opacity-85 transition-opacity"
                  >
                    <img
                      src={appointment?.paymentReceiptUrl || values.paymentReceiptUrl!}
                      alt="קבלה"
                      className="w-full h-full object-cover"
                    />
                  </button>
                  <div className="flex flex-col text-right">
                    <span className="text-xs font-bold text-foreground">אישור העברה / קבלה</span>
                    <span className="text-micro text-muted-foreground">התקבלה בוואטסאפ</span>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-xs h-8 font-bold"
                  onClick={() => onOpenGallery?.([appointment?.paymentReceiptUrl || values.paymentReceiptUrl!], 0)}
                >
                  צפה בקבלה
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2 p-2.5 text-mini text-muted-foreground bg-muted/20 rounded-xl border border-border text-right" dir="rtl">
                <Receipt size={14} className="shrink-0 text-muted-foreground/60" />
                <span>טרם הועלתה אסמכתת תשלום מקדמה</span>
              </div>
            )}
          </div>

          {/* Card 3: Health Declaration with Medical Alerts & Full Q&A */}
          <HealthDeclarationViewer
            compact
            signed={appointment?.healthDeclarationSigned || values.healthDeclarationSigned}
            date={appointment?.healthDeclarationDate || values.healthDeclarationDate}
            url={appointment?.healthDeclarationFileUrl || values.healthDeclarationFileUrl}
            medicalNotes={appointment?.medicalNotes || values.medicalNotes}
            answers={appointment?.healthDeclarationAnswers || values.healthDeclarationAnswers}
            allergies={appointment?.allergies || values.allergies}
            customerName={values.leadName}
            onOpenFull={() => setHealthDialogOpen(true)}
          />

          <HealthDeclarationDialog
            open={healthDialogOpen}
            onOpenChange={setHealthDialogOpen}
            signed={appointment?.healthDeclarationSigned || values.healthDeclarationSigned}
            date={appointment?.healthDeclarationDate || values.healthDeclarationDate}
            url={appointment?.healthDeclarationFileUrl || values.healthDeclarationFileUrl}
            medicalNotes={appointment?.medicalNotes || values.medicalNotes}
            answers={appointment?.healthDeclarationAnswers || values.healthDeclarationAnswers}
            allergies={appointment?.allergies || values.allergies}
            customerName={values.leadName}
          />
        </TabsContent>
      </Tabs>

      {/* OK-only warning dialog for unlinked calendar */}
      <ResponsiveDialog
        open={noCalendarArtistName !== null}
        onOpenChange={(open) => !open && setNoCalendarArtistName(null)}
        title="אין חיבור ליומן Google"
        description={`ל${noCalendarArtistName} אין חשבון Google Calendar מחובר. התור לא יסונכרן ליומן שלו/שלה.`}
      >
        <Button
          type="button"
          onClick={() => setNoCalendarArtistName(null)}
          className="w-full rounded-xl font-bold cursor-pointer"
        >
          הבנתי
        </Button>
      </ResponsiveDialog>
    </div>
  )
}

export default AppointmentFormFields
