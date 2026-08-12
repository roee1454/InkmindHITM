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
} from '@/components/ui/sheet'
import { confirmDepositReceived, rejectDepositReceipt } from '@/features/conversations/server/messages'
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
  initialAmount = '',
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

  const rejectMutation = useMutation({
    mutationFn: () => rejectDepositReceipt({ data: { conversationId } }),
    onSuccess: () => {
      toast('נשלחה ללקוח בקשה לאסמכתה ברורה יותר', 'info')
      onSuccess()
    },
  })

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        className="mx-auto w-full max-w-lg font-assistant space-y-5"
        dir="rtl"
      >
        <SheetHeader className="text-right space-y-1">
          <SheetTitle className="text-lg font-extrabold text-foreground">
            אימות אסמכתה
          </SheetTitle>
          <SheetDescription className="text-xs font-medium text-muted-foreground">
            ודא את סכום ההעברה באסמכתה שהלקוח שלח
          </SheetDescription>
        </SheetHeader>

        {/* Receipt Image Box */}
        {receiptImageUrl ? (
          <button
            type="button"
            onClick={() => onZoomImage?.(receiptImageUrl)}
            className="relative flex aspect-video w-full cursor-pointer items-center justify-center overflow-hidden rounded-2xl border border-border bg-muted/40"
          >
            <img src={receiptImageUrl} alt="אסמכתה" className="h-full w-full object-contain" />
            <span className="absolute bottom-2 end-2 flex items-center gap-1 rounded-full bg-card/90 px-2.5 py-1 text-[11px] font-bold text-foreground shadow-sm">
              <ZoomIn size={13} />
              הגדל
            </span>
          </button>
        ) : (
          <div className="relative rounded-2xl border border-border bg-muted/40 p-4 flex flex-col items-center justify-center gap-2">
            <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <ReceiptText size={28} />
            </div>
            <span className="text-xs font-bold text-muted-foreground">לא נמצאה תמונת אסמכתה בשיחה</span>
          </div>
        )}

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
            className="flex-1 h-13 rounded-2xl bg-success text-base font-extrabold gap-2 hover:bg-success/90"
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
            variant="outline"
            className="h-13 px-4 rounded-2xl text-sm font-bold gap-1.5"
            disabled={isTakingOver}
            onClick={onTakeover}
          >
            <BotOff size={15} />
            <span>קח שליטה</span>
          </Button>
        </div>

        <button
          type="button"
          disabled={rejectMutation.isPending}
          onClick={() => rejectMutation.mutate()}
          className="w-full cursor-pointer text-center text-[13px] font-bold text-muted-foreground disabled:opacity-50"
        >
          {rejectMutation.isPending ? 'שולח…' : 'דחיית אסמכתה — בקש/י צילום ברור יותר'}
        </button>
      </SheetContent>
    </Sheet>
  )
}
