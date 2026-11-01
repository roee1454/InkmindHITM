import { IMButton } from '@/components/ui/button'
import { IMDialogActions, IMResponsiveDialog } from '@/components/ui/responsive-dialog'

interface NoCalendarWarningDialogProps {
  artistName: string | null
  onClose: () => void
}

/** Picking an artist without a connected Google Calendar: the booking still saves, it just won't sync. */
export function NoCalendarWarningDialog({ artistName, onClose }: NoCalendarWarningDialogProps) {
  return (
    <IMResponsiveDialog
      open={artistName !== null}
      onOpenChange={(open) => !open && onClose()}
      size="sm"
      title="היומן של המקעקע לא מחובר"
      description={`ל${artistName ?? ''} אין יומן Google מחובר, אז התור יישמר ב-CRM בלבד ולא יופיע ביומן שלו/שלה.`}
      footer={
        <IMDialogActions>
          <IMButton type="button" onClick={onClose} className="min-w-28">
            הבנתי
          </IMButton>
        </IMDialogActions>
      }
    >
      <p className="text-sm text-muted-foreground">אפשר לחבר יומן בהגדרות ← צוות.</p>
    </IMResponsiveDialog>
  )
}
