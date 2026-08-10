import {
  BadgeCheck,
  BotOff,
  FileCheck2,
  HandCoins,
  ReceiptText,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export type ActionCardKind = 'pricing' | 'receipt' | 'health' | 'final_booking'

interface InFeedActionCardProps {
  kind: ActionCardKind
  title?: string
  durationLabel: string
  priceRange: string
  depositLabel: string
  onEdit: () => void
  onTakeover: () => void
  isTakingOver?: boolean
}

const KIND_CONFIG: Record<
  ActionCardKind,
  {
    icon: typeof HandCoins
    iconColorClass: string
    defaultTitle: string
    buttonText: string
  }
> = {
  pricing: {
    icon: HandCoins,
    iconColorClass: 'bg-primary/10 text-primary',
    defaultTitle: 'נדרש אישור שלך — תמחור ומועד',
    buttonText: 'עריכת הצעה',
  },
  receipt: {
    icon: ReceiptText,
    iconColorClass: 'bg-emerald-500/10 text-emerald-600',
    defaultTitle: 'אימות תשלום — בדיקת אסמכתה',
    buttonText: 'אימות אסמכתה',
  },
  health: {
    icon: FileCheck2,
    iconColorClass: 'bg-amber-500/10 text-amber-600',
    defaultTitle: 'אישור הצהרת בריאות ללקוח',
    buttonText: 'בדיקת הצהרה',
  },
  final_booking: {
    icon: BadgeCheck,
    iconColorClass: 'bg-primary/10 text-primary',
    defaultTitle: 'נעילת תור סופי ביומן',
    buttonText: 'נעילת תור',
  },
}

export function InFeedActionCard({
  kind,
  title,
  durationLabel,
  priceRange,
  depositLabel,
  onEdit,
  onTakeover,
  isTakingOver = false,
}: InFeedActionCardProps) {
  const config = KIND_CONFIG[kind]
  const Icon = config.icon

  return (
    <div className="border-b border-border bg-card/95 px-4 py-3.5 backdrop-blur-md transition-all font-assistant">
      <div className="mx-auto max-w-4xl space-y-3">
        {/* Card Title Bar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div
              className={cn(
                'flex size-7 items-center justify-center rounded-lg',
                config.iconColorClass,
              )}
            >
              <Icon size={16} />
            </div>
            <span className="text-sm font-extrabold text-foreground">
              {title || config.defaultTitle}
            </span>
          </div>

          {/* Action and Takeover Buttons */}
          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="takeover"
              className="h-8 rounded-xl px-2.5 text-xs font-bold gap-1"
              disabled={isTakingOver}
              onClick={onTakeover}
            >
              <BotOff size={13} />
              <span>קח שליטה</span>
            </Button>

            <Button
              type="button"
              size="sm"
              onClick={onEdit}
              className="h-8 rounded-xl px-3 text-xs font-extrabold shadow-xs cursor-pointer"
            >
              {config.buttonText}
            </Button>
          </div>
        </div>

        {/* 3 Interactive Summary Boxes */}
        <div className="grid grid-cols-3 gap-2">
          <div
            onClick={onEdit}
            className="flex flex-col items-center justify-center rounded-xl border border-border/80 bg-muted/20 py-2 transition-all cursor-pointer hover:border-primary/50 hover:bg-primary/5 active:scale-[0.98]"
          >
            <span className="text-[10.5px] font-bold text-muted-foreground">
              משך משוער
            </span>
            <span className="text-xs font-black text-foreground font-mono">
              {durationLabel}
            </span>
          </div>

          <div
            onClick={onEdit}
            className="flex flex-col items-center justify-center rounded-xl border border-border/80 bg-muted/20 py-2 transition-all cursor-pointer hover:border-primary/50 hover:bg-primary/5 active:scale-[0.98]"
          >
            <span className="text-[10.5px] font-bold text-muted-foreground">
              טווח מחיר
            </span>
            <span className="text-xs font-black text-foreground font-mono">
              {priceRange}
            </span>
          </div>

          <div
            onClick={onEdit}
            className="flex flex-col items-center justify-center rounded-xl border border-border/80 bg-muted/20 py-2 transition-all cursor-pointer hover:border-primary/50 hover:bg-primary/5 active:scale-[0.98]"
          >
            <span className="text-[10.5px] font-bold text-muted-foreground">
              מקדמה
            </span>
            <span className="text-xs font-black text-foreground font-mono">
              {depositLabel}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
