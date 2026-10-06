import { chromium } from '/home/roee/.npm/lib/node_modules/playwright/index.mjs'
import path from 'path'

const OUT_DIR = '/home/roee/.gemini/antigravity/brain/d8b5f714-fc0d-4cce-9853-e64e1a56a3aa'

async function debug() {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] })
  const page = await browser.newPage({ locale: 'he-IL', colorScheme: 'dark' })
  page.on('console', msg => console.log('BROWSER LOG:', msg.text()))
  page.on('pageerror', err => console.log('BROWSER ERR:', err.message))

  await page.goto('http://localhost:3101/auth/login')
  await page.waitForTimeout(1000)
  console.log('Current URL:', page.url())

  await page.screenshot({ path: path.join(OUT_DIR, 'debug_login.png') })

  const emailInput = page.locator('input[type="email"]')
  if (await emailInput.isVisible()) {
    await emailInput.click()
    await emailInput.fill('roee1454@gmail.com')
    const passwordInput = page.locator('input[type="password"]')
    await passwordInput.click()
    await passwordInput.fill('roeeheily123')
    await page.locator('button[type="submit"]').click()
    console.log('Clicked submit')
    await page.waitForTimeout(3000)
    console.log('URL after submit:', page.url())
    await page.screenshot({ path: path.join(OUT_DIR, 'debug_after_submit.png') })
  }

  await browser.close()
}

debug().catch(console.error)
