import { describe, expect, it } from 'vitest'
import { QueryClient } from '@tanstack/react-query'
import { invalidateEntityLists, queryKeys } from '@/lib/query-keys'

describe('invalidateEntityLists', () => {
  it('marks every list that can show the record stale, and nothing else', async () => {
    const client = new QueryClient()
    for (const key of [queryKeys.customers, queryKeys.conversations, queryKeys.staffList, ['settings']]) {
      client.setQueryData(key, [])
    }

    await invalidateEntityLists(client, 'customers')

    const invalidated = (key: readonly unknown[]) => client.getQueryState(key)?.isInvalidated
    expect(invalidated(queryKeys.customers)).toBe(true)
    expect(invalidated(queryKeys.conversations)).toBe(true)
    expect(invalidated(queryKeys.staffList)).toBe(false)
    expect(invalidated(['settings'])).toBe(false)
  })
})
