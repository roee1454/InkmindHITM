import { describe, expect, it } from 'vitest'
import { conversationLock } from '@/lib/async-lock'

describe('KeyedLock', () => {
  it('serializes operations under the same key in order', async () => {
    const order: number[] = []
    const key = `test-key-${Date.now()}`

    const p1 = conversationLock.runExclusive(key, async () => {
      await new Promise((r) => setTimeout(r, 30))
      order.push(1)
      return 'one'
    })

    const p2 = conversationLock.runExclusive(key, async () => {
      order.push(2)
      return 'two'
    })

    const [r1, r2] = await Promise.all([p1, p2])
    expect(r1).toBe('one')
    expect(r2).toBe('two')
    expect(order).toEqual([1, 2])
  })

  it('runs operations with different keys concurrently', async () => {
    const order: number[] = []
    const key1 = `test-key1-${Date.now()}`
    const key2 = `test-key2-${Date.now()}`

    const p1 = conversationLock.runExclusive(key1, async () => {
      await new Promise((r) => setTimeout(r, 40))
      order.push(1)
    })

    const p2 = conversationLock.runExclusive(key2, async () => {
      await new Promise((r) => setTimeout(r, 10))
      order.push(2)
    })

    await Promise.all([p1, p2])
    // p2 should finish before p1 because they are on different keys
    expect(order).toEqual([2, 1])
  })

  it('propagates error from fn and allows subsequent operations to run', async () => {
    const key = `error-key-${Date.now()}`

    await expect(
      conversationLock.runExclusive(key, async () => {
        throw new Error('failed inside lock')
      }),
    ).rejects.toThrow('failed inside lock')

    // Subsequent operation should not be blocked or rejected
    const res = await conversationLock.runExclusive(key, async () => 'recovered')
    expect(res).toBe('recovered')
  })

  it('times out if operation takes longer than timeoutMs and does not block next operation', async () => {
    const key = `timeout-key-${Date.now()}`

    // Start an operation that would take 500ms, with a 50ms timeout
    const p1 = conversationLock.runExclusive(
      key,
      async () => {
        await new Promise((r) => setTimeout(r, 500))
        return 'never'
      },
      50,
    )

    await expect(p1).rejects.toThrow(`KeyedLock timeout after 50ms for key "${key}"`)

    // Next operation should run cleanly and succeed
    const res = await conversationLock.runExclusive(key, async () => 'next-op', 200)
    expect(res).toBe('next-op')
  })
})

