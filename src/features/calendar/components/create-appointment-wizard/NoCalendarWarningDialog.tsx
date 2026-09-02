import React from 'react'
import { Button } from '@/components/ui/button'
import { ResponsiveDialog } from '@/components/ui/responsive-dialog'

interface NoCalendarWarningDialogProps {
  artistName: string | null
  onClose: () => void
}

export const NoCalendarWarningDialog: React.FC<NoCalendarWarningDialogProps> = ({ artistName, onClose }) => {
  return (
    <ResponsiveDialog
      open={artistName !== null}
      onOpenChange={(open) => !open && onClose()}
      title="אין חיבור ליומן Google"
      description={`ל${artistName} אין חשבון Google Calendar מחובר. התור לא יסונכרן ליומן שלו/שלה.`}
    >
      <Button type="button" onClick={onClose} className="w-full rounded-xl font-bold cursor-pointer">
        הבנתי
      </Button>
    </ResponsiveDialog>
  )
}

export default NoCalendarWarningDialog
