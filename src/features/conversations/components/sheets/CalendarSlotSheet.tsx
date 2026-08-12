import { useState } from 'react'
import { BotOff, CalendarDays } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { cn } from '@/lib/utils'
import { useToast } from '@/components/ui/ToastProvider'

interface CalendarSlotSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialDay?: string
  initialSlot?: string
  onSuccess: () => void
  onTakeover: () => void
  isTakingOver?: boolean
}

const WEEK_DAYS = ['ב׳ 17', 'ג׳ 18', 'ד׳ 19', 'ה׳ 20', 'ו׳ 21']
const TIME_SLOTS = ['בוקר 10:30', 'צהריים 14:30', 'אחה״צ 17:00']

export function CalendarSlotSheet({
  open,
  onOpenChange,
  initialDay = 'ד׳ 19/08',
  initialSlot = 'צהריים 14:30',
  onSuccess,
  onTakeover,
  isTakingOver = false,
}: CalendarSlotSheetProps) {
  const { toast } = useToast()
  const [selectedDay, setSelectedDay] = useState(initialDay)
  const [selectedSlot, setSelectedSlot] = useState(initialSlot)

  const handleSendSlot = () => {
    toast('המועד נשלח ללקוח בוואטסאפ', 'success')
    onSuccess()
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="mx-auto w-full max-w-lg font-assistant space-y-5" dir="rtl">
        <SheetHeader className="text-right space-y-1">
          <SheetTitle className="text-lg font-extrabold text-foreground">
            בחירת מועד ביומן
          </SheetTitle>
          <SheetDescription className="text-xs font-medium text-muted-foreground">
            בחר יום וחלון זמן פנוי עבור התור
          </SheetDescription>
        </SheetHeader>

        {/* Week Strip */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-muted-foreground px-1">
            <span>שבוע הבא · 17–21 באוגוסט</span>
          </div>
          <div className="grid grid-cols-5 gap-1.5">
            {WEEK_DAYS.map((day) => (
              <button
                type="button"
                key={day}
                onClick={() => setSelectedDay(day)}
                className={cn(
                  'py-2.5 rounded-xl border text-center font-assistant text-xs font-extrabold transition-all cursor-pointer',
                  selectedDay === day
                    ? 'border-primary bg-primary text-primary-foreground shadow-xs'
                    : 'border-border bg-card text-muted-foreground hover:bg-muted',
                )}
              >
                {day}
              </button>
            ))}
          </div>
        </div>

        {/* Time Slots */}
        <div className="space-y-2">
          <Label className="text-xs font-extrabold text-foreground block">
            חלונות זמן פנויים
          </Label>
          <div className="grid grid-cols-3 gap-2">
            {TIME_SLOTS.map((slot) => (
              <button
                type="button"
                key={slot}
                onClick={() => setSelectedSlot(slot)}
                className={cn(
                  'py-3 rounded-xl border text-center font-assistant text-xs font-extrabold transition-all cursor-pointer',
                  selectedSlot === slot
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border bg-card text-muted-foreground hover:bg-muted',
                )}
              >
                {slot}
              </button>
            ))}
          </div>
        </div>

        {/* Selected Summary */}
        <div className="rounded-2xl border border-border bg-muted/30 p-3.5 flex items-center justify-between text-xs">
          <span className="text-muted-foreground font-semibold">
            מועד נבחר:
          </span>
          <span className="font-extrabold text-foreground">
            {selectedDay} · {selectedSlot}
          </span>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 pt-2">
          <Button
            type="button"
            className="flex-1 h-13 rounded-2xl text-base font-extrabold gap-2"
            onClick={handleSendSlot}
          >
            <CalendarDays size={17} />
            <span>שלח מועד ללקוח</span>
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
