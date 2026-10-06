import { useEffect, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { BadgeCheck, BotOff, ReceiptText, ZoomIn } from '@/components/ui/icon'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { DialogActions, ResponsiveDialog } from '@/components/ui/responsive-dialog'
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

  useEffect(() => {
    if (open) {
      setAmount(initialAmount ? String(initialAmount) : '')
    }
  }, [open, initialAmount])

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
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title="אימות אסמכתה"
      description="בודקים שהסכום באסמכתה תואם, ומאשרים — התור נקבע והלקוח מקבל אישור."
      bodyClassName="flex flex-col gap-5"
      footer={
        <DialogActions
          start={
            <Button type="button" variant="ghost" disabled={rejectMutation.isPending} onClick={() => rejectMutation.mutate()}>
              {rejectMutation.isPending ? 'שולח…' : 'לבקש צילום ברור'}
            </Button>
          }
        >
          <Button type="button" variant="ghost" disabled={isTakingOver} onClick={onTakeover} className="gap-1.5">
            <BotOff size={15} />
            לקחת שליטה
          </Button>
          <Button type="button" className="min-w-28 gap-1.5" disabled={confirmMutation.isPending} onClick={() => confirmMutation.mutate()}>
            <BadgeCheck size={16} />
            {confirmMutation.isPending ? 'מאשר…' : 'אישור התשלום'}
          </Button>
        </DialogActions>
      }
    >
      {/* Receipt Image Box */}
      {receiptImageUrl ? (
        <button
          type="button"
          onClick={() => onZoomImage?.(receiptImageUrl)}
          className="relative flex aspect-video w-full cursor-pointer items-center justify-center overflow-hidden rounded-lg border border-border bg-muted/40"
        >
          <img src={receiptImageUrl} alt="אסמכתה" className="h-full w-full object-contain" />
          <span className="absolute bottom-2 end-2 flex items-center gap-1 rounded-full bg-card/90 px-2.5 py-1 text-2xs font-bold text-foreground shadow-sm">
            <ZoomIn size={13} />
            הגדל
          </span>
        </button>
      ) : (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <ReceiptText size={16} className="shrink-0" />
          לא נמצאה תמונת אסמכתה בשיחה.
        </p>
      )}

      {/* Amount Confirmation Field */}
      <div className="space-y-1.5">
        <Label className="form-label">הסכום באסמכתה</Label>
        <div className="relative">
          <Input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="text-base font-bold tabular-nums pl-8"
          />
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">
            ₪
          </span>
        </div>
      </div>

    </ResponsiveDialog>
  )
}
