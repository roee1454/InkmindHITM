import * as React from "react"
import { cn } from "#/lib/utils.ts"

export interface OptionCardButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: React.ReactNode
  title: string
  description?: string
  active?: boolean
  badge?: string
}

export const OptionCardButton = React.forwardRef<HTMLButtonElement, OptionCardButtonProps>(
  ({ className, icon, title, description, active, badge, disabled, onClick, ...props }, ref) => {
    return (
      <button
        ref={ref}
        type="button"
        disabled={disabled}
        onClick={onClick}
        className={cn(
          "flex w-full cursor-pointer flex-col justify-between gap-3 rounded-2xl border p-4 text-right transition-all font-assistant outline-none select-none",
          active
            ? "border-primary bg-primary/10 shadow-sm"
            : "border-border bg-card hover:border-primary/40 hover:bg-accent/50",
          disabled && "cursor-not-allowed opacity-50 hover:border-border hover:bg-card",
          className
        )}
        {...props}
      >
        <div className="flex items-start justify-between gap-3 w-full">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors",
                active ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
              )}
            >
              {icon}
            </div>
            <div>
              <div className="text-sm font-bold text-foreground flex items-center gap-2">
                <span>{title}</span>
                {badge && (
                  <span className="rounded-full bg-primary/20 px-2 py-0.5 text-micro font-semibold text-primary">
                    {badge}
                  </span>
                )}
              </div>
              {description && (
                <div className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                  {description}
                </div>
              )}
            </div>
          </div>
        </div>
      </button>
    )
  }
)

OptionCardButton.displayName = "OptionCardButton"
