import { getSuperuserClient } from './src/integrations/pocketbase/superuser.server.js'
import dotenv from 'dotenv'
dotenv.config()

async function test() {
  console.log('Testing getSuperuserClient...')
  try {
    const su = await getSuperuserClient()
    console.log('Succeeded! Client valid:', su.authStore.isValid)
  } catch (err) {
    console.error('Failed with error:', err.message)
  }
}
test()
