import path from 'node:path'
import fs from 'node:fs/promises'
import { chromium } from 'playwright'

const url = process.env.Y_PRIORITY_URL || 'http://127.0.0.1:5177/'
const output = process.env.Y_PRIORITY_SCREENSHOT_DIR || path.resolve('..', 'artifacts', 'premium-ui')
const browser = await chromium.launch({ headless: true })
await fs.mkdir(output, { recursive: true })

for (const viewport of [{ name: 'desktop', width: 1440, height: 1000 }, { name: 'mobile', width: 375, height: 812 }]) {
  const page = await browser.newPage({ viewport: { width: viewport.width, height: viewport.height }, deviceScaleFactor: 1 })
  await page.goto(url, { waitUntil: 'networkidle' })
  await page.screenshot({ path: path.join(output, `${viewport.name}-viewport.png`) })
  await page.screenshot({ path: path.join(output, `${viewport.name}.png`), fullPage: true })
  if (viewport.name === 'desktop') {
    for (const [id, name] of [
      ['district', 'district-section.png'],
      ['cluster-review', 'ai-review-section.png'],
      ['priority', 'priority-section.png'],
      ['detail', 'detail-section.png'],
      ['report', 'report-section.png'],
      ['validation', 'validation-section.png'],
    ]) {
      await page.locator(`#${id}`).screenshot({ path: path.join(output, name) })
    }
  }
  await page.close()
}

await browser.close()
console.log(output)
