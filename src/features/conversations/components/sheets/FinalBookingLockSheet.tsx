import { useState } from 'react'
import { BotOff, Lock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetHandle,
} from '@/components/ui/sheet'
import { useToast } from '@/components/ui/ToastProvider'

interface FinalBookingLockSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  appointmentDate?: string
  artistName?: string
  durationLabel?: string
  priceRange?: string
  depositAmount?: string
  remainingEstimated?: string
  initialArrivalNotes?: string
  onSuccess: () => void
  onTakeover: () => void
  isTakingOver?: boolean
}

export function FinalBookingLockSheet({
  open,
  onOpenChange,
  appointmentDate = 'יום ד׳ 19/08/2026 · 14:30',
  artistName = 'רואי חיילי',
  durationLabel = '3–4 שעות',
  priceRange = '₪1,600–2,000',
  depositAmount = '350',
  remainingEstimated = '₪1,250–1,650',
  initialArrivalNotes = 'להגיע כ-10 דק׳ לפני, לשתות מים ולהימנע מאלכוהול יום לפני.',
  onSuccess,
  onTakeover,
  isTakingOver = false,
}: FinalBookingLockSheetProps) {
  const { toast } = useToast()
  const [arrivalNotes, setArrivalNotes] = useState(initialArrivalNotes)

  const handleLockBooking = () => {
    toast('התור ננעל בהצלחה וזימון רשמי נשלח ללקוח בוואטסאפ', 'success')
    onSuccess()
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="mx-auto w-full max-w-lg rounded-t-[28px] border-t border-border bg-card p-6 shadow-2xl max-h-[90svh] overflow-y-auto font-assistant space-y-5 select-none"
        dir="rtl"
      >
        <SheetHandle />

        <SheetHeader className="text-right space-y-1">
          <SheetTitle className="text-lg font-extrabold text-foreground">
            נעילת תור סופי ביומן
          </SheetTitle>
          <SheetDescription className="text-xs font-medium text-muted-foreground">
            סיכום התור המלא שיישלח ישירות ללקוח בוואטסאפ
          </SheetDescription>
        </SheetHeader>

        {/* Summary Card */}
        <div className="rounded-2xl border border-border bg-muted/30 p-4 space-y-2.5 font-assistant text-sm">
          <div className="flex items-center justify-between font-extrabold text-foreground">
            <span>{appointmentDate}</span>
            <span className="rounded-lg bg-primary/10 px-2 py-0.5 text-xs text-primary font-bold">
              {durationLabel}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs text-muted-foreground font-semibold">
            <span>
              אמן: <b className="text-foreground">{artistName}</b>
            </span>
            <span>
              טווח משוער: <b className="text-foreground">{priceRange}</b>
            </span>
          </div>
          <div className="flex items-center justify-between border-t border-border/60 pt-2 text-xs font-bold text-emerald-600">
            <span>מקדמה שולמה: ₪{depositAmount} ✓</span>
            <span className="text-foreground">
              יתרה משוערת בסטודיו: <b>{remainingEstimated}</b>
            </span>
          </div>
        </div>

        {/* Arrival Instructions Field */}
        <div className="space-y-1.5">
          <Label className="text-xs font-extrabold text-foreground">
            הנחיות הגעה מותאמות
          </Label>
          <Input
            value={arrivalNotes}
            onChange={(e) => setArrivalNotes(e.target.value)}
            className="h-12 rounded-2xl text-xs font-medium"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 pt-2">
          <Button
            type="button"
            className="flex-1 h-13 rounded-2xl text-base font-extrabold gap-2"
            onClick={handleLockBooking}
          >
            <Lock size={17} />
            <span>נעל תור ושלח זימון ללקוח</span>
          </Button>
          <Button
            type="button"
            variant="takeover"
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
