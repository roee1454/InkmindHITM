import { describe, expect, it, vi, beforeEach } from 'vitest'

const mockSendNotification = vi.fn().mockResolvedValue({})
const mockSetVapidDetails = vi.fn()

vi.mock('web-push', () => ({
  default: {
    sendNotification: (...args: unknown[]) => mockSendNotification(...args),
    setVapidDetails: (...args: unknown[]) => mockSetVapidDetails(...args),
  },
}))

const mockPushSubscriptionsCollection = {
  getFirstListItem: vi.fn(),
  getFullList: vi.fn().mockResolvedValue([]),
  create: vi.fn().mockResolvedValue({ id: 'sub_1' }),
  update: vi.fn().mockResolvedValue({ id: 'sub_1' }),
  delete: vi.fn().mockResolvedValue(true),
}

const mockSu = {
  collection: vi.fn((name: string) => {
    if (name === 'push_subscriptions') return mockPushSubscriptionsCollection
    return {
      getFirstListItem: vi.fn(),
      getFullList: vi.fn().mockResolvedValue([]),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    }
  }),
  filter: vi.fn((str, params) => JSON.stringify({ str, params })),
}

describe('Web Push Server Functions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.VAPID_PUBLIC_KEY = 'test-public-key'
    process.env.VAPID_PRIVATE_KEY = 'test-private-key'
    process.env.VAPID_SUBJECT = 'mailto:test@inkmind.io'
  })

  it('configures VAPID details with keys from environment', async () => {
    const { configureVapid } = await import('@/features/notifications/server/web-push')
    const configured = configureVapid()

    expect(configured).toBe(true)
    expect(mockSetVapidDetails).toHaveBeenCalledWith(
      'mailto:test@inkmind.io',
      'test-public-key',
      'test-private-key',
    )
  })

  it('registers a new push subscription in pocketbase via savePushSubscription', async () => {
    mockPushSubscriptionsCollection.getFirstListItem.mockRejectedValueOnce(new Error('Not found'))

    const { savePushSubscription } = await import('@/features/notifications/server/web-push')
    const result = await savePushSubscription(
      'staff_1',
      {
        endpoint: 'https://web.push.apple.com/test-endpoint',
        keys: {
          p256dh: 'test-p256dh',
          auth: 'test-auth',
        },
        userAgent: 'iPhone Test',
      },
      mockSu,
    )

    expect(result.ok).toBe(true)
    expect(mockPushSubscriptionsCollection.create).toHaveBeenCalledWith({
      staff: 'staff_1',
      endpoint: 'https://web.push.apple.com/test-endpoint',
      p256dh: 'test-p256dh',
      auth: 'test-auth',
      user_agent: 'iPhone Test',
    })
  })

  it('updates an existing push subscription if endpoint already exists', async () => {
    mockPushSubscriptionsCollection.getFirstListItem.mockResolvedValueOnce({
      id: 'existing_sub_1',
      endpoint: 'https://web.push.apple.com/test-endpoint',
    })

    const { savePushSubscription } = await import('@/features/notifications/server/web-push')
    const result = await savePushSubscription(
      'staff_1',
      {
        endpoint: 'https://web.push.apple.com/test-endpoint',
        keys: {
          p256dh: 'new-p256dh',
          auth: 'new-auth',
        },
      },
      mockSu,
    )

    expect(result.ok).toBe(true)
    expect(mockPushSubscriptionsCollection.update).toHaveBeenCalledWith('existing_sub_1', {
      staff: 'staff_1',
      p256dh: 'new-p256dh',
      auth: 'new-auth',
      user_agent: '',
    })
  })

  it('unregisters a push subscription by deleting from pocketbase via deletePushSubscription', async () => {
    mockPushSubscriptionsCollection.getFirstListItem.mockResolvedValueOnce({
      id: 'sub_to_delete',
      endpoint: 'https://web.push.apple.com/delete-me',
    })

    const { deletePushSubscription } = await import('@/features/notifications/server/web-push')
    const result = await deletePushSubscription('https://web.push.apple.com/delete-me', mockSu)

    expect(result.ok).toBe(true)
    expect(mockPushSubscriptionsCollection.delete).toHaveBeenCalledWith('sub_to_delete')
  })
})
