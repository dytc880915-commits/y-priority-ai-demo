import { useMemo, useState } from 'react'
import ArrowReload02 from 'coolicons-react/src/outline/Arrow/ArrowReload02.jsx'
import BookOpen from 'coolicons-react/src/outline/Interface/BookOpen.jsx'
import CalendarCheck from 'coolicons-react/src/outline/Calendar/CalendarCheck.jsx'
import ChartLine from 'coolicons-react/src/outline/Interface/ChartLine.jsx'
import Check from 'coolicons-react/src/outline/Interface/Check.jsx'
import CircleWarning from 'coolicons-react/src/outline/Warning/CircleWarning.jsx'
import Download from 'coolicons-react/src/outline/Interface/Download.jsx'
import data from './data/integrated-dashboard-data.json'
import yonginBrand from './assets/yongin-integrated-brand.jpg'

type Priority = (typeof data.baseline.priorities)[number]
type PageId = 'overview' | 'trend' | 'operations' | 'context' | 'priority' | 'report' | 'sources'

const pages: Array<{ id: PageId; label: string; icon: typeof ChartLine }> = [
  { id: 'overview', label: '통합 브리핑', icon: ChartLine },
  { id: 'trend', label: '민원 변화', icon: ArrowReload02 },
  { id: 'operations', label: '부서·지역', icon: Check },
  { id: 'context', label: '도시 맥락', icon: CircleWarning },
  { id: 'priority', label: '검토 큐', icon: CalendarCheck },
  { id: 'report', label: '실행 보고', icon: BookOpen },
  { id: 'sources', label: '데이터 근거', icon: Download },
]
const liveUrl = 'https://live-proxy-sooty.vercel.app/api/yongin-dashboard'
const number = (value: number) => new Intl.NumberFormat('ko-KR').format(value)
const month = (value: string) => value.includes('-') ? value : `${value.slice(0, 4)}-${value.slice(4)}`

function Kpi({ label, value, detail, tone = '' }: { label: string; value: string; detail: string; tone?: string }) {
  return <article className={`integrated-kpi ${tone}`}><span>{label}</span><strong>{value}</strong><p>{detail}</p></article>
}

function LineChart({ rows, label }: { rows: Array<{ month: string; count: number }>; label: string }) {
  const width = 920, height = 250, pad = 38
  const values = rows.map((row) => row.count)
  const min = Math.min(...values), max = Math.max(...values), range = Math.max(max - min, 1)
  const x = (i: number) => pad + i / Math.max(rows.length - 1, 1) * (width - pad * 2)
  const y = (v: number) => height - pad - (v - min) / range * (height - pad * 2)
  const path = rows.map((row, i) => `${i ? 'L' : 'M'} ${x(i)} ${y(row.count)}`).join(' ')
  return <div className="integrated-chart"><svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={label}><path d={path} />{rows.map((row, i) => <g key={row.month}><circle cx={x(i)} cy={y(row.count)} r="4" /><text x={x(i)} y={height - 10} textAnchor="middle">{row.month.slice(2)}</text></g>)}</svg></div>
}

