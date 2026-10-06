import { useEffect, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { BotOff, SendHorizontal } from '@/components/ui/icon'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { DialogActions, ResponsiveDialog } from '@/components/ui/responsive-dialog'
import { sendPriceQuoteToCustomer } from '@/features/calendar/server/appointments'
import { cn } from '@/lib/utils'
import { useToast } from '@/components/ui/ToastProvider'
import { SESSION_ESTIMATE_HINT, SESSION_ESTIMATE_OPTIONS } from '@/features/calendar/utils/session-estimate'
import { QuoteChoiceChips } from './QuoteChoiceChips'
import { QuotePriceRange } from './QuotePriceRange'

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
  const [estimatedSessions, setEstimatedSessions] = useState<number | null>(1)

  useEffect(() => {
    if (open) {
      setDuration(initialDurationMinutes ?? (isSketch ? 60 : 180))
      setPriceMin(initialPriceMin)
      setPriceMax(initialPriceMax)
      setDeposit(initialDeposit ?? (isSketch ? '150' : '350'))
      setEstimatedSessions(1)
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
          ...(isSketch ? {} : { estimatedSessions }),
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
      title={isSketch ? 'אישור פגישת סקיצה' : 'הצעת מחיר'}
      description={isSketch ? 'משך הפגישה ומקדמה לשריון. את מחיר הקעקוע קובעים בפגישה.' : 'טווח מחיר, הערכת סשנים ומקדמה — נשלחים ללקוח בוואטסאפ.'}
      bodyClassName="flex flex-col gap-5"
      footer={
        <DialogActions
          start={
            <Button type="button" variant="ghost" disabled={isTakingOver} onClick={onTakeover} className="gap-1.5">
              <BotOff size={15} />
              לקחת שליטה
            </Button>
          }
        >
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={quoteMutation.isPending}>
            ביטול
          </Button>
          <Button type="button" className="min-w-28 gap-1.5" disabled={quoteMutation.isPending || !isTattooPriceValid} onClick={() => quoteMutation.mutate()}>
            <SendHorizontal size={15} />
            {quoteMutation.isPending ? 'שולח…' : isSketch ? 'שליחת אישור' : 'שליחת ההצעה'}
          </Button>
        </DialogActions>
      }
    >
      <QuoteChoiceChips
        label={isSketch ? 'משך פגישת הסקיצה' : 'משך עבודה משוער'}
        options={durationPresets}
        value={duration}
        onChange={setDuration}
      />

      {/* Price Range Inputs or Sketch Notice */}
      {isSketch ? (
        <p className="text-sm text-muted-foreground">בפגישת סקיצה לא שולחים מחיר. מקדמה, אם נגבית, משריינת את המועד ומקוזזת מהקעקוע.</p>
      ) : (
        <QuotePriceRange min={priceMin} max={priceMax} onMinChange={setPriceMin} onMaxChange={setPriceMax} />
      )}

      {!isSketch && (
        <QuoteChoiceChips
          label="מספר מפגשים משוער"
          hint={SESSION_ESTIMATE_HINT}
          options={SESSION_ESTIMATE_OPTIONS}
          value={estimatedSessions}
          onChange={setEstimatedSessions}
          columns={5}
        />
      )}

      {/* Deposit Field + Quick Chips */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="form-label">
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
            className="text-base font-bold tabular-nums pl-8"
          />
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">
            ₪
          </span>
        </div>
      </div>

    </ResponsiveDialog>
  )
}
