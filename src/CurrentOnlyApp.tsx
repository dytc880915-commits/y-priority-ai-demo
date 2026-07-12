import { useMemo, useState } from 'react'
import ArrowReload02 from 'coolicons-react/src/outline/Arrow/ArrowReload02.jsx'
import CalendarCheck from 'coolicons-react/src/outline/Calendar/CalendarCheck.jsx'
import ChartLine from 'coolicons-react/src/outline/Interface/ChartLine.jsx'
import Check from 'coolicons-react/src/outline/Interface/Check.jsx'
import CircleWarning from 'coolicons-react/src/outline/Warning/CircleWarning.jsx'
import Download from 'coolicons-react/src/outline/Interface/Download.jsx'
import BookOpen from 'coolicons-react/src/outline/Interface/BookOpen.jsx'
import currentDashboardData from './data/current-dashboard-data.json'
import yonginBrand from './assets/yongin-integrated-brand.jpg'

type CurrentQueue = {
  rank: number
  issue: string
  count: number
  share: number
  impact: string
  matchedKeywords: string[]
  attentionScore: number
  basis: string
}
type OfficialData = {
  sourcePage: string
  capturedAt: string
  latestMonth: string
  latestMonthTotal: number
  latestMonthRate: number
  yearToDateTotal: number
  detailRows: number
  matchedRows: number
  unmatchedRows: number
  yearly: Array<{ year: string; count: number }>
  monthly: Array<{ month: string; count: number; changeRate: number }>
  categories: Array<{ category: string; count: number }>
  keywords: Array<{ keyword: string; count: number; month: string }>
  currentQueue: CurrentQueue[]
  limitations: string[]
}

const initialData = currentDashboardData as OfficialData
const LIVE_DATA_URL = 'https://live-proxy-sooty.vercel.app/api/yongin-dashboard'
const pages = [
  { id: 'overview', label: '최신 브리핑', icon: ChartLine },
  { id: 'csv-input', label: '데이터 갱신', icon: ArrowReload02 },
  { id: 'signals', label: '이슈 분석', icon: CircleWarning },
  { id: 'priority', label: '검토 큐', icon: Check },
  { id: 'report', label: '실행 보고', icon: BookOpen },
  { id: 'outcomes', label: '성과 기록', icon: CalendarCheck },
]

const formatNumber = (value: number) => new Intl.NumberFormat('ko-KR').format(value)
const formatMonth = (value: string) => `${value.slice(0, 4)}-${value.slice(4)}`
const formatPercent = (value: number) => `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`

function Trend({ rows }: { rows: OfficialData['monthly'] }) {
  const width = 940
  const height = 270
  const pad = 42
  const max = Math.max(...rows.map((row) => row.count), 1)
  const min = Math.min(...rows.map((row) => row.count))
  const range = Math.max(max - min, 1)
  const x = (index: number) => pad + index / Math.max(rows.length - 1, 1) * (width - pad * 2)
  const y = (value: number) => height - pad - (value - min) / range * (height - pad * 2)
  const path = rows.map((row, index) => `${index ? 'L' : 'M'} ${x(index)} ${y(row.count)}`).join(' ')
  return <div className="chart-frame official-chart"><svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="용인시 공식 최근 12개월 민원 추이"><path d={path} />{rows.map((row, index) => <g key={row.month}><circle cx={x(index)} cy={y(row.count)} r="5" /><text x={x(index)} y={height - 10} textAnchor="middle">{row.month.slice(2, 4)}.{row.month.slice(4)}</text></g>)}</svg></div>
}

function Kpi({ label, value, detail }: { label: string; value: string; detail: string }) {
  return <article className="kpi"><span>{label}</span><strong>{value}</strong><p>{detail}</p></article>
}

