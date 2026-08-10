import type { ComponentType } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { ChevronRight } from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetDescription,
  SheetHandle,
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
      <SheetContent
        side="bottom"
        className="mx-auto w-full max-w-lg rounded-t-[28px] border-t border-border bg-card p-6 shadow-2xl max-h-[90svh] overflow-y-auto font-assistant space-y-5 select-none"
        dir="rtl"
      >
        <SheetHandle />

        {/* Top Header with Back button */}
        <div className="flex items-center justify-between border-b border-border pb-3">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="flex size-10 items-center justify-center rounded-xl text-muted-foreground hover:bg-muted cursor-pointer"
          >
            <ChevronRight size={22} />
          </button>
          <SheetTitle className="text-lg font-extrabold text-foreground">
            השלמת הגדרה
          </SheetTitle>
          <div className="size-10" />
        </div>

        <SheetDescription className="text-sm font-medium text-muted-foreground text-center">
          אף אחת מאלה לא חוסמת אותך. הסוכן עובד גם בלעדיהן.
        </SheetDescription>

        {/* Dynamic List Card */}
        <div className="rounded-[22px] border border-border bg-card overflow-hidden shadow-xs">
          <div className="divide-y divide-border/60">
            {items.map((item) => {
              const Icon = item.icon
              return (
                <div
                  key={item.id}
                  onClick={() => handleItemClick(item.link)}
                  className="flex items-center gap-3 px-4 py-3.5 cursor-pointer select-none transition-colors active:bg-muted/40 hover:bg-muted/20"
                >
                  <div
                    className={cn(
                      'flex size-9 shrink-0 items-center justify-center rounded-xl',
                      item.completed
                        ? 'bg-emerald-500/10 text-emerald-600'
                        : 'bg-muted text-muted-foreground',
                    )}
                  >
                    <Icon size={18} />
                  </div>

                  <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                    <span className="text-[15px] font-bold text-foreground truncate">
                      {item.label}
                    </span>
                    <span className="text-[13px] text-muted-foreground font-medium truncate">
                      {item.desc}
                    </span>
                  </div>

                  {item.completed ? (
                    <span className="text-xs font-extrabold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 shrink-0">
                      {item.actionText}
                    </span>
                  ) : (
                    <span className="text-[13.5px] font-extrabold text-primary shrink-0 hover:underline">
                      {item.actionText}
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Footer Link */}
        <div className="pt-2 text-center">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="text-[14.5px] font-bold text-muted-foreground hover:text-foreground cursor-pointer"
          >
            לא עכשיו — הזכר לי בעוד שבוע
          </button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