export default function UnifiedApp() {
  const hash = location.hash.slice(1) as PageId
  const [active, setActive] = useState<PageId>(pages.some((page) => page.id === hash) ? hash : 'overview')
  const [official, setOfficial] = useState(data.officialComplaints)
  const [refresh, setRefresh] = useState({ state: 'idle', message: '' })
  const [selectedIssue, setSelectedIssue] = useState(data.baseline.priorities[0].issue)
  const [reviews, setReviews] = useState<Record<string, string>>(() => {
    try { return JSON.parse(localStorage.getItem('yq-integrated-reviews') ?? '{}') } catch { return {} }
  })
  const selected = data.baseline.priorities.find((row) => row.issue === selectedIssue) ?? data.baseline.priorities[0]
  const currentMonthly = official.monthly.map((row) => ({ month: month(String(row.crtr_ym)), count: Number(row.tot_nocs) }))
  const historicalMonthly = data.baseline.monthly.slice(-24).map((row) => ({ month: row.month, count: row.count }))
  const navigate = (id: PageId) => { setActive(id); history.pushState(null, '', `#${id}`); scrollTo({ top: 0 }) }
  const review = (status: string) => {
    const next = { ...reviews, [selected.issue]: status }
    setReviews(next); localStorage.setItem('yq-integrated-reviews', JSON.stringify(next))
  }
  const refreshOfficial = async () => {
    setRefresh({ state: 'loading', message: '용인시 최신 민원 집계를 확인하고 있습니다.' })
    try {
      const response = await fetch(`${liveUrl}?t=${Date.now()}`)
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const payload = await response.json()
      setOfficial((current) => ({ ...current, latestMonth: payload.latestMonth, latestTotal: payload.latestMonthTotal, latestRate: payload.latestMonthRate, monthly: payload.monthly.map((row: { month: string; count: number; changeRate: number }) => ({ crtr_ym: row.month, tot_nocs: row.count, lsmth_nocs: 0, irds_rt: row.changeRate })), categories: payload.categories.map((row: { category: string; count: number }) => ({ cvlcpt_clsf: row.category, tot_nocs: row.count })), keywords: payload.keywords.map((row: { keyword: string; count: number; month: string }) => ({ crtr_ym: row.month, kwrd: row.keyword, tot_nocs: row.count })) }))
      setRefresh({ state: 'success', message: `공식 ${month(payload.latestMonth)} 집계를 적용했습니다.` })
    } catch (error) { setRefresh({ state: 'error', message: `갱신 실패: ${String(error)}. 저장된 스냅샷을 유지합니다.` }) }
  }
  const report = useMemo(() => `${selected.issue}\n\n[장기 기준선]\n${selected.comparisonPeriod}\n${number(selected.currentCount)}건 · ${selected.growthRate >= 0 ? '+' : ''}${selected.growthRate.toFixed(1)}%\n담당 후보: ${selected.dominantDepartment}\n\n[2026 최신 확인]\n용인시 공식 ${month(official.latestMonth)} 전체 ${number(official.latestTotal)}건\n\n[검토]\n영향: ${selected.impact}\n상태: ${reviews[selected.issue] ?? '미검토'}\n주의: 인구·경제·SNS 지표는 원인을 증명하지 않는 참고 맥락입니다.`, [selected, reviews, official])
  const saveReport = () => {
    const link = document.createElement('a'); link.href = URL.createObjectURL(new Blob([report], { type: 'text/plain;charset=utf-8' })); link.download = `YQ-${selected.issue}.txt`; link.click(); URL.revokeObjectURL(link.href)
  }

  return <div className="app-shell unified-app">
    <aside className="sidebar">
      <div className="brand"><img src={yonginBrand} alt="용인특례시 통합도시브랜드" /><div><strong>Y:Q</strong><span>민원 의사결정 AI</span></div></div>
      <nav aria-label="Y:Q 주요 업무">{pages.map((page) => <button key={page.id} className={active === page.id ? 'active' : ''} aria-current={active === page.id ? 'page' : undefined} onClick={() => navigate(page.id)}><page.icon />{page.label}</button>)}</nav>
      <div className="bundle-status"><span>DATA BUNDLE</span><strong>v{data.bundle.version}</strong><p>민원 {number(data.bundle.publicComplaintRows)}행</p><small>공식 {data.bundle.officialDatasets}종 · 연계 {data.bundle.partnerDownloaded}종</small></div>
    </aside>
    <main data-active-page={active}>
      <header className="topbar integrated-topbar"><div><span className="product-kicker">YONGIN DECISION INTELLIGENCE</span><h1>민원 현황을 다음 행정 행동으로</h1><p>다년 공공데이터와 용인시 최신 지표를 출처별로 분리해 함께 판단합니다.</p></div><button className="official-refresh" disabled={refresh.state === 'loading'} onClick={refreshOfficial}><ArrowReload02 />{refresh.state === 'loading' ? '확인 중' : '최신 데이터 확인'}</button></header>
      {refresh.message && <div className={`refresh-notice ${refresh.state}`} role="status">{refresh.message}</div>}
      <div className="data-period-strip"><span><b>장기 기준선</b> 새올 {data.baseline.period.saeol.min}~{data.baseline.period.saeol.max} · 키워드 {data.baseline.period.keyword.min}~{data.baseline.period.keyword.max}</span><span><b>최신 현황</b> {month(official.latestMonth)}</span><span><b>원칙</b> 기준선과 최신 집계를 직접 합산하지 않음</span></div>

      <section id="overview" className="section-block">
        <div className="section-title"><span>통합 브리핑</span><h2>지금 확인할 행정 신호</h2><p>최신 총량과 장기 검토 후보를 한 화면에서 분리해 봅니다.</p></div>
        <div className="kpi-grid"><Kpi label="2026 최신 월" value={`${number(official.latestTotal)}건`} detail={`전월 대비 ${official.latestRate > 0 ? '+' : ''}${official.latestRate.toFixed(1)}%`} tone="current" /><Kpi label="다년 분석 행" value={`${number(data.bundle.publicComplaintRows)}행`} detail="중복 가능 원자료 행 합계" /><Kpi label="검토 후보" value={`${data.baseline.priorities.length}개`} detail="자동 확정이 아닌 담당자 큐" /><Kpi label="공식 상세" value={`${number(official.detailRows)}건`} detail="최신월 키워드 공개 범위" /></div>
        <div className="briefing-grid"><div className="briefing-panel"><div className="panel-heading"><h3>장기 우선검토 TOP 5</h3><button onClick={() => navigate('priority')}>전체 보기</button></div>{data.baseline.priorities.slice(0, 5).map((row, index) => <button className="rank-row" key={row.issue} onClick={() => { setSelectedIssue(row.issue); navigate('priority') }}><b>{String(index + 1).padStart(2, '0')}</b><span><strong>{row.issue}</strong><small>{row.dominantDepartment}</small></span><em>{row.growthRate >= 0 ? '+' : ''}{row.growthRate.toFixed(1)}%</em><i>{row.score.toFixed(1)}점</i></button>)}</div><div className="briefing-panel"><div className="panel-heading"><h3>2026 공식 분류</h3><button onClick={() => navigate('trend')}>추세 보기</button></div>{official.categories.slice(0, 6).map((row, index) => <div className="rank-row static" key={row.cvlcpt_clsf}><b>{String(index + 1).padStart(2, '0')}</b><span><strong>{row.cvlcpt_clsf}</strong><small>용인시 공식 최신월</small></span><i>{number(Number(row.tot_nocs))}건</i></div>)}</div></div>
      </section>

      <section id="trend" className="section-block"><div className="section-title"><span>민원 변화</span><h2>과거 기준선과 최신 흐름</h2><p>수집 범위가 다른 두 계열을 별도 차트로 표시합니다.</p></div><div className="chart-stack"><article><h3>공공데이터포털 장기 기준선 · 최근 24개월</h3><LineChart rows={historicalMonthly} label="공공데이터포털 장기 민원 추세" /></article><article><h3>용인시 공식 대시보드 · 최근 12개월</h3><LineChart rows={currentMonthly} label="용인시 공식 최신 민원 추세" /></article></div><div className="keyword-band">{official.keywords.slice(0, 15).map((row) => <span key={row.kwrd}><b>{row.kwrd}</b>{number(Number(row.tot_nocs))}</span>)}</div></section>

      <section id="operations" className="section-block"><div className="section-title"><span>부서·지역</span><h2>업무 부담과 지역 증거</h2><p>처리부서·민원명에 명시된 값만 사용하며 미확인 지역은 추정하지 않습니다.</p></div><div className="operations-grid"><article><h3>부서 부담 TOP 10</h3>{data.baseline.departments.slice(0, 10).map((row) => <div className="bar-row" key={row.department}><span>{row.department}<small>{row.topCategory}</small></span><div><i style={{ width: `${row.share / data.baseline.departments[0].share * 100}%` }} /></div><b>{number(row.count)}</b></div>)}</article><article><h3>구별 명시 증거</h3>{data.baseline.districts.map((row) => <div className="district-card" key={row.district}><span>{row.district}</span><strong>{number(row.currentCount)}건</strong><em>{row.growthRate >= 0 ? '+' : ''}{row.growthRate.toFixed(1)}%</em><p>{row.topDepartment} · {row.topCategory}</p></div>)}<div className="infra-note"><b>CCTV {data.baseline.cctv.length}개 지점</b><span>안전 인프라 배경</span><b>경찰서 {data.baseline.crime.length}곳</b><span>범죄 통계는 예측에 미사용</span></div></article></div></section>

      <section id="context" className="section-block"><div className="section-title"><span>도시 맥락</span><h2>민원 뒤의 인구·경제·공론 신호</h2><p>상관관계 검토용 지표이며 민원의 원인으로 자동 판정하지 않습니다.</p></div><div className="context-metric-grid">{data.population.metrics.slice(0, 6).map((item) => <Kpi key={item.label} label={item.label} value={`${number(Number(item.value))}${item.unit}`} detail={String(item.period)} />)}</div><div className="context-columns"><article><h3>경제·행정 지표</h3>{data.economy.metrics.slice(0, 6).map((item) => <p key={item.label}><span>{item.label}<small>{item.period}</small></span><b>{number(Number(item.value))}{item.unit}</b></p>)}</article><article><h3>뉴스 관심 TOP 8</h3>{data.publicAttention.newsTop.slice(0, 8).map((item) => <p key={item.column}><span>{item.column}</span><b>{number(item.value)}</b></p>)}</article><article><h3>SNS 관심 TOP 8</h3>{data.publicAttention.snsTop.slice(0, 8).map((item) => <p key={item.column}><span>{item.column}</span><b>{number(item.value)}</b></p>)}</article></div></section>

      <section id="priority" className="section-block"><div className="section-title"><span>검토 큐</span><h2>근거를 보고 사람이 결정</h2><p>민원량·증가·지속성·안전·부서 집중·데이터 품질을 조합한 검토 순서입니다.</p></div><div className="decision-layout"><div className="decision-list">{data.baseline.priorities.map((row, index) => <button key={row.issue} className={selected.issue === row.issue ? 'selected' : ''} onClick={() => setSelectedIssue(row.issue)}><b>{String(index + 1).padStart(2, '0')}</b><span><strong>{row.issue}</strong><small>{row.category} · {reviews[row.issue] ?? '미검토'}</small></span><em>{row.score.toFixed(1)}</em></button>)}</div><aside className="decision-detail"><span>담당자 판단</span><h3>{selected.issue}</h3><div className="decision-numbers"><b>{number(selected.currentCount)}건<small>비교기간 현재</small></b><b>{selected.growthRate >= 0 ? '+' : ''}{selected.growthRate.toFixed(1)}%<small>동일기간 변화</small></b><b>{selected.departmentConcentration.toFixed(1)}%<small>부서 집중도</small></b></div><p>{selected.rationale}</p><dl><dt>담당 후보</dt><dd>{selected.dominantDepartment}</dd><dt>시민 영향</dt><dd>{selected.impact}</dd><dt>판단 기간</dt><dd>{selected.comparisonPeriod}</dd></dl><div className="review-actions"><button onClick={() => review('승인')}>승인</button><button onClick={() => review('보류')}>보류</button><button onClick={() => review('추가확인')}>추가 확인</button></div></aside></div></section>

      <section id="report" className="section-block"><div className="section-title"><span>실행 보고</span><h2>선택 이슈 의사결정 메모</h2><p>장기 근거와 최신 현황, 담당자 판단을 한 파일로 내보냅니다.</p></div><div className="report-sheet"><span>Y:Q DECISION NOTE · {month(official.latestMonth)}</span><h3>{selected.issue}</h3><div className="kpi-grid"><Kpi label="검토 점수" value={`${selected.score.toFixed(1)}점`} detail="자동 확정 아님" /><Kpi label="동일기간 변화" value={`${selected.growthRate >= 0 ? '+' : ''}${selected.growthRate.toFixed(1)}%`} detail={selected.comparisonPeriod} /><Kpi label="담당 후보" value={selected.dominantDepartment} detail={`${selected.departmentConcentration.toFixed(1)}% 집중`} /><Kpi label="검토 상태" value={reviews[selected.issue] ?? '미검토'} detail="담당자 기록" /></div><pre>{report}</pre><button className="official-refresh" onClick={saveReport}><Download /> 의사결정 메모 저장</button></div></section>

      <section id="sources" className="section-block"><div className="section-title"><span>데이터 근거</span><h2>무엇을 어디에 사용했는가</h2><p>출처·시점·역할·한계를 심사위원과 실무자가 바로 확인할 수 있습니다.</p></div><div className="source-grid"><article><b>공공데이터포털</b><strong>{number(data.bundle.publicComplaintRows)}행</strong><p>2020~2025 장기 민원, 부서·출처·키워드 기준선</p></article><article><b>용인시 직접 대시보드</b><strong>{data.bundle.officialDatasets}종</strong><p>2026 최신 민원, 인구, 경제, SNS·뉴스, 용인지표</p></article><article><b>외부 연계 서비스</b><strong>{data.bundle.partnerDownloaded}종</strong><p>생활패턴 공개 응답. 방문소비는 다운로드 차단으로 제외</p></article><article><b>안전 보조 데이터</b><strong>{data.baseline.cctv.length + data.baseline.crime.length}개 단위</strong><p>CCTV와 경찰서 통계는 배경 설명에만 사용</p></article></div><div className="limitations"><h3>해석 제한</h3>{data.limitations.map((item) => <p key={item}><CircleWarning />{item}</p>)}</div></section>
    </main>
  </div>
}
