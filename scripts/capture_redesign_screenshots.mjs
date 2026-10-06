import { chromium } from '/home/roee/.npm/lib/node_modules/playwright/index.mjs'
import path from 'path'

const OUT_DIR = '/home/roee/.gemini/antigravity/brain/d8b5f714-fc0d-4cce-9853-e64e1a56a3aa'

async function run() {
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  })
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    locale: 'he-IL',
    colorScheme: 'dark',
  })
  const page = await context.newPage()

  console.log('1. Navigating to login...')
  await page.goto('http://localhost:3101/auth/login')
  await page.waitForTimeout(1000)

  const emailInput = page.locator('input[type="email"]')
  if (await emailInput.isVisible()) {
    await emailInput.fill('roee1454@gmail.com')
    const passwordInput = page.locator('input[type="password"]')
    await passwordInput.fill('roeeheily123')
    await page.locator('button[type="submit"]').click()
    await page.waitForFunction(() => window.location.pathname.startsWith('/dashboard'), { timeout: 10000 })
    console.log('Logged in successfully.')
    await page.waitForTimeout(1500)
  }

  console.log('2. Navigating to Calendar...')
  await page.goto('http://localhost:3101/dashboard/calendar')
  await page.waitForTimeout(2000)

  // Find an appointment or click on projects board
  console.log('3. Navigating to Projects board...')
  await page.goto('http://localhost:3101/dashboard/projects')
  await page.waitForTimeout(2000)

  // Look for a project row/card to open ProjectPanel
  const projectRow = page.locator('table tbody tr, [data-project-id], [role="button"]').first()
  if (await projectRow.isVisible()) {
    console.log('Clicking project row...')
    await projectRow.click()
    await page.waitForTimeout(1500)
    console.log('Capturing ProjectPanel Sheet...')
    await page.screenshot({ path: path.join(OUT_DIR, '02-project-panel-redesign.png') })
  } else {
    console.log('No project row found, capturing current page...')
    await page.screenshot({ path: path.join(OUT_DIR, '02-project-panel-redesign.png') })
  }

  await browser.close()
  console.log('Done.')
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})
