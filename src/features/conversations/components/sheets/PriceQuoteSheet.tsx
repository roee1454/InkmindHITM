import { useEffect, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { BotOff, SendHorizontal, Sparkles } from '@/components/ui/icon'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ResponsiveDialog } from '@/components/ui/responsive-dialog'
import { sendPriceQuoteToCustomer } from '@/features/calendar/server/appointments'
import { cn } from '@/lib/utils'
import { useToast } from '@/components/ui/ToastProvider'

// 30-minute increments, 1–6 hours — matches AppointmentFormFields' duration select.
const TATTOO_DURATION_PRESETS = [90, 120, 150, 180, 240, 360].map((minutes) => ({
  label: minutes % 60 === 0 ? `${minutes / 60} שעות` : `${Math.floor(minutes / 60)}.5 שעות`,
  value: minutes,
}))

const SKETCH_DURATION_PRESETS = [
  { label: '30 דק׳', value: 30 },
  { label: '45 דק׳', value: 45 },
  { label: 'שעה', value: 60 },
  { label: '1.5 שעות', value: 90 },
]

const TATTOO_DEPOSIT_PRESETS = ['200', '350', '500', 'ללא']
const SKETCH_DEPOSIT_PRESETS = ['ללא', '100', '150', '200']

interface PriceQuoteSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  appointmentId: string
  appointmentType?: 'tattoo' | 'sketch'
  initialPriceMin?: string
  initialPriceMax?: string
  initialDeposit?: string
  initialDurationMinutes?: number
  onSuccess: () => void
  onTakeover: () => void
  isTakingOver?: boolean
}

