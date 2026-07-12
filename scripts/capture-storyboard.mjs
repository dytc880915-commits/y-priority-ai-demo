import fs from 'node:fs/promises'
import path from 'node:path'
import { chromium } from 'playwright'

const url = process.env.Y_PRIORITY_URL || 'http://127.0.0.1:5177/'
const output = process.env.Y_PRIORITY_STORYBOARD_DIR || path.resolve('..', 'artifacts', 'product-storyboard')
const browser = await chromium.launch({ headless: true })
const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 })
const page = await context.newPage()
await fs.mkdir(output, { recursive: true })

async function focus(id, offset = 92) {
  await page.locator(`#${id}`).evaluate((element, topOffset) => {
    window.scrollTo({ top: element.getBoundingClientRect().top + window.scrollY - topOffset, behavior: 'instant' })
  }, offset)
  await page.waitForTimeout(250)
}

async function capture(name) {
  await page.screenshot({ path: path.join(output, name) })
}

async function navigate(label, id) {
  await page.locator('nav button', { hasText: label }).click()
  await focus(id)
}

await page.goto(url, { waitUntil: 'networkidle' })
await page.evaluate(() => localStorage.clear())
await page.reload({ waitUntil: 'networkidle' })

await capture('01-overview-app.png')

await navigate('서비스 연계', 'ecosystem')
await focus('ecosystem', 0)
await capture('01b-ecosystem-app.png')

await navigate('데이터 품질', 'quality')
await capture('02-quality-app.png')

await navigate('지역 비교', 'district')
await capture('03-district-all-app.png')
await page.locator('.context-bar button', { hasText: '처인구' }).click()
await navigate('지역 비교', 'district')
await capture('04-district-cheoin-app.png')

await navigate('AI 검토', 'cluster-review')
await capture('05-ai-review-before-app.png')
await page.locator('.review-form input').first().fill('보육·양육 지원 신청')
await page.locator('.review-form label', { hasText: '검토 상태' }).locator('select').selectOption({ label: '승인' })
await page.locator('.review-form label.wide input').fill('표현 통합과 담당자 검토 반영 (DEMO)')
await page.locator('.review-form textarea').fill('원자료 확인 후 담당자가 승인한 시연용 검토 이력입니다.')
await page.locator('.review-actions button').click()
await navigate('AI 검토', 'cluster-review')
await capture('06-ai-review-after-app.png')
await page.locator('.review-history').evaluate((element) => window.scrollTo({ top: element.getBoundingClientRect().top + window.scrollY - 500, behavior: 'instant' }))
await page.waitForTimeout(250)
await capture('07-ai-review-history-app.png')

await page.locator('.context-bar button', { hasText: '전체' }).click()
await navigate('우선순위', 'priority')
await capture('08-priority-default-app.png')
await page.locator('.weight-controls input').first().fill('50')
await page.locator('.weight-controls input').first().dispatchEvent('change')
await page.waitForTimeout(150)
await capture('09-priority-adjusted-app.png')

await navigate('이슈 상세', 'detail')
await capture('10-detail-app.png')
await navigate('실행 보고서', 'report')
await capture('11-report-app.png')
await navigate('사용자 검증', 'validation')
await capture('12-validation-app.png')
await navigate('성과 추적', 'outcomes')
await focus('outcomes', 0)
await capture('12b-outcomes-app.png')

await page.locator('.source-summary button').click()
await page.waitForTimeout(650)
await page.setViewportSize({ width: 1440, height: 800 })
await focus('quality')
await capture('13-demo-mode-app.png')

await browser.close()
console.log(output)
