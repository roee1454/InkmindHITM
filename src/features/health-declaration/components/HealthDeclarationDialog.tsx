import React from 'react'
import { ResponsiveDialog } from '@/components/ui/responsive-dialog'
import { HealthDeclarationViewer } from './HealthDeclarationViewer'
import type { HealthDeclarationViewerProps } from './HealthDeclarationViewer'

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
  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      size="lg"
      title={customerName ? `הצהרת בריאות — ${customerName}` : 'הצהרת בריאות'}
      description="התראות רפואיות ותשובות השאלון."
    >
      <HealthDeclarationViewer customerName={customerName} {...viewerProps} />
    </ResponsiveDialog>
  )
}

export default HealthDeclarationDialog
