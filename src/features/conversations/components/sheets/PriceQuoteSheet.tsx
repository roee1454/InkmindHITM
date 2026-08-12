import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { BotOff, SendHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { sendPriceQuoteToCustomer } from '@/features/calendar/server/appointments'
import { cn } from '@/lib/utils'
import { useToast } from '@/components/ui/ToastProvider'

// 30-minute increments, 1–6 hours — matches AppointmentFormFields' duration select.
const DURATION_PRESETS = [90, 120, 150, 180, 240, 360].map((minutes) => ({
  label: minutes % 60 === 0 ? `${minutes / 60} שעות` : `${Math.floor(minutes / 60)}.5 שעות`,
  value: minutes,
}))

const DEPOSIT_PRESETS = ['200', '350', '500', 'ללא']

interface PriceQuoteSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  appointmentId: string
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
  initialPriceMin = '',
  initialPriceMax = '',
  initialDeposit = '350',
  initialDurationMinutes = 180,
  onSuccess,
  onTakeover,
  isTakingOver = false,
}: PriceQuoteSheetProps) {
  const { toast } = useToast()
  const [duration, setDuration] = useState<number>(initialDurationMinutes)
  const [priceMin, setPriceMin] = useState(initialPriceMin)
  const [priceMax, setPriceMax] = useState(initialPriceMax)
  const [deposit, setDeposit] = useState(initialDeposit)

  const quoteMutation = useMutation({
    mutationFn: () =>
      sendPriceQuoteToCustomer({
        data: {
          appointmentId,
          priceMinIls: Number(priceMin) || Number(priceMax) || 0,
          priceMaxIls: Number(priceMax) || Number(priceMin) || 0,
          depositAmount: deposit === 'ללא' ? 0 : Number(deposit) || 350,
          durationMinutes: duration,
        },
      }),
    onSuccess: () => {
      toast('הצעת המחיר נשלחה בהצלחה ללקוח בוואטסאפ', 'success')
      onSuccess()
    },
  })

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        className="mx-auto w-full max-w-lg font-assistant space-y-5"
        dir="rtl"
      >
        <SheetHeader className="text-right space-y-1">
          <SheetTitle className="text-lg font-extrabold text-foreground">
            הצעת טווח מחיר ומקדמה
          </SheetTitle>
          <SheetDescription className="text-xs font-medium text-muted-foreground">
            הגדר טווח מחירים משוער ומקדמה לשריון התור
          </SheetDescription>
        </SheetHeader>

        {/* Duration Selector */}
        <div className="space-y-2">
          <Label className="text-xs font-extrabold text-foreground block">
            משך עבודה משוער
          </Label>
          <div className="grid grid-cols-4 gap-2">
            {DURATION_PRESETS.map((preset) => {
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
                      : 'border-border/80 bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground',
                  )}
                >
                  {preset.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Price Range Inputs */}
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
                className="h-12 rounded-2xl text-base font-bold font-mono pl-8"
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
                className="h-12 rounded-2xl text-base font-bold font-mono pl-8"
              />
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">
                ₪
              </span>
            </div>
          </div>
        </div>

        {/* Deposit Field + Quick Chips */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-extrabold text-foreground">
              סכום מקדמה
            </Label>
            <div className="flex gap-1.5">
              {DEPOSIT_PRESETS.map((preset) => (
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
              className="h-12 rounded-2xl text-base font-bold font-mono pl-8"
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
            disabled={quoteMutation.isPending}
            onClick={() => quoteMutation.mutate()}
          >
            <SendHorizontal size={17} />
            <span>
              {quoteMutation.isPending ? 'שולח...' : 'שלח הצעה ללקוח בוואטסאפ'}
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
      </SheetContent>
    </Sheet>
  )
}
