import React from 'react'
import { ResponsiveDialog } from '@/components/ui/responsive-dialog'
import { HealthDeclarationViewer, type HealthDeclarationViewerProps } from './HealthDeclarationViewer'

export interface HealthDeclarationDialogProps extends HealthDeclarationViewerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export const HealthDeclarationDialog: React.FC<HealthDeclarationDialogProps> = ({
  open,
  onOpenChange,
  customerName,
  ...viewerProps
}) => {
  const title = customerName
    ? `הצהרת בריאות — ${customerName}`
    : 'טופס הצהרת בריאות דיגיטלי'

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description="פרטי הצהרת הבריאות, התראות רפואיות ותשובות השאלון הדיגיטלי"
      contentClassName="sm:max-w-xl max-h-[75vh] flex flex-col p-5 gap-3 overflow-hidden"
    >
      <div className="overflow-y-auto max-h-[calc(75vh-5.5rem)] pe-1 -me-1">
        <HealthDeclarationViewer
          customerName={customerName}
          {...viewerProps}
        />
      </div>
    </ResponsiveDialog>
  )
}

export default HealthDeclarationDialog
