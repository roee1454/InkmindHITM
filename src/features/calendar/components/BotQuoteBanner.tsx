import { useState } from 'react'
import { Coins, PaperPlaneTilt } from '@/components/ui/icon'
import { Button } from '@/components/ui/button'
import { QuoteChoiceChips } from '@/features/conversations/components/sheets/QuoteChoiceChips'
import { SESSION_ESTIMATE_HINT, SESSION_ESTIMATE_OPTIONS } from '../utils/session-estimate'
import type { AppointmentFormValues } from '../types'

export interface QuoteToSend {
  priceMinIls: number
  priceMaxIls: number
  depositAmount: number
  durationMinutes: number
  /** Tattoo only: the artist's estimate; null = not known yet. */
  estimatedSessions?: number | null
}

/**
 * In the appointment dialog, for a hold the bot created: sends the quote (price and deposit from the
 * form above, and for a tattoo how many sessions it takes) to the customer on WhatsApp.
 */
export function BotQuoteBanner({
  values,
  readOnly,
  isSending,
  onSend,
}: {
  values: AppointmentFormValues
  readOnly: boolean
  isSending: boolean
  onSend: (quote: QuoteToSend) => void
}) {
  const isSketch = values.type === 'sketch'
  const [estimatedSessions, setEstimatedSessions] = useState<number | null>(1)
  const missing = (!isSketch && (values.priceMinIls == null || values.priceMaxIls == null)) || values.depositAmount == null

  return (
    <div className="mt-2 space-y-2 rounded-2xl border border-primary/25 bg-primary/5 p-3.5 text-right" dir="rtl">
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
      <Button
        type="button"
        variant="outline"
        disabled={readOnly || isSending || missing}
        onClick={() =>
          values.depositAmount != null &&
          onSend({
            priceMinIls: isSketch ? 0 : (values.priceMinIls ?? 0),
            priceMaxIls: isSketch ? 0 : (values.priceMaxIls ?? 0),
            depositAmount: values.depositAmount,
            durationMinutes: values.durationMinutes,
            ...(isSketch ? {} : { estimatedSessions }),
          })
        }
        className="mt-1 w-full text-xs font-bold"
      >
        <PaperPlaneTilt size={13} className="ms-1.5" />
        {isSending ? 'שולח אישור…' : isSketch ? 'שלח אישור פגישה ללקוח בוואטסאפ' : 'שלח הצעת מחיר ללקוח בוואטסאפ'}
      </Button>
    </div>
  )
}
