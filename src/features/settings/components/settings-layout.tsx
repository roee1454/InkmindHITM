import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { SettingsSaveProvider } from './settings-save'

/**
 * Every settings page's frame: one width, one heading, one save bar (docs/settings-redesign.md).
 * The mobile top bar already names the page, so the heading shows from `lg` only.
 */
export function SettingsPage({ title, description, children, wide = false }: { title: string; description?: string; children: ReactNode; wide?: boolean }) {
  return (
    <SettingsSaveProvider>
      <div className={cn('flex w-full flex-col gap-8 px-4 pt-5 pb-10 font-assistant lg:px-10 lg:pt-8', wide ? 'max-w-5xl' : 'max-w-3xl')} dir="rtl">
        <header className="page-head hidden lg:flex">
          <h1>{title}</h1>
          {description && <p>{description}</p>}
        </header>
        {children}
      </div>
    </SettingsSaveProvider>
  )
}

interface SettingsSectionProps {
  title: string
  description?: ReactNode
  /** One action for the whole section — "הוספה" on a list, say — beside the heading. */
  action?: ReactNode
  children: ReactNode
  /** The children bring their own surface (a list with its own empty state, a skeleton). */
  bare?: boolean
  tone?: 'default' | 'danger'
}

/** A heading and one surface of rows. The surface is the page's only card; rows never nest one. */
export function SettingsSection({ title, description, action, children, bare = false, tone = 'default' }: SettingsSectionProps) {
  return (
    <section className="flex flex-col gap-3" aria-label={title}>
      <div className="flex items-end justify-between gap-3 px-1">
        <div className="flex min-w-0 flex-col gap-0.5">
          <h2 className={cn('text-base font-extrabold tracking-tight text-balance', tone === 'danger' ? 'text-destructive' : 'text-foreground')}>{title}</h2>
          {description && <p className="text-sm text-muted-foreground text-pretty">{description}</p>}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      {bare ? children : <div className={cn('card-native overflow-hidden', tone === 'danger' && 'border-destructive/30')}>{children}</div>}
    </section>
  )
}

interface SettingsRowProps {
  label: ReactNode
  hint?: ReactNode
  htmlFor?: string
  children?: ReactNode
  /** The control needs the full width (a paragraph of text, a list): it goes under the label. */
  stacked?: boolean
  /** Marks the value as the studio's open decision (see ProjectPolicy's "undecided"). */
  badge?: ReactNode
}

/**
 * One setting: what it is and what it does, then the control. Side by side from `sm`, the control
 * in a fixed column so every row's controls line up; stacked on a phone and for wide controls.
 */
export function SettingsRow({ label, hint, htmlFor, children, stacked = false, badge }: SettingsRowProps) {
  const Label = htmlFor ? 'label' : 'span'
  return (
    <div
      className={cn(
        'flex flex-col gap-3 border-t border-border/70 px-4 py-4 first:border-t-0',
        !stacked && 'sm:grid sm:grid-cols-[minmax(0,1fr)_minmax(0,17rem)] sm:items-center sm:gap-6',
      )}
    >
      <div className="flex min-w-0 flex-col gap-1">
        <span className="flex flex-wrap items-center gap-2">
          <Label htmlFor={htmlFor} className="text-sm font-bold text-foreground">
            {label}
          </Label>
          {badge}
        </span>
        {hint && <p className="text-xs leading-relaxed text-muted-foreground text-pretty">{hint}</p>}
      </div>
      {children && <div className={cn('min-w-0', !stacked && 'sm:justify-self-end sm:w-full')}>{children}</div>}
    </div>
  )
}
