// @vitest-environment jsdom
import { act, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import type { Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { IMToastProvider, useIMToast } from '@/components/ui/toast'
import type { IMToastOptions } from '@/components/ui/toast'

declare global {
  // eslint-disable-next-line no-var
  var IS_REACT_ACT_ENVIRONMENT: boolean
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true

let container: HTMLDivElement
let root: Root

function Show({ options }: { options: IMToastOptions[] }) {
  const { show } = useIMToast()
  useEffect(() => {
    for (const o of options) show(o)
  }, [show, options])
  return null
}

function render(...options: IMToastOptions[]) {
  act(() =>
    root.render(
      <IMToastProvider>
        <Show options={options} />
      </IMToastProvider>,
    ),
  )
}

const toasts = () => [...container.querySelectorAll<HTMLElement>('[data-slot="toast"]')]

beforeEach(() => {
  vi.useFakeTimers()
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})

afterEach(() => {
  act(() => root.unmount())
  container.remove()
  vi.useRealTimers()
})

describe('useIMToast().show', () => {
  it('shows the title and the description, with the default tone', () => {
    render({ title: 'הפרטים נשמרו', description: 'הלקוח יקבל עדכון.' })
    const [toast] = toasts()
    expect(toast?.dataset.tone).toBe('default')
    expect(toast?.getAttribute('role')).toBe('status')
    expect(toast?.textContent).toContain('הפרטים נשמרו')
    expect(toast?.textContent).toContain('הלקוח יקבל עדכון.')
  })

  it('announces a destructive toast as an alert, with its tone icon', () => {
    render({ tone: 'destructive', title: 'השמירה נכשלה' })
    const [toast] = toasts()
    expect(toast?.getAttribute('role')).toBe('alert')
    expect(toast?.querySelector('svg')?.getAttribute('class')).toContain('text-destructive')
  })

  it('keeps at most three, dropping the oldest', () => {
    render({ title: 'א' }, { title: 'ב' }, { title: 'ג' }, { title: 'ד' })
    expect(toasts().map((t) => t.textContent?.slice(0, 1))).toEqual(['ב', 'ג', 'ד'])
  })

  it('runs the action and dismisses', () => {
    const onClick = vi.fn()
    render({ title: 'ההודעה נשלחה', action: { label: 'ביטול השליחה', onClick } })
    const action = [...container.querySelectorAll('button')].find((b) => b.textContent === 'ביטול השליחה')
    act(() => action?.click())
    expect(onClick).toHaveBeenCalledOnce()
    act(() => vi.advanceTimersByTime(200))
    expect(toasts()).toHaveLength(0)
  })

  it('makes the whole toast a link when given onClick', () => {
    const onClick = vi.fn()
    render({ title: 'הודעה חדשה מדניאל', onClick })
    const link = [...container.querySelectorAll('button')].find((b) => b.textContent?.includes('הודעה חדשה'))
    act(() => link?.click())
    expect(onClick).toHaveBeenCalledOnce()
  })

  it('goes away after its duration', () => {
    render({ title: 'נשמר', duration: 1000 })
    expect(toasts()).toHaveLength(1)
    act(() => vi.advanceTimersByTime(1000 + 200))
    expect(toasts()).toHaveLength(0)
  })
})
