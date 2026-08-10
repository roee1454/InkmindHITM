import { BotOff, FileCheck2, ZoomIn } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetHandle,
} from '@/components/ui/sheet'
import { useToast } from '@/components/ui/ToastProvider'

interface HealthDeclarationSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  customerName?: string
  declarationImageUrl?: string
  onZoomImage?: (url: string) => void
  onSuccess: () => void
  onTakeover: () => void
  isTakingOver?: boolean
}

export function HealthDeclarationSheet({
  open,
  onOpenChange,
  customerName = 'הלקוח',
  declarationImageUrl,
  onZoomImage,
  onSuccess,
  onTakeover,
  isTakingOver = false,
}: HealthDeclarationSheetProps) {
  const { toast } = useToast()

  const handleConfirmDeclaration = () => {
    toast(`הצהרת הבריאות של ${customerName} אושרה ונשמרה בתיק הלקוח`, 'success')
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
            אישור הצהרת בריאות
          </SheetTitle>
          <SheetDescription className="text-xs font-medium text-muted-foreground">
            בדיקת מסמך הצהרת בריאות חתום לפני שמירה בתיק לקוח
          </SheetDescription>
        </SheetHeader>

        {/* Health Form Preview */}
        <div className="relative rounded-2xl border border-border bg-muted/40 p-4 flex flex-col items-center justify-center gap-2">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600">
            <FileCheck2 size={28} />
          </div>
          <span className="text-xs font-bold text-foreground">
            טופס הצהרת בריאות חתום
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-xl text-xs font-bold gap-1.5"
            onClick={() => onZoomImage?.(declarationImageUrl || 'mock_health')}
          >
            <ZoomIn size={14} />
            <span>הגדל טופס</span>
          </Button>
        </div>

        {/* Customer Record Sync Banner */}
        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-3.5 flex items-center justify-between text-xs">
          <span className="text-emerald-700 dark:text-emerald-300 font-bold">
            שמירה בתיק לקוח:
          </span>
          <span className="font-extrabold text-emerald-800 dark:text-emerald-200">
            ההצהרה תישמר בכרטיס של {customerName} · תקין ✓
          </span>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 pt-2">
          <Button
            type="button"
            variant="success"
            className="flex-1 h-13 rounded-2xl text-base font-extrabold gap-2"
            onClick={handleConfirmDeclaration}
          >
            <FileCheck2 size={18} />
            <span>אשר הצהרה ושמור בתיק לקוח</span>
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
