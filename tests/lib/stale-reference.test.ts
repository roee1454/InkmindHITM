import { describe, expect, it } from 'vitest'
import { createStaleReferenceError, parseStaleReference, stripErrorCode } from '@/lib/stale-reference'
import { formatDatabaseError } from '@/lib/pocketbase-error'

describe('stale reference errors', () => {
  it('round-trips the collection through the error message', () => {
    const error = createStaleReferenceError('customers', 'הלקוח לא קיים')
    expect(parseStaleReference(error)).toBe('customers')
    expect(parseStaleReference(error.message)).toBe('customers')
  })

  it('ignores ordinary errors', () => {
    expect(parseStaleReference(new Error('נכשל'))).toBeNull()
    expect(parseStaleReference(null)).toBeNull()
    expect(parseStaleReference(new Error('[stale-reference:unknown] x'))).toBeNull()
  })

  it('never shows the machine-readable prefix to the user', () => {
    const error = createStaleReferenceError('conversations', 'השיחה נמחקה')
    expect(stripErrorCode(error.message)).toBe('השיחה נמחקה')
    expect(formatDatabaseError(error)).toBe('השיחה נמחקה')
    expect(formatDatabaseError(error.message)).toBe('השיחה נמחקה')
  })
})

describe('firstBatchRequestError', () => {
  it('digs the real cause out of a failed batch', async () => {
    const { ClientResponseError } = await import('pocketbase')
    const { firstBatchRequestError } = await import('@/lib/pocketbase-error')
    const batchError = new ClientResponseError({
      status: 400,
      response: {
        message: 'Batch transaction failed.',
        data: { requests: { 1: { code: 400, message: 'Failed to create record.', data: { amount: { code: 'validation_required', message: 'Missing required value.' } } } } },
      },
    })
    expect(formatDatabaseError(firstBatchRequestError(batchError))).toContain('amount')
    const plain = new Error('x')
    expect(firstBatchRequestError(plain)).toBe(plain)
  })
})
