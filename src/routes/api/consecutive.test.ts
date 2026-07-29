import { describe, it } from 'vitest'
import dotenv from 'dotenv'

dotenv.config({ path: './.env' })

describe('PocketBase read settings test', () => {
  it('reads settings', async () => {
    try {
      const { getSuperuserClient } = await import('../../integrations/pocketbase/superuser.server')
      const su = await getSuperuserClient()
      const settings = await su.collection('settings').getFullList()
      console.log('--- PocketBase Settings Models:', settings.map(s => s.model))
      console.log('--- Full settings record:', JSON.stringify(settings, null, 2))
    } catch (err: any) {
      console.error('PocketBase read settings error:', err)
    }
  })
})
