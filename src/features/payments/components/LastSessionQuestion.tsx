import { Button } from '@/components/ui/button'

/**
 * Asked when closing a session with nothing to go on — no estimate of the sessions and nothing else
 * booked: whether the piece is finished is the artist's call, never a default.
 */
export function LastSessionQuestion({ onChoose, disabled }: { onChoose: (isLast: boolean) => void; disabled: boolean }) {
  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-warning/30 bg-warning/10 p-3" dir="rtl">
      <span className="text-xs font-extrabold text-foreground">האם זה הסשן האחרון בקעקוע הזה?</span>
      <span className="text-2xs text-muted-foreground">לא הוזן מספר מפגשים משוער לפרויקט, ואין תור נוסף ביומן.</span>
      <div className="grid grid-cols-2 gap-2">
        <Button type="button" size="sm" variant="outline" disabled={disabled} onClick={() => onChoose(true)}>
          כן, העבודה הסתיימה
        </Button>
        <Button type="button" size="sm" variant="outline" disabled={disabled} onClick={() => onChoose(false)}>
          לא, יש עוד מפגשים
        </Button>
      </div>
    </div>
  )
}
