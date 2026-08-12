import type { ComponentType } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { ChevronRight } from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { cn } from '@/lib/utils'

export interface ContinuationItem {
  id: string
  label: string
  desc: string
  completed: boolean
  actionText: string
  icon: ComponentType<{ size?: number; className?: string }>
  link: string
}

interface ContinuationListSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  items: ContinuationItem[]
}

export function ContinuationListSheet({
  open,
  onOpenChange,
  items,
}: ContinuationListSheetProps) {
  const navigate = useNavigate()

  const handleItemClick = (link: string) => {
    onOpenChange(false)
    navigate({ to: link })
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="mx-auto w-full max-w-lg gap-5 font-assistant" dir="rtl">
        {/* Top Header with Back button */}
        <div className="flex items-center justify-between border-b border-border/60 pb-3">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="tap-target text-muted-foreground"
          >
            <ChevronRight size={22} />
          </button>
          <SheetTitle className="text-lg font-extrabold text-foreground">
            השלמת הגדרה
          </SheetTitle>
          <div className="size-11" />
        </div>

        <SheetDescription className="text-center text-sm font-medium text-muted-foreground">
          אף אחת מאלה לא חוסמת אותך. הסוכן עובד גם בלעדיהן.
        </SheetDescription>

        {/* Dynamic List Card */}
        <div className="card-native overflow-hidden">
          {items.map((item) => {
            const Icon = item.icon
            return (
              <div key={item.id} onClick={() => handleItemClick(item.link)} className="row-native cursor-pointer">
                <div
                  className={cn(
                    'flex size-9 shrink-0 items-center justify-center rounded-xl',
                    item.completed ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground',
                  )}
                >
                  <Icon size={18} />
                </div>

                <div className="min-w-0 flex-1 flex flex-col gap-0.5">
                  <span className="truncate text-[15px] font-bold text-foreground">{item.label}</span>
                  <span className="truncate text-[13px] font-medium text-muted-foreground">{item.desc}</span>
                </div>

                {item.completed ? (
                  <span className="pill bg-success/12 text-success shrink-0">{item.actionText}</span>
                ) : (
                  <span className="shrink-0 text-[13.5px] font-extrabold text-primary">{item.actionText}</span>
                )}
              </div>
            )
          })}
        </div>

        {/* Footer Link */}
        <div className="pt-2 text-center">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="cursor-pointer text-[14.5px] font-bold text-muted-foreground"
          >
            לא עכשיו — הזכר לי בעוד שבוע
          </button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