export function PriceQuoteSheet({
  open,
  onOpenChange,
  appointmentId,
  appointmentType = 'tattoo',
  initialPriceMin = '',
  initialPriceMax = '',
  initialDeposit,
  initialDurationMinutes,
  onSuccess,
  onTakeover,
  isTakingOver = false,
}: PriceQuoteSheetProps) {
  const { toast } = useToast()
  const isSketch = appointmentType === 'sketch'
  const durationPresets = isSketch ? SKETCH_DURATION_PRESETS : TATTOO_DURATION_PRESETS
  const depositPresets = isSketch ? SKETCH_DEPOSIT_PRESETS : TATTOO_DEPOSIT_PRESETS

  const [duration, setDuration] = useState<number>(
    initialDurationMinutes ?? (isSketch ? 30 : 180),
  )
  const [priceMin, setPriceMin] = useState(initialPriceMin)
  const [priceMax, setPriceMax] = useState(initialPriceMax)
  const [deposit, setDeposit] = useState(
    initialDeposit ?? (isSketch ? '150' : '350'),
  )

  useEffect(() => {
    if (open) {
      setDuration(initialDurationMinutes ?? (isSketch ? 30 : 180))
      setPriceMin(initialPriceMin)
      setPriceMax(initialPriceMax)
      setDeposit(initialDeposit ?? (isSketch ? '150' : '350'))
    }
  }, [open, initialDurationMinutes, initialPriceMin, initialPriceMax, initialDeposit, isSketch])

  const parsedMin = Number(priceMin) || 0
  const parsedMax = Number(priceMax) || 0
  const isTattooPriceValid = isSketch || (parsedMin > 0 && parsedMax > 0 && parsedMax >= parsedMin)

  const quoteMutation = useMutation({
    mutationFn: () => {
      if (!appointmentId) {
        throw new Error('אין פגישה פעילה לעדכון. נסה לרענן את הדף.')
      }
      if (!isSketch && (!parsedMin || !parsedMax || parsedMin <= 0 || parsedMax <= 0)) {
        throw new Error('יש להזין טווח מחירים חיובי ותקין עבור תור לקעקוע.')
      }
      return sendPriceQuoteToCustomer({
        data: {
          appointmentId,
          priceMinIls: isSketch ? 0 : Math.min(parsedMin, parsedMax),
          priceMaxIls: isSketch ? 0 : Math.max(parsedMin, parsedMax),
          depositAmount: deposit === 'ללא' ? 0 : Number(deposit) || (isSketch ? 150 : 350),
          durationMinutes: duration,
        },
      })
    },
    onSuccess: () => {
      toast(
        isSketch ? 'אישור פגישת הסקיצה נשלח בהצלחה ללקוח בוואטסאפ' : 'הצעת המחיר נשלחה בהצלחה ללקוח בוואטסאפ',
        'success',
      )
      onSuccess()
    },
    onError: (err) => {
      toast(err instanceof Error ? err.message : 'שליחת הצעת המחיר נכשלה', 'error')
    },
  })

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title={isSketch ? 'אישור ושריון פגישת סקיצה / ייעוץ' : 'הצעת טווח מחיר ומקדמה'}
      description={
        isSketch
          ? 'הגדר משך פגישה ומקדמה לשריון התור (מחיר הקעקוע ייקבע בפגישה)'
          : 'הגדר טווח מחירים משוער ומקדמה לשריון התור'
      }
      contentClassName="max-w-lg space-y-5"
    >
      {/* Duration Selector */}
      <div className="space-y-2">
        <Label className="text-xs font-extrabold text-foreground block">
          {isSketch ? 'משך פגישת הסקיצה' : 'משך עבודה משוער'}
        </Label>
        <div className="grid grid-cols-4 gap-2">
          {durationPresets.map((preset) => {
            const isSelected = duration === preset.value
            return (
              <button
                type="button"
                key={preset.value}
                onClick={() => setDuration(preset.value)}
                className={cn(
                  'h-10 rounded-xl border text-xs font-extrabold transition-all cursor-pointer select-none active:scale-[0.96] flex items-center justify-center',
                  isSelected
                    ? 'border-primary bg-primary text-primary-foreground shadow-xs'
                    : 'border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground',
                )}
              >
                {preset.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Price Range Inputs or Sketch Notice */}
      {isSketch ? (
        <div className="rounded-2xl border border-accent-ink/20 bg-accent-ink/5 p-3.5 space-y-1 text-right" dir="rtl">
          <div className="flex items-center gap-1.5 text-accent-ink">
            <Sparkles size={14} className="shrink-0" />
            <span className="text-xs font-bold">מחיר הקעקוע ייקבע בפגישה בסטודיו</span>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            בפגישת סקיצה וייעוץ לא נדרש טווח מחיר מראש. המקדמה (אם תיגבה) תשמש לשריון מועד הפגישה ותקוזז מעלות הקעקוע הסופית.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          <Label className="text-xs font-extrabold text-foreground block">
            טווח מחירים משוער
          </Label>
          <div className="grid grid-cols-2 gap-3">
            <div className="relative">
              <Input
                type="number"
                inputMode="numeric"
                placeholder="מינימום"
                value={priceMin}
                onChange={(e) => setPriceMin(e.target.value)}
                className="h-12 rounded-2xl text-base font-bold tabular-nums pl-8"
              />
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">
                ₪
              </span>
            </div>
            <div className="relative">
              <Input
                type="number"
                inputMode="numeric"
                placeholder="מקסימום"
                value={priceMax}
                onChange={(e) => setPriceMax(e.target.value)}
                className="h-12 rounded-2xl text-base font-bold tabular-nums pl-8"
              />
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">
                ₪
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Deposit Field + Quick Chips */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-extrabold text-foreground">
            {isSketch ? 'מקדמה לשריון הפגישה' : 'סכום מקדמה'}
          </Label>
          <div className="flex gap-1.5">
            {depositPresets.map((preset) => (
              <button
                type="button"
                key={preset}
                onClick={() => setDeposit(preset)}
                className={cn(
                  'px-2.5 py-1 rounded-lg border text-micro font-extrabold transition-all cursor-pointer',
                  deposit === preset
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border bg-card text-muted-foreground hover:bg-muted',
                )}
              >
                {preset === 'ללא' ? 'ללא' : `₪${preset}`}
              </button>
            ))}
          </div>
        </div>
        <div className="relative">
          <Input
            type="text"
            value={deposit}
            onChange={(e) => setDeposit(e.target.value)}
            className="h-12 rounded-2xl text-base font-bold tabular-nums pl-8"
          />
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">
            ₪
          </span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2 pt-2">
        <Button
          type="button"
          className="flex-1 h-13 rounded-2xl text-base font-extrabold gap-2"
          disabled={quoteMutation.isPending || !isTattooPriceValid}
          onClick={() => quoteMutation.mutate()}
        >
          <SendHorizontal size={17} />
          <span>
            {quoteMutation.isPending ? 'שולח...' : isSketch ? 'שלח אישור פגישה בוואטסאפ' : 'שלח הצעה ללקוח בוואטסאפ'}
          </span>
        </Button>
        <Button
          type="button"
          variant="outline"
          className="h-13 px-4 rounded-2xl text-sm font-bold gap-1.5"
          disabled={isTakingOver}
          onClick={onTakeover}
        >
          <BotOff size={15} />
          <span>קח שליטה</span>
        </Button>
      </div>
    </ResponsiveDialog>
  )
}
