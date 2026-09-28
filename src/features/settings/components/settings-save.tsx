import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { Loader2 } from '@/components/ui/icon'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/ToastProvider'

interface SaveHandlers {
  save: () => Promise<unknown>
  reset: () => void
}

interface SaveRegistry {
  handlers: React.RefObject<Map<string, SaveHandlers>>
  setDirty: (id: string, dirty: boolean) => void
}

const SaveContext = createContext<SaveRegistry | null>(null)

/**
 * One settings page's unsaved state. Every form on the page registers here (useSettingsSave), and
 * one bar saves or discards them all — instead of a save button per card that each form placed
 * differently. Switches still apply at once, the way a switch is expected to.
 */
export function SettingsSaveProvider({ children }: { children: ReactNode }) {
  const handlers = useRef(new Map<string, SaveHandlers>())
  const [dirtyIds, setDirtyIds] = useState<ReadonlySet<string>>(new Set())

  const setDirty = useCallback((id: string, dirty: boolean) => {
    setDirtyIds((current) => {
      if (current.has(id) === dirty) return current
      const next = new Set(current)
      if (dirty) next.add(id)
      else next.delete(id)
      return next
    })
  }, [])

  return (
    <SaveContext.Provider value={{ handlers, setDirty }}>
      {children}
      <SettingsSaveBar dirtyIds={dirtyIds} handlers={handlers} />
    </SaveContext.Provider>
  )
}

/**
 * Registers a form with the page's save bar. `save` should reject on failure (mutateAsync) so the
 * bar can say so; `reset` puts the fields back to the saved values.
 */
export function useSettingsSave(id: string, { dirty, save, reset }: { dirty: boolean } & SaveHandlers) {
  const registry = useContext(SaveContext)
  if (!registry) throw new Error('useSettingsSave must be used inside a SettingsPage')
  const { handlers, setDirty } = registry

  // The latest closures, without re-registering (and re-rendering the page) on every keystroke.
  useLayoutEffect(() => {
    handlers.current.set(id, { save, reset })
  })
  useEffect(() => setDirty(id, dirty), [id, dirty, setDirty])
  useEffect(
    () => () => {
      handlers.current.delete(id)
      setDirty(id, false)
    },
    [id, handlers, setDirty],
  )
}

function SettingsSaveBar({ dirtyIds, handlers }: { dirtyIds: ReadonlySet<string>; handlers: React.RefObject<Map<string, SaveHandlers>> }) {
  const { toast } = useToast()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  if (dirtyIds.size === 0) return null

  const saveAll = async () => {
    setSaving(true)
    setError(null)
    const results = await Promise.allSettled([...dirtyIds].map((id) => handlers.current.get(id)?.save()))
    setSaving(false)
    const failed = results.find((r): r is PromiseRejectedResult => r.status === 'rejected')
    if (failed) setError(failed.reason instanceof Error ? failed.reason.message : 'השמירה נכשלה.')
    else toast('השינויים נשמרו', '', 'success')
  }

  const discardAll = () => {
    for (const id of dirtyIds) handlers.current.get(id)?.reset()
    setError(null)
  }

  return (
    // Sticky to the viewport, floating above the content: it's there exactly while something is
    // unsaved, wherever on the page the change was made. It clears the phone's fixed bottom nav
    // (--app-bottom-nav-h is 0 on desktop).
    <div className="pointer-events-none sticky bottom-[calc(1rem+var(--app-bottom-nav-h))] z-20 mt-8 flex justify-center px-1 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2">
      <div
        role="region"
        aria-label="שינויים שלא נשמרו"
        className="pointer-events-auto flex w-full max-w-xl items-center gap-3 rounded-xl border border-border bg-card px-4 py-2.5 shadow-lg"
      >
        <p className={error ? 'min-w-0 flex-1 text-sm font-bold text-destructive' : 'min-w-0 flex-1 text-sm font-bold text-foreground'} role={error ? 'alert' : undefined}>
          {error ?? 'יש שינויים שלא נשמרו'}
        </p>
        <Button type="button" variant="ghost" size="sm" onClick={discardAll} disabled={saving}>
          ביטול
        </Button>
        <Button type="button" size="sm" onClick={saveAll} disabled={saving} className="min-w-24 gap-1.5">
          {saving && <Loader2 size={14} className="animate-spin" />}
          שמירה
        </Button>
      </div>
    </div>
  )
}