export default function CurrentOnlyApp() {
  const initialPage = pages.some((page) => page.id === location.hash.slice(1)) ? location.hash.slice(1) : 'overview'
  const [activePage, setActivePage] = useState(initialPage)
  const [officialData, setOfficialData] = useState(initialData)
  const [refresh, setRefresh] = useState<{ status: 'idle' | 'loading' | 'success' | 'error'; message: string }>({ status: 'idle', message: '' })
  const [selectedIssue, setSelectedIssue] = useState(initialData.currentQueue[0]?.issue ?? '')
  const [reviews, setReviews] = useState<Record<string, string>>(() => JSON.parse(localStorage.getItem('yq-current-reviews') ?? '{}'))
  const [outcome, setOutcome] = useState({ issue: '', before: '', after: '', minutes: '' })
  const selected = initialData.currentQueue.find((row) => row.issue === selectedIssue) ?? initialData.currentQueue[0]
  const categoryTotal = officialData.categories.reduce((sum, row) => sum + row.count, 0)
  const latestYear = officialData.latestMonth.slice(0, 4)
  const latestMonthNumber = Number(officialData.latestMonth.slice(4))
  const queueMonth = initialData.latestMonth

  const navigate = (id: string) => {
    setActivePage(id)
    history.pushState(null, '', `#${id}`)
    scrollTo({ top: 0, behavior: 'smooth' })
  }
  const refreshOfficial = async () => {
    setRefresh({ status: 'loading', message: '용인시 공식 대시보드 집계를 확인하고 있습니다.' })
    try {
      const response = await fetch(`${LIVE_DATA_URL}?t=${Date.now()}`)
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const payload = await response.json() as Partial<OfficialData> & { fetchedAt?: string }
      setOfficialData((current) => ({ ...current, ...payload, capturedAt: payload.fetchedAt ?? current.capturedAt, detailRows: payload.latestMonth === current.latestMonth ? current.detailRows : 0 }))
      setRefresh({ status: 'success', message: `공식 ${formatMonth(payload.latestMonth ?? '')} 집계를 적용했습니다.` })
    } catch (error) {
      setRefresh({ status: 'error', message: `갱신 실패: ${String(error)} · 저장된 공식 스냅샷을 유지합니다.` })
    }
  }
  const saveReview = (status: string) => {
    const next = { ...reviews, [selectedIssue]: status }
    setReviews(next)
    localStorage.setItem('yq-current-reviews', JSON.stringify(next))
  }
  const reportText = useMemo(() => selected ? `${selected.issue}\n공개 상세 ${formatNumber(selected.count)}건 · ${selected.share}%\n관심도 ${selected.attentionScore.toFixed(1)}점\n영향: ${selected.impact}\n근거: ${selected.basis}\n검토상태: ${reviews[selected.issue] ?? '미검토'}` : '', [selected, reviews])
  const downloadReport = () => {
    const blob = new Blob([reportText], { type: 'text/plain;charset=utf-8' })
    const href = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = href
    anchor.download = `YQ-${selected?.issue ?? '실행브리핑'}.txt`
    anchor.click()
    URL.revokeObjectURL(href)
  }

  return <div className="app-shell official-only">
    <aside className="sidebar">
      <div className="brand"><img src={yonginBrand} alt="용인특례시 통합도시브랜드" /><div><strong>Y:Q</strong><span>용인 공식데이터 의사결정 보조</span></div></div>
      <nav aria-label="Y:Q 주요 업무">{pages.map((page) => <button key={page.id} type="button" className={activePage === page.id ? 'active' : ''} aria-current={activePage === page.id ? 'page' : undefined} onClick={() => navigate(page.id)}><page.icon />{page.label}</button>)}</nav>
      <div className="source-summary"><span>사용 데이터</span><strong>용인시 공식</strong><p>{formatMonth(officialData.latestMonth)} · {formatNumber(officialData.latestMonthTotal)}건</p><button type="button" onClick={refreshOfficial}><ArrowReload02 /> 공식 데이터 갱신</button></div>
    </aside>
    <main data-active-page={activePage}>
      <header className="topbar"><div><span className="product-kicker">YONGIN OFFICIAL DATA ONLY</span><h1>용인시 최신 민원을 실행 검토 후보로</h1><p>공공데이터포털 과거 CSV를 사용하지 않고 용인시 공식 대시보드 데이터만 분석합니다.</p></div><div><button type="button" className="official-refresh" disabled={refresh.status === 'loading'} onClick={refreshOfficial}><ArrowReload02 /> {refresh.status === 'loading' ? '갱신 중' : '공식 데이터 새로고침'}</button><span><CalendarCheck /> 기준 {formatMonth(officialData.latestMonth)}</span></div></header>
      {refresh.message ? <div className={`refresh-notice ${refresh.status}`} role="status">{refresh.message}</div> : null}
      <div className="context-bar"><div><span>데이터 범위</span><b>콜센터 · 국민신문고 · 새올행정시스템</b></div><p>상세 검토 큐 기준 {formatMonth(queueMonth)} · 상세 공개 {formatNumber(initialData.detailRows)}건</p></div>

      <section id="overview" className="section-block">
        <div className="section-title"><span>공식 최신 브리핑</span><h2>{latestYear}년 {latestMonthNumber}월 용인시 민원</h2><p>공식 대시보드 집계와 최신월 상세 공개 범위를 구분해 표시합니다.</p></div>
        <div className="kpi-grid"><Kpi label="최신 월" value={`${formatNumber(officialData.latestMonthTotal)}건`} detail={`전월 대비 ${formatPercent(officialData.latestMonthRate)}`} /><Kpi label={`${latestYear}년 누계`} value={`${formatNumber(officialData.yearToDateTotal)}건`} detail={`1월~${latestMonthNumber}월 부분연도`} /><Kpi label="상세 공개" value={`${formatNumber(initialData.detailRows)}건`} detail="최신월 키워드별 상세 범위" /><Kpi label="최다 공식 분류" value={officialData.categories[0]?.category ?? '-'} detail={`${formatNumber(officialData.categories[0]?.count ?? 0)}건`} /></div>
        <div className="official-overview-grid"><div><h3>공식 분류 TOP 5</h3>{officialData.categories.slice(0, 5).map((row, index) => <button key={row.category} onClick={() => navigate('signals')}><b>{String(index + 1).padStart(2, '0')}</b><span>{row.category}</span><strong>{formatNumber(row.count)}건</strong><em>{(row.count / categoryTotal * 100).toFixed(1)}%</em></button>)}</div><div><h3>최신 이슈 군집 TOP 5</h3>{initialData.currentQueue.map((row) => <button key={row.issue} onClick={() => { setSelectedIssue(row.issue); navigate('priority') }}><b>{String(row.rank).padStart(2, '0')}</b><span>{row.issue}</span><strong>{formatNumber(row.count)}건</strong><em>{row.attentionScore.toFixed(1)}점</em></button>)}</div></div>
        <Trend rows={officialData.monthly} />
      </section>

      <section id="csv-input" className="section-block"><div className="section-title"><span>공식 데이터 갱신</span><h2>용인시 대시보드에서 최신 집계 가져오기</h2><p>브라우저 직접 호출은 CORS로 차단되어 Y:Q 서버리스 프록시가 공개 집계만 중계합니다.</p></div><div className="official-data-card"><div><b>공식 원본</b><a href={officialData.sourcePage} target="_blank" rel="noreferrer">데이터로 보는 용인 민원 대시보드</a></div><div><b>마지막 앱 갱신</b><span>{officialData.capturedAt}</span></div><button type="button" className="official-refresh" onClick={refreshOfficial}><ArrowReload02 /> 지금 최신 집계 적용</button></div><div className="scope-notice"><CircleWarning /> 버튼 갱신 대상은 연도·월·분류·키워드 집계입니다. 상세 6,435건은 별도 수집본이며 처리부서 정보가 없습니다.</div></section>

      <section id="signals" className="section-block"><div className="section-title"><span>이슈 분석</span><h2>공식 분류와 주요 키워드</h2><p>키워드 빈도는 중복 태깅될 수 있어 전체 민원 수와 합산하지 않습니다.</p></div><div className="official-analysis-grid"><div><h3>민원 분류</h3>{officialData.categories.map((row) => <p key={row.category}><span>{row.category}</span><b>{formatNumber(row.count)}건</b></p>)}</div><div><h3>키워드 TOP 20</h3><div className="keyword-grid">{officialData.keywords.map((row) => <span key={row.keyword}><b>{row.keyword}</b>{formatNumber(row.count)}건</span>)}</div></div></div><Trend rows={officialData.monthly} /></section>

      <section id="priority" className="section-block"><div className="section-title"><span>최신 상세 기반 검토 큐</span><h2>{formatMonth(queueMonth)} 이슈 군집</h2><p>빈도 80%와 군집 키워드 폭 20%로 만든 관심도이며 행정 처리 우선순위를 자동 확정하지 않습니다.</p></div><div className="current-review-layout"><div className="current-review-list">{initialData.currentQueue.map((row) => <button key={row.issue} className={selected?.issue === row.issue ? 'selected' : ''} onClick={() => setSelectedIssue(row.issue)}><b>{String(row.rank).padStart(2, '0')}</b><span><strong>{row.issue}</strong><small>{formatNumber(row.count)}건 · {row.share}% · {reviews[row.issue] ?? '미검토'}</small></span><em>{row.attentionScore.toFixed(1)}점</em></button>)}</div>{selected ? <aside className="current-review-detail"><span>담당자 검토</span><h3>{selected.issue}</h3><p><b>공개 상세 빈도</b>{formatNumber(selected.count)}건 · {selected.share}%</p><p><b>영향</b>{selected.impact}</p><p><b>키워드</b>{selected.matchedKeywords.join(' · ')}</p><div><button onClick={() => saveReview('승인')}>승인</button><button onClick={() => saveReview('보류')}>보류</button><button onClick={() => saveReview('추가확인')}>추가 확인</button></div><small>{selected.basis}</small></aside> : null}</div></section>

      <section id="report" className="section-block"><div className="section-title"><span>실행 보고</span><h2>선택 이슈 한 장 브리핑</h2><p>공식 데이터 근거와 검토 상태를 내보냅니다.</p></div>{selected ? <div className="official-report"><span>{formatMonth(queueMonth)} 용인시 공식 상세</span><h3>{selected.issue}</h3><div className="kpi-grid"><Kpi label="상세 빈도" value={`${formatNumber(selected.count)}건`} detail={`${selected.share}%`} /><Kpi label="관심도" value={`${selected.attentionScore.toFixed(1)}점`} detail="빈도·키워드 폭" /><Kpi label="검토 상태" value={reviews[selected.issue] ?? '미검토'} detail="담당자 최종 판단 필요" /><Kpi label="데이터 범위" value={`${formatNumber(initialData.detailRows)}건`} detail="최신월 상세 공개" /></div><pre>{reportText}</pre><button type="button" className="official-refresh" onClick={downloadReport}><Download /> 브리핑 저장</button></div> : null}</section>

      <section id="outcomes" className="section-block"><div className="section-title"><span>성과 기록</span><h2>조치 전후 결과를 실제 값으로 기록</h2><p>목표가 아니라 실제 민원량과 검토시간만 입력합니다.</p></div><div className="outcome-inputs"><label>이슈<input value={outcome.issue} onChange={(event) => setOutcome({ ...outcome, issue: event.target.value })} /></label><label>조치 전 민원<input type="number" value={outcome.before} onChange={(event) => setOutcome({ ...outcome, before: event.target.value })} /></label><label>조치 후 민원<input type="number" value={outcome.after} onChange={(event) => setOutcome({ ...outcome, after: event.target.value })} /></label><label>검토시간(분)<input type="number" value={outcome.minutes} onChange={(event) => setOutcome({ ...outcome, minutes: event.target.value })} /></label></div>{outcome.before && outcome.after ? <div className="outcome-kpis"><Kpi label="민원 변화" value={`${((Number(outcome.after) - Number(outcome.before)) / Number(outcome.before) * 100).toFixed(1)}%`} detail={`${outcome.before}건 → ${outcome.after}건`} /><Kpi label="검토시간" value={`${outcome.minutes || '-'}분`} detail="실제 기록" /><Kpi label="상태" value="검증 입력" detail="성과 확정 아님" /></div> : <p className="empty-state">아직 실제 전후 기록이 없습니다.</p>}</section>
      <footer><span>데이터: 용인시 공식 대시보드</span><span>Y:Q · AI 제안, 사람의 최종 판단</span></footer>
    </main>
  </div>
}
