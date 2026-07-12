import { chromium } from 'playwright'

const url = process.env.Y_PRIORITY_URL || 'http://127.0.0.1:5177/'

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, acceptDownloads: true })
const errors = []
page.on('console', (message) => {
  if (message.type() === 'error') errors.push(message.text())
})

try {
  await page.goto(url, { waitUntil: 'networkidle' })
  const initial = await page.evaluate(() => ({
    sections: [...document.querySelectorAll('main > section[id]')].map((section) => ({
      id: section.id,
      visible: getComputedStyle(section).display !== 'none',
    })),
    overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
  }))
  assert(initial.sections.length === 6, 'expected six official-data workflow pages')
  assert(initial.sections.filter((section) => section.visible).length === 1, 'exactly one workflow page should be visible')
  assert(initial.sections.find((section) => section.id === 'overview')?.visible, 'overview should be the initial page')
  assert(await page.getByRole('navigation', { name: 'Y:Q 주요 업무' }).getByRole('button').count() === 6, 'sidebar should expose six pages')
  assert(!initial.overflow, 'desktop page overflow')
  assert((await page.locator('#overview').textContent())?.includes('68,753건'), 'latest official monthly total missing')
  assert((await page.locator('#overview').textContent())?.includes('363,132건'), 'official year-to-date total missing')
  assert(await page.locator('#overview .official-overview-grid > div:first-child button').count() === 5, 'official category top five missing')
  assert(await page.locator('#overview .official-overview-grid > div:last-child button').count() === 5, 'current issue queue top five missing')

  await page.keyboard.press('Tab')
  const focus = await page.evaluate(() => {
    const active = document.activeElement
    if (!(active instanceof HTMLElement)) return null
    const style = getComputedStyle(active)
    return { tag: active.tagName, outline: style.outlineStyle, width: style.outlineWidth }
  })
  assert(focus && ['A', 'BUTTON', 'INPUT'].includes(focus.tag), 'keyboard focus did not reach a control')
  assert(focus.outline !== 'none' && focus.width !== '0px', 'keyboard focus indicator missing')

  await page.getByRole('button', { name: '이슈 분석' }).click()
  assert(new URL(page.url()).hash === '#signals', 'page navigation did not update hash')
  assert(await page.locator('#signals').evaluate((node) => getComputedStyle(node).display !== 'none'), 'signals page did not open')
  assert(await page.locator('#signals .official-analysis-grid > div:first-child p').count() === 6, 'official categories missing')
  assert(await page.locator('#signals .keyword-grid span').count() > 0, 'official keywords missing')
  assert(await page.locator('#signals svg circle').count() === 12, 'official monthly trend missing')

  await page.getByRole('button', { name: '공식 데이터 새로고침' }).click()
  await page.locator('.refresh-notice.success').waitFor({ timeout: 20000 })
  assert((await page.locator('.refresh-notice').textContent())?.includes('공식 2026-05 집계를 적용했습니다'), 'live official refresh failed')

  await page.getByRole('button', { name: '검토 큐' }).click()
  assert(await page.locator('#priority .current-review-list button').count() === 5, 'review queue should contain five official-detail clusters')
  await page.locator('#priority .current-review-detail button', { hasText: '승인' }).click()
  assert((await page.locator('#priority .current-review-list button').first().textContent())?.includes('승인'), 'review status not applied')
  await page.reload({ waitUntil: 'networkidle' })
  await page.getByRole('button', { name: '검토 큐' }).click()
  assert((await page.locator('#priority .current-review-list button').first().textContent())?.includes('승인'), 'review status did not persist')

  await page.getByRole('button', { name: '실행 보고' }).click()
  const downloadPromise = page.waitForEvent('download')
  await page.locator('#report button', { hasText: '브리핑 저장' }).click()
  const download = await downloadPromise
  assert((await download.suggestedFilename()).endsWith('.txt'), 'briefing text download failed')

  await page.getByRole('button', { name: '성과 기록' }).click()
  const inputs = page.locator('#outcomes input')
  await inputs.nth(0).fill('보육 지원')
  await inputs.nth(1).fill('100')
  await inputs.nth(2).fill('80')
  await inputs.nth(3).fill('25')
  assert((await page.locator('#outcomes .outcome-kpis').textContent())?.includes('-20.0%'), 'before-after outcome calculation failed')

  await page.setViewportSize({ width: 375, height: 812 })
  const mobile = await page.evaluate(() => ({
    overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    navHeights: [...document.querySelectorAll('.sidebar nav button')].map((button) => Math.round(button.getBoundingClientRect().height)),
  }))
  assert(!mobile.overflow, 'mobile page overflow')
  assert(mobile.navHeights.every((height) => height >= 44), 'mobile navigation target below 44px')
  assert(errors.length === 0, `console errors: ${errors.join(' | ')}`)

  console.log('OK official-data-only browser smoke passed')
  console.log('pages=6')
  console.log('official_latest=2026-05:68753')
  console.log('official_ytd=363132')
  console.log('live_refresh=passed')
  console.log('review_persistence=passed')
  console.log('report_download=passed')
  console.log('desktop_overflow=false')
  console.log('mobile_overflow=false')
  console.log('console_errors=0')
} finally {
  await browser.close()
}
