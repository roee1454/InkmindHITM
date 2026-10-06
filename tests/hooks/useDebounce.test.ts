import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { debounce } from '@/hooks/useDebounce'

describe('debounce utility', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  it('delays execution by the specified delay', () => {
    const spy = vi.fn()
    const debounced = debounce(spy, 300)

    debounced('a')
    expect(spy).not.toHaveBeenCalled()

    vi.advanceTimersByTime(200)
    expect(spy).not.toHaveBeenCalled()

    vi.advanceTimersByTime(100)
    expect(spy).toHaveBeenCalledTimes(1)
    expect(spy).toHaveBeenCalledWith('a')
  })

  it('coalesces rapid calls and only fires the latest argument', () => {
    const spy = vi.fn()
    const debounced = debounce(spy, 300)

    debounced('first')
    vi.advanceTimersByTime(100)
    debounced('second')
    vi.advanceTimersByTime(100)
    debounced('third')

    expect(spy).not.toHaveBeenCalled()

    vi.advanceTimersByTime(300)
    expect(spy).toHaveBeenCalledTimes(1)
    expect(spy).toHaveBeenCalledWith('third')
  })

  it('cancels scheduled execution when cancel() is invoked', () => {
    const spy = vi.fn()
    const debounced = debounce(spy, 300)

    debounced('hello')
    vi.advanceTimersByTime(200)
    debounced.cancel()

    vi.advanceTimersByTime(300)
    expect(spy).not.toHaveBeenCalled()
  })
})

