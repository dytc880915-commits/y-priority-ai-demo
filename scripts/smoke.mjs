import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

const here = path.dirname(fileURLToPath(import.meta.url))
const appRoot = path.resolve(here, '..')
const projectRoot = path.resolve(appRoot, '..')
const url = process.env.Y_PRIORITY_URL || 'http://127.0.0.1:5177/'

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
const errors = []
page.on('console', (message) => {
  if (message.type() === 'error') errors.push(message.text())
})

try {
  await page.goto(url, { waitUntil: 'networkidle' })
  const desktop = await page.evaluate(() => ({
    sections: [...document.querySelectorAll('section[id]')].map((section) => section.id),
    overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    weights: [...document.querySelectorAll('.weight-controls input')].map((input) => Number(input.value)),
    rows: document.querySelectorAll('tbody tr').length,
    clusters: document.querySelectorAll('.cluster-list article').length,
  }))
  assert(desktop.sections.length === 11, 'expected eleven workflow sections')
  assert(!desktop.overflow, 'desktop page overflow')
  assert(desktop.weights.reduce((sum, value) => sum + value, 0) === 100, 'default weights do not total 100')
  assert(desktop.rows === 6, 'priority rows missing')
  assert(desktop.clusters >= 3, 'AI clusters missing')
  await page.keyboard.press('Tab')
  const keyboardFocus = await page.evaluate(() => {
    const active = document.activeElement
    if (!(active instanceof HTMLElement)) return null
    const style = getComputedStyle(active)
    return { tag: active.tagName, outlineStyle: style.outlineStyle, outlineWidth: style.outlineWidth }
  })
  assert(keyboardFocus && ['A', 'BUTTON', 'INPUT', 'SELECT'].includes(keyboardFocus.tag), 'keyboard focus did not reach an interactive control')
  assert(keyboardFocus.outlineStyle !== 'none' && keyboardFocus.outlineWidth !== '0px', 'keyboard focus indicator is not visible')

  const overallFirst = await page.locator('tbody tr').first().locator('td:nth-child(2) button').textContent()
  await page.locator('.context-bar button', { hasText: '처인구' }).click()
  await page.waitForTimeout(100)
  assert((await page.locator('#priority .section-title span').textContent())?.includes('처인구'), 'district filter did not update priority scope')
  const districtFirst = await page.locator('tbody tr').first().locator('td:nth-child(2) button').textContent()
  assert(await page.locator('.district-grid article.selected').count() === 1, 'district comparison selection missing')
  assert(overallFirst !== districtFirst || (await page.locator('#overview .trend-panel h3').textContent())?.includes('처인구'), 'district data did not update')
  await page.locator('.context-bar button', { hasText: '전체' }).click()

  const validCsv = path.join(projectRoot, 'data', 'extracted', 'yongin_saeol_minwon', '새올 민원 처리 현황(2025).csv')
  await page.locator('input[type=file]').setInputFiles(validCsv)
  await page.locator('.csv-result.valid').waitFor({ timeout: 5000 })
  assert(await page.locator('.csv-result').evaluate((element) => element.classList.contains('valid')), 'valid CSV rejected')

  const invalidCsv = path.join(os.tmpdir(), 'y-priority-invalid.csv')
  await fs.writeFile(invalidCsv, 'foo,bar\n1,2\n', 'utf8')
  await page.locator('input[type=file]').setInputFiles(invalidCsv)
  await page.locator('.csv-result.invalid').waitFor({ timeout: 5000 })
  assert(await page.locator('.csv-result').evaluate((element) => element.classList.contains('invalid')), 'invalid CSV accepted')

  await page.reload({ waitUntil: 'networkidle' })
  const firstRankBefore = await page.locator('tbody tr').first().locator('td:nth-child(2) button').textContent()
  await page.locator('.weight-controls input').first().fill('50')
  await page.locator('.weight-controls input').first().dispatchEvent('change')
  const adjustedWeights = await page.locator('.weight-controls input').evaluateAll((inputs) => inputs.map((input) => Number(input.value)))
  const firstRankAfter = await page.locator('tbody tr').first().locator('td:nth-child(2) button').textContent()
  assert(adjustedWeights.reduce((sum, value) => sum + value, 0) === 100, 'adjusted weights do not total 100')
  assert(firstRankBefore !== firstRankAfter, 'weight change did not affect ranking')
  const reportLink = page.locator('.report-actions a')
  assert((await reportLink.getAttribute('download'))?.endsWith('.html'), 'report download filename missing')
  const reportHref = await reportLink.getAttribute('href')
  assert(reportHref?.startsWith('data:text/html;charset=utf-8,'), 'UTF-8 report data URI missing')
  assert((await reportLink.textContent())?.includes('HTML 저장'), 'report download label missing')
  const reportColors = await reportLink.evaluate((element) => { const style = getComputedStyle(element); return [style.color, style.backgroundColor] })
  assert(reportColors[0] !== reportColors[1], 'report download label has no visible contrast')
  const reportDocument = decodeURIComponent(reportHref.split(',')[1] ?? '')
  assert(reportDocument.includes('@media print') && reportDocument.includes('.no-print'), 'print-ready report CSS missing')

  await page.locator('#cluster-review').scrollIntoViewIfNeeded()
  await page.locator('.review-form input').first().fill('테스트 검토 군집')
  await page.locator('.review-form label.wide input').fill('자동 테스트 변경 근거')
  await page.locator('.review-actions button').click()
  assert((await page.locator('.review-diff > div:last-child b').textContent()) === '테스트 검토 군집', 'cluster review edit not applied')
  await page.reload({ waitUntil: 'networkidle' })
  await page.locator('#cluster-review').scrollIntoViewIfNeeded()
  assert((await page.locator('.review-list button').first().locator('strong').textContent()) === '테스트 검토 군집', 'cluster review did not persist')
  const downloadPromise = page.waitForEvent('download')
  await page.locator('.review-history button', { hasText: 'CSV' }).click()
  const reviewDownload = await downloadPromise
  assert((await reviewDownload.suggestedFilename()).endsWith('.csv'), 'review CSV export failed')
  await page.locator('.review-history button', { hasText: '초기화' }).click()

  await page.locator('#validation').scrollIntoViewIfNeeded()
  await page.locator('.validation-setup input').first().fill('행정 업무 경험자')
  await page.locator('.validation-rating select').nth(0).selectOption('4')
  await page.locator('.validation-rating select').nth(1).selectOption('5')
  await page.locator('.validation-rating select').nth(2).selectOption({ label: '있음' })
  await page.locator('.timer-actions button', { hasText: '새 검증 시작' }).click()
  for (const button of await page.locator('.validation-tasks button').all()) await button.click()
  await page.waitForTimeout(1100)
  await page.locator('.timer-actions button', { hasText: '검증 종료·저장' }).click()
  assert((await page.locator('.validation-report').textContent())?.includes('1명'), 'validation record not aggregated')
  const validationDownloadPromise = page.waitForEvent('download')
  await page.locator('.validation-report button', { hasText: '결과 CSV' }).click()
  const validationDownload = await validationDownloadPromise
  assert((await validationDownload.suggestedFilename()).endsWith('.csv'), 'validation CSV export failed')

  await page.locator('.source-summary button').click()
  assert((await page.locator('.demo-controller').textContent())?.includes('1/3'), 'demo did not start at step one')
  await page.locator('.demo-controller button', { hasText: '다음' }).click()
  assert((await page.locator('.demo-controller').textContent())?.includes('2/3'), 'demo next step failed')
  await page.locator('.demo-controller button', { hasText: '시연 초기화' }).click()
  assert(await page.locator('.demo-controller').count() === 0, 'demo reset failed')

  await page.setViewportSize({ width: 375, height: 812 })
  const mobile = await page.evaluate(() => ({
    overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    navHeights: [...document.querySelectorAll('nav button')].map((button) => Math.round(button.getBoundingClientRect().height)),
  }))
  assert(!mobile.overflow, 'mobile page overflow')
  assert(mobile.navHeights.every((height) => height >= 44), 'mobile navigation target below 44px')
  assert(errors.length === 0, `console errors: ${errors.join(' | ')}`)

  console.log('OK browser smoke passed')
  console.log(`sections=${desktop.sections.length}`)
  console.log(`priority_rows=${desktop.rows}`)
  console.log(`ai_clusters_visible=${desktop.clusters}`)
  console.log('desktop_overflow=false')
  console.log('mobile_overflow=false')
  console.log('console_errors=0')
  console.log('keyboard_focus=passed')
  console.log('print_report=passed')
  console.log('district_filter=passed')
  console.log('cluster_review_persistence=passed')
  console.log('review_export=passed')
  console.log('validation_workbench=passed')
  console.log('demo_three_steps=passed')
} finally {
  await browser.close()
}
