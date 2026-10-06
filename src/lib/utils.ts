import type { ClassValue } from 'clsx'
import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Safely extracts a user-readable error message from an unknown error,
 * including Error instances, PocketBase ClientResponseError objects, or fallback.
 */
export function getErrorMessage(err: unknown, fallback = 'שגיאה לא ידועה'): string {
  if (err instanceof Error && err.message) {
    return err.message
  }
  if (typeof err === 'string' && err.trim().length > 0) {
    return err
  }
  if (typeof err === 'object' && err !== null && 'message' in err && typeof (err).message === 'string') {
    return (err as { message: string }).message
  }
  return fallback
}
