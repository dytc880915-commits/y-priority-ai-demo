import { chromium } from 'playwright'

const url = process.env.Y_PRIORITY_URL || 'http://127.0.0.1:5177/'
const assert = (condition, message) => { if (!condition) throw new Error(message) }
const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, acceptDownloads: true })
const errors = []
page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()) })

try {
  await page.goto(url, { waitUntil: 'networkidle' })
  const initial = await page.evaluate(() => ({
    sections: [...document.querySelectorAll('main > section[id]')].map((node) => ({ id: node.id, visible: getComputedStyle(node).display !== 'none' })),
    overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
  }))
  assert(initial.sections.length === 7, 'expected seven integrated workflow pages')
  assert(initial.sections.filter((item) => item.visible).length === 1, 'only one workflow page should be visible')
  assert(await page.getByRole('navigation', { name: 'Y:Q 주요 업무' }).getByRole('button').count() === 7, 'sidebar should expose seven pages')
  assert(!initial.overflow, 'desktop overflow')
  const overview = await page.locator('#overview').textContent()
  assert(overview?.includes('68,753건'), 'official latest total missing')
  assert(overview?.includes('6,093,079행'), 'public portal baseline total missing')
  assert(await page.locator('#overview .rank-row').count() >= 10, 'integrated briefing rows missing')

  await page.getByRole('button', { name: '민원 변화' }).click()
  assert(new URL(page.url()).hash === '#trend', 'hash navigation failed')
  assert(await page.locator('#trend svg').count() === 2, 'separate baseline/latest charts missing')
  assert(await page.locator('#trend .keyword-band span').count() >= 10, 'official keywords missing')

  await page.getByRole('button', { name: '부서·지역' }).click()
  assert(await page.locator('#operations .bar-row').count() === 10, 'department burden rows missing')
  assert(await page.locator('#operations .district-card').count() === 3, 'district evidence cards missing')

  await page.getByRole('button', { name: '도시 맥락' }).click()
  const context = await page.locator('#context').textContent()
  assert(context?.includes('1,089,693명'), 'population context missing')
  assert(context?.includes('뉴스 관심 TOP 8'), 'news context missing')
  assert(context?.includes('경제·행정 지표'), 'economy context missing')

  await page.getByRole('button', { name: '검토 큐' }).click()
  assert(await page.locator('#priority .decision-list button').count() === 6, 'priority queue missing')
  await page.locator('#priority .review-actions button', { hasText: '승인' }).click()
  assert((await page.locator('#priority .decision-list button').first().textContent())?.includes('승인'), 'review status not applied')
  await page.reload({ waitUntil: 'networkidle' })
  await page.getByRole('button', { name: '검토 큐' }).click()
  assert((await page.locator('#priority .decision-list button').first().textContent())?.includes('승인'), 'review status not persisted')

  await page.getByRole('button', { name: '실행 보고' }).click()
  const downloadPromise = page.waitForEvent('download')
  await page.locator('#report button', { hasText: '의사결정 메모 저장' }).click()
  assert((await (await downloadPromise).suggestedFilename()).endsWith('.txt'), 'report download failed')

  await page.getByRole('button', { name: '데이터 근거' }).click()
  assert(await page.locator('#sources .source-grid article').count() === 4, 'source registry cards missing')
  assert(await page.locator('#sources .limitations p').count() === 5, 'data limitations missing')

  await page.getByRole('button', { name: '최신 데이터 확인' }).click()
  await page.locator('.refresh-notice.success').waitFor({ timeout: 20000 })
  assert((await page.locator('.refresh-notice').textContent())?.includes('공식 2026-05 집계를 적용했습니다'), 'official live refresh failed')

  await page.setViewportSize({ width: 375, height: 812 })
  const mobile = await page.evaluate(() => ({ overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth, targets: [...document.querySelectorAll('.sidebar nav button')].map((node) => Math.round(node.getBoundingClientRect().height)) }))
  assert(!mobile.overflow, 'mobile overflow')
  assert(mobile.targets.every((height) => height >= 44), 'mobile nav target below 44px')
  assert(errors.length === 0, `console errors: ${errors.join(' | ')}`)
  console.log('OK integrated dashboard smoke passed')
  console.log('pages=7')
  console.log('public_baseline_rows=6093079')
  console.log('official_latest=2026-05:68753')
  console.log('context=population+economy+sns+news')
  console.log('live_refresh=passed')
  console.log('review_persistence=passed')
  console.log('report_download=passed')
  console.log('desktop_overflow=false')
  console.log('mobile_overflow=false')
  console.log('console_errors=0')
} finally { await browser.close() }
