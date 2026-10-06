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

  console.log('1. Logging in...')
  await page.goto('http://localhost:3101/auth/login')
  await page.waitForTimeout(1000)

  const emailInput = page.locator('input[type="email"]')
  await emailInput.fill('roee1454@gmail.com')
  const passwordInput = page.locator('input[type="password"]')
  await passwordInput.fill('roeeheily123')
  await page.locator('button[type="submit"]').click()
  await page.waitForTimeout(3000)
  console.log('Logged in. Current URL:', page.url())

  // 2. Go to Projects page
  console.log('2. Navigating to Projects page...')
  await page.goto('http://localhost:3101/dashboard/projects')
  await page.waitForTimeout(2000)

  // Look for any project card / row to click
  console.log('3. Clicking a project to open ProjectPanel...')
  // Could be in a table row or kanban card or pipeline list
  const projectItem = page.locator('[data-project-id], tr, [role="row"], .cursor-pointer').filter({ hasText: /קעקוע|שרוול|פרויקט|סקיצה/ }).first()
  if (await projectItem.isVisible()) {
    await projectItem.click()
  } else {
    // If not found by text, click the first clickable table row or card
    await page.locator('table tbody tr').first().click()
  }

  await page.waitForTimeout(1500)
  console.log('Capturing ProjectPanel Sheet (02-project-panel-redesign-sessions.png)...')
  await page.screenshot({ path: path.join(OUT_DIR, '02-project-panel-redesign-sessions.png') })

  // 4. Switch to Payments Tab
  console.log('4. Switching to Payments Tab...')
  const paymentsTab = page.getByRole('tab', { name: /תשלומים ופיננסים/ })
  if (await paymentsTab.isVisible()) {
    await paymentsTab.click()
    await page.waitForTimeout(800)
    console.log('Capturing ProjectPanel Sheet with Payments Tab (03-project-panel-redesign-payments.png)...')
    await page.screenshot({ path: path.join(OUT_DIR, '03-project-panel-redesign-payments.png') })
  }

  // 5. Navigate to Calendar to test CloseSessionDialog
  console.log('5. Navigating to Calendar to test CloseSessionDialog...')
  await page.goto('http://localhost:3101/dashboard/calendar')
  await page.waitForTimeout(2000)

  // Switch to list view or click an appointment card
  const listBtn = page.getByRole('button', { name: 'רשימה' })
  if (await listBtn.isVisible()) {
    await listBtn.click()
    await page.waitForTimeout(800)
  }

  const apptCard = page.locator('button, [role="button"]').filter({ hasText: /רואי|דנה|יוסי|קעקוע/ }).first()
  if (await apptCard.isVisible()) {
    await apptCard.click()
    await page.waitForTimeout(1200)

    // In EditAppointmentSheet, click "סגירת פגישה"
    const closeSessionBtn = page.getByRole('button', { name: 'סגירת פגישה' })
    if (await closeSessionBtn.isVisible()) {
      await closeSessionBtn.click()
      await page.waitForTimeout(600)

      const proceedBtn = page.getByRole('button', { name: 'המשך לסגירת פגישה' })
      if (await proceedBtn.isVisible()) {
        await proceedBtn.click()
        await page.waitForTimeout(800)
      }

      console.log('6. Filling final price higher than quote...')
      const finalPriceInput = page.locator('input#final-price')
      if (await finalPriceInput.isVisible()) {
        await finalPriceInput.fill('4500')
        await page.waitForTimeout(600)
        console.log('Capturing CloseSessionDialog with quote exceed warning (04-close-session-quote-warning.png)...')
        await page.screenshot({ path: path.join(OUT_DIR, '04-close-session-quote-warning.png') })
      }
    }
  }

  await browser.close()
  console.log('Finished capturing all screenshots successfully!')
}

run().catch(console.error)
