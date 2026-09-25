import { useState, useEffect, useRef, useMemo } from 'react'

/**
 * Pure debounce function with cancel method.
 */
export function debounce<Args extends unknown[]>(
  callback: (...args: Args) => void,
  delayMs: number = 300
): ((...args: Args) => void) & { cancel: () => void } {
  let timer: ReturnType<typeof setTimeout> | null = null

  const debounced = (...args: Args) => {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => {
      callback(...args)
    }, delayMs)
  }

  debounced.cancel = () => {
    if (timer) {
      clearTimeout(timer)
      timer = null
    }
  }

  return debounced
}

/**
 * Returns a debounced copy of the passed value after `delayMs` milliseconds.
 */
export function useDebounce<T>(value: T, delayMs: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value)
    }, delayMs)

    return () => {
      clearTimeout(timer)
    }
  }, [value, delayMs])

  return debouncedValue
}

/**
 * Returns a debounced version of the provided callback that delays invoking `callback`
 * until after `delayMs` milliseconds have elapsed since the last time the debounced function was invoked.
 */
export function useDebouncedCallback<Args extends unknown[]>(
  callback: (...args: Args) => void,
  delayMs: number = 300
): (...args: Args) => void {
  const callbackRef = useRef(callback)
  useEffect(() => {
    callbackRef.current = callback
  }, [callback])

  const debouncedFn = useMemo(() => {
    return debounce((...args: Args) => {
      callbackRef.current(...args)
    }, delayMs)
  }, [delayMs])

  useEffect(() => {
    return () => {
      debouncedFn.cancel()
    }
  }, [debouncedFn])

  return debouncedFn
}

