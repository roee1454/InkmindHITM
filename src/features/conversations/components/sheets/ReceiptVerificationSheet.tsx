import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { BadgeCheck, BotOff, ReceiptText, ZoomIn } from 'lucide-react'
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
import { confirmDepositReceived } from '@/features/conversations/server/messages'
import { useToast } from '@/components/ui/ToastProvider'

interface ReceiptVerificationSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  conversationId: string
  initialAmount?: string
  receiptImageUrl?: string
  onZoomImage?: (url: string) => void
  onSuccess: () => void
  onTakeover: () => void
  isTakingOver?: boolean
}

export function ReceiptVerificationSheet({
  open,
  onOpenChange,
  conversationId,
  initialAmount = '350',
  receiptImageUrl,
  onZoomImage,
  onSuccess,
  onTakeover,
  isTakingOver = false,
}: ReceiptVerificationSheetProps) {
  const { toast } = useToast()
  const [amount, setAmount] = useState(initialAmount)

  const confirmMutation = useMutation({
    mutationFn: () => confirmDepositReceived({ data: { conversationId } }),
    onSuccess: () => {
      toast('המקדמה אושרה והתור ננעל ביומן', 'success')
      onSuccess()
    },
  })

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
            אימות אסמכתה
          </SheetTitle>
          <SheetDescription className="text-xs font-medium text-muted-foreground">
            ודא את סכום ההעברה באסמכתה שהלקוח שלח
          </SheetDescription>
        </SheetHeader>

        {/* Receipt Image Box */}
        <div className="relative rounded-2xl border border-border bg-muted/40 p-4 flex flex-col items-center justify-center gap-2">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <ReceiptText size={28} />
          </div>
          <span className="text-xs font-bold text-foreground">
            אסמכתת תשלום מצורפת
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-xl text-xs font-bold gap-1.5"
            onClick={() => onZoomImage?.(receiptImageUrl || 'mock_receipt')}
          >
            <ZoomIn size={14} />
            <span>הגדל תמונה</span>
          </Button>
        </div>

        {/* Amount Confirmation Field */}
        <div className="space-y-1.5">
          <Label className="text-xs font-extrabold text-foreground">
            סכום ששולם באסמכתה
          </Label>
          <div className="relative">
            <Input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
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
            variant="success"
            className="flex-1 h-13 rounded-2xl text-base font-extrabold gap-2"
            disabled={confirmMutation.isPending}
            onClick={() => confirmMutation.mutate()}
          >
            <BadgeCheck size={18} />
            <span>
              {confirmMutation.isPending ? 'מאמת...' : 'אשר תשלום וקבע תור'}
            </span>
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
