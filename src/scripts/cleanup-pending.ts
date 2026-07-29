import PocketBase from 'pocketbase'
import dotenv from 'dotenv'
import path from 'path'
import fs from 'fs'
import { transition } from '../features/conversations/server/state-machine'

// Load .env variables
const envPath = path.resolve(process.cwd(), '.env')
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath })
}

const pbUrl = process.env.POCKETBASE_URL || 'http://127.0.0.1:8090'
const email = process.env.PB_SUPERUSER_EMAIL
const password = process.env.PB_SUPERUSER_PASSWORD

async function main() {
  if (!email || !password) {
    console.error('PB_SUPERUSER_EMAIL or PB_SUPERUSER_PASSWORD env vars are not set')
    process.exit(1)
  }

  const pb = new PocketBase(pbUrl)
  pb.autoCancellation(false)

  // Auth as superuser
  await pb.collection('_superusers').authWithPassword(email, password)
  console.log('Authenticated successfully as superuser.')

  // Calc 48 hours ago
  const limitDate = new Date(Date.now() - 48 * 60 * 60 * 1000)
  const limitStr = limitDate.toISOString()

  // Fetch pending appointments older than 48 hours
  const appointments = await pb.collection('appointments').getFullList({
    filter: `status = "pending" && created < "${limitStr}"`,
  })

  console.log(`Found ${appointments.length} pending appointments to clean up.`)

  for (const appt of appointments) {
    try {
      console.log(`Cancelling appointment: ${appt.id} (Customer: ${appt.customer})`)
      
      // Update appointment status to cancelled
      await pb.collection('appointments').update(appt.id, { status: 'cancelled' })

      // Find and update conversation state (through the validated state machine)
      try {
        const conv = await pb.collection('conversations').getFirstListItem(`customer = "${appt.customer}"`)
        if (['AWAIT_PRICE_OFFER', 'AWAIT_PAYMENT', 'AWAIT_FINAL_CONFIRMATION'].includes(conv.state)) {
          console.log(`Resetting conversation ${conv.id} state to COLLECTING_INFO`)
          await transition(pb, conv.id, 'COLLECTING_INFO', {
            actor: 'system',
            reason: 'cleanup-pending-script',
          })
        }
      } catch {
        // Conversation might not exist or state is already different
      }
    } catch (err) {
      console.error(`Failed to cleanup appointment ${appt.id}:`, err)
    }
  }

  console.log('Cleanup completed successfully.')
}

main().catch(console.error)
