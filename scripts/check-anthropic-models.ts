import dotenv from 'dotenv'
import fs from 'node:fs'
import path from 'node:path'
import Anthropic from '@anthropic-ai/sdk'
import { SYSTEM_AI_MODEL } from '../src/integrations/ai/model/defaults'

dotenv.config()

async function main() {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    console.error('❌ ANTHROPIC_API_KEY is not defined in .env')
    process.exit(1)
  }

  const client = new Anthropic({ apiKey })

  console.log(
    '🔍 Fetching live models from Anthropic API (https://api.anthropic.com/v1/models)...',
  )
  const response = await client.models.list()

  // Filter for Claude Sonnet models
  const sonnetModels = response.data
    .filter((m) => m.id.toLowerCase().includes('sonnet'))
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    )

  const latestSonnet = sonnetModels[0]
  if (!latestSonnet) {
    console.log('⚠️ No Sonnet models found.')
    return
  }

  const isUpToDate = SYSTEM_AI_MODEL === latestSonnet.id

  console.log('\n======================================================')
  console.log('🤖 ANTHROPIC CLAUDE SONNET MODELS (LIVE FROM API)')
  console.log('======================================================')
  console.log(
    `Current CRM Model (defaults.ts): \x1b[36m${SYSTEM_AI_MODEL}\x1b[0m`,
  )
  console.log(
    `Latest Available Model:         \x1b[32m${latestSonnet.id}\x1b[0m (${latestSonnet.display_name})\n`,
  )

  console.log('Available Sonnet Models:')
  for (const model of sonnetModels) {
    const isCurrent = model.id === SYSTEM_AI_MODEL
    const isLatest = model.id === latestSonnet.id
    const tag = isCurrent ? ' 👈 [CURRENT]' : isLatest ? ' 🌟 [LATEST]' : ''
    const releaseDate = model.created_at
      ? model.created_at.split('T')[0]
      : 'Unknown'
    console.log(
      `  • \x1b[1m${model.id.padEnd(28)}\x1b[0m ${model.display_name.padEnd(20)} (${releaseDate})${tag}`,
    )
  }
  console.log('======================================================\n')

  const shouldUpdate =
    process.argv.includes('--update') || process.argv.includes('-u')

  if (!isUpToDate) {
    console.log(
      `⚡ A newer Sonnet model is available: \x1b[32m${latestSonnet.id}\x1b[0m`,
    )
    if (shouldUpdate) {
      const defaultsPath = path.resolve(
        process.cwd(),
        'src/integrations/ai/model/defaults.ts',
      )
      const currentContent = fs.readFileSync(defaultsPath, 'utf8')
      const updatedContent = currentContent.replace(
        /export const SYSTEM_AI_MODEL(: [^=]+)? = ["'][^"']+["']/,
        `export const SYSTEM_AI_MODEL$1 = "${latestSonnet.id}"`,
      )
      fs.writeFileSync(defaultsPath, updatedContent, 'utf8')
      console.log(
        `✅ Updated src/integrations/ai/model/defaults.ts to use "${latestSonnet.id}"!`,
      )
      console.log(
        `💡 Run 'pnpm up @anthropic-ai/sdk @ai-sdk/anthropic' to update TypeScript types.`,
      )
    } else {
      console.log(
        `👉 To update defaults.ts automatically, run: \x1b[33mpnpm ai:models --update\x1b[0m`,
      )
      console.log(
        `   Or manually update SYSTEM_AI_MODEL in src/integrations/ai/model/defaults.ts`,
      )
    }
  } else {
    console.log('✅ Inkmind CRM is already using the latest Sonnet model!')
  }
}

main().catch((err) => {
  console.error('❌ Failed to fetch models:', err.message)
  process.exit(1)
})
