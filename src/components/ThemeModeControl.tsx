import { Monitor, Moon, Sun } from '@/components/ui/icon'
import { cn } from '#/lib/utils.ts'
import type { ThemeMode } from '#/hooks/useTheme'
import { useTheme } from '#/hooks/useTheme'

const OPTIONS: ReadonlyArray<{ id: ThemeMode; label: string; icon: typeof Sun }> = [
  { id: 'light', label: 'בהיר', icon: Sun },
  { id: 'dark', label: 'כהה', icon: Moon },
  { id: 'system', label: 'מערכת', icon: Monitor },
]

/**
 * Light / dark / system, as a segmented control. Rendered in both the desktop sidebar
 * footer and the mobile drawer, so the preference is reachable from anywhere in the app.
 */
export function ThemeModeControl({ className }: { className?: string }) {
  const { mode, setMode } = useTheme()

  return (
    <div
      role="radiogroup"
      aria-label="מצב תצוגה"
      className={cn(
        'flex w-full gap-0.5 rounded-lg border border-border bg-muted/50 p-0.5',
        className,
      )}
    >
      {OPTIONS.map((option) => {
        const active = mode === option.id
        return (
          <button
            key={option.id}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => setMode(option.id)}
            className={cn(
              'flex h-9 flex-1 cursor-pointer select-none items-center justify-center gap-1.5 rounded-md text-xs font-bold transition-colors duration-150 ease-native',
              active
                ? 'bg-card text-foreground shadow-xs'
                : 'text-muted-foreground active:bg-card/60',
            )}
          >
            <option.icon size={14} />
            <span>{option.label}</span>
          </button>
        )
      })}
    </div>
  )
}

export default ThemeModeControl
