import { useEffect, useMemo, useRef, useState, type ChangeEvent, type ComponentType, type SVGProps } from 'react'
import ArrowReload02 from 'coolicons-react/src/outline/Arrow/ArrowReload02.jsx'
import CalendarCheck from 'coolicons-react/src/outline/Calendar/CalendarCheck.jsx'
import ChartLine from 'coolicons-react/src/outline/Interface/ChartLine.jsx'
import Check from 'coolicons-react/src/outline/Interface/Check.jsx'
import Lock from 'coolicons-react/src/outline/Interface/Lock.jsx'
import CircleWarning from 'coolicons-react/src/outline/Warning/CircleWarning.jsx'
import BookOpen from 'coolicons-react/src/outline/Interface/BookOpen.jsx'
import Download from 'coolicons-react/src/outline/Interface/Download.jsx'
import dashboardData from './data/dashboard-data.json'
import yonginBrand from './assets/yongin-integrated-brand.jpg'
import civicHero from './assets/yongin-civic-priority-hero.png'

type IconType = ComponentType<SVGProps<SVGSVGElement>>
type MonthlyPoint = { month: string; count: number }
type CategoryRow = { category: string; count: number; share: number; previousCount: number; currentCount: number; growthRate: number; safetyRelated: boolean; comparisonPeriod: string }
type DepartmentRow = { department: string; count: number; share: number; topCategory: string; safetyShare: number }
type WeightKey = 'volume' | 'momentum' | 'persistence' | 'safety' | 'departmentConcentration' | 'dataQuality'
type PriorityIssue = {
  issue: string
  category: string
  count: number
  previousCount: number
  currentCount: number
  comparisonYears: number[]
  comparisonPeriod: string
  growthRate: number
  dominantDepartment: string
  departmentConcentration: number
  impact: string
  matchedKeywords: string[]
  score: number
  scoreParts: Record<WeightKey, number>
  componentValues: Record<WeightKey, number>
  rationale: string
}
type RankedIssue = PriorityIssue & { adjustedScore: number; baseRank: number; rankDelta: number }
type AnomalySignal = {
  issue: string
  category: string
  month: string
  count: number
  baselineAverage: number
  zScore: number
  previousYearSameMonth: number | null
  yearOverYearRate: number | null
  status: '급증' | '주의' | '정상'
  reason: string
}
type AiCluster = {
  clusterId: string
  label: string
  representativeTitle: string
  topTerms: string[]
  memberCount: number
  totalFrequency: number
  dominantCategory: string
  categoryAgreement: number
  confidence: number
  reviewRequired: boolean
  algorithm: string
}
type DataQuality = {
  latestObservedMonth: string
  latestObservedCount: number
  latestCompleteMonth: string
  excludedPartialMonths: string[]
  baselineMedian: number
  latestToBaselineRatio: number
  threshold: number
  reason: string
  comparisonPeriod: string
  previousYearLatestAvailableMonth: string
  samePeriodComparison: boolean
  missingTitleRows: number
  missingMonthRows: number
  usableRowRatio: number
  ruleUnclassifiedRows: number
  ruleUnclassifiedShare: number
  fileManifest: Array<{ file: string; bytes: number; sha256: string; sourceType: string }>
  districtEvidence: { method: string; districts: string[]; matchedRows: number; unknownRows: number; coverage: number; evidenceSourceCounts: Record<string, number>; limitations: string }
}
type DistrictAnalysis = {
  district: string
  evidenceCount: number
  evidenceShareOfSaeol: number
  shareOfDistrictEvidence: number
  previousCount: number
  currentCount: number
  growthRate: number
  comparisonPeriod: string
  topCategory: string
  topDepartment: string
  monthlyComplaints: MonthlyPoint[]
  categorySummary: CategoryRow[]
  departmentBurden: DepartmentRow[]
  priorityIssues: PriorityIssue[]
  dataQuality: { basis: string; unknownRowsExcluded: number; districtEvidenceCoverage: number }
}
type CctvPoint = { name: string; district: string; address: string; purpose: string; status: string; lat: number; lng: number }
type CrimeRow = { station: string; totalIncidents: number; [key: string]: string | number }
type SampleReport = { id: string; title: string; lat: number | null; lng: number | null; synthetic: boolean }
type DashboardData = {
  summary: {
    generatedAt: string
    totalSaeolRows: number
    totalKeywordRows: number
    totalAnalyzedRows: number
    period: { saeol: { min: string; max: string }; keyword: { min: string; max: string } }
    safetyRelatedCount: number
    safetyRelatedShare: number
    categoryOtherShare: number
    priorityIssueCount: number
    priorityMinimumCurrentCount: number
    priorityDataSource: string
    rowCountLabel: string
    latestCompleteMonth: string
    excludedPartialMonths: string[]
    priorityComparisonPeriod: string
  }
  monthlyComplaints: MonthlyPoint[]
  categorySummary: CategoryRow[]
  departmentBurden: DepartmentRow[]
  priorityIssues: PriorityIssue[]
  anomalySignals: AnomalySignal[]
  aiClusters: AiCluster[]
  dataQuality: DataQuality
  districtAnalysis: DistrictAnalysis[]
  cctvPoints: CctvPoint[]
  crimeSummary: CrimeRow[]
  sampleReports: SampleReport[]
  methodology: { classification: string; anomalyDetection: string; priorityFormula: string; limits: string[] }
}

const data = dashboardData as DashboardData
const defaultWeights: Record<WeightKey, number> = {
  volume: 25,
  momentum: 25,
  persistence: 20,
  safety: 15,
  departmentConcentration: 10,
  dataQuality: 5,
}
const weightLabels: Record<WeightKey, string> = {
  volume: '동일기간 규모',
  momentum: '증가 추세',
  persistence: '반복 지속성',
  safety: '안전·생활 영향',
  departmentConcentration: '부서 부담',
  dataQuality: '데이터 신뢰도',
}
const navItems = [
  { id: 'overview', label: '업무 개요', icon: ChartLine },
  { id: 'district', label: '지역 비교', icon: ChartLine },
  { id: 'csv-input', label: 'CSV 불러오기', icon: Download },
  { id: 'quality', label: '데이터 품질', icon: Check },
  { id: 'signals', label: '변화 신호', icon: CircleWarning },
  { id: 'cluster-review', label: 'AI 검토', icon: Check },
  { id: 'priority', label: '우선순위', icon: ChartLine },
  { id: 'detail', label: '이슈 상세', icon: BookOpen },
  { id: 'report', label: '실행 보고서', icon: Download },
  { id: 'validation', label: '사용자 검증', icon: CalendarCheck },
  { id: 'outcomes', label: '성과 추적', icon: ChartLine },
  { id: 'reference', label: '참고 데이터', icon: Lock },
]

function formatNumber(value: number) {
  return new Intl.NumberFormat('ko-KR').format(value)
}

function formatPercent(value: number) {
  return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`
}

function scrollToSection(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

function downloadText(content: string, fileName: string, type = 'text/plain;charset=utf-8') {
  const blob = new Blob([content], { type })
  const href = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = href
  anchor.download = fileName
  anchor.click()
  URL.revokeObjectURL(href)
}

function csvCell(value: unknown) {
  const text = String(value ?? '')
  return `"${text.replaceAll('"', '""')}"`
}

function Kpi({ title, value, detail, tone = 'blue' }: { title: string; value: string; detail: string; tone?: 'blue' | 'green' | 'amber' | 'slate' }) {
  return (
    <article className={`kpi tone-${tone}`}>
      <span>{title}</span>
      <strong>{value}</strong>
      <p>{detail}</p>
    </article>
  )
}

function LineChart({ points }: { points: MonthlyPoint[] }) {
  const chartPoints = points.slice(-24)
  const width = 900
  const height = 260
  const pad = 42
  const max = Math.max(...chartPoints.map((point) => point.count), 1)
  const min = Math.min(...chartPoints.map((point) => point.count))
  const range = Math.max(max - min, 1)
  const x = (index: number) => pad + (index / Math.max(chartPoints.length - 1, 1)) * (width - pad * 2)
  const y = (value: number) => height - pad - ((value - min) / range) * (height - pad * 2)
  const path = chartPoints.map((point, index) => `${index ? 'L' : 'M'} ${x(index)} ${y(point.count)}`).join(' ')
  return (
    <div className="chart-frame">
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="부분 집계 월을 제외한 월별 민원 추세">
        {[0, 1, 2, 3].map((tick) => {
          const py = pad + tick * ((height - pad * 2) / 3)
          const value = Math.round(max - tick * (range / 3))
          return <g key={tick}><line x1={pad} x2={width - pad} y1={py} y2={py} /><text x={pad - 8} y={py + 4}>{formatNumber(value)}</text></g>
        })}
        <path d={path} />
        {chartPoints.map((point, index) => <g key={point.month}><circle cx={x(index)} cy={y(point.count)} r="4" />{index % 4 === 0 || index === chartPoints.length - 1 ? <text x={x(index)} y={height - 10} textAnchor="middle">{point.month.slice(2)}</text> : null}</g>)}
      </svg>
    </div>
  )
}

function CsvInput() {
  const inputRef = useRef<HTMLInputElement>(null)
  const [result, setResult] = useState<{ status: 'idle' | 'valid' | 'invalid'; message: string; file?: string; encoding?: string; columns?: string[] }>({ status: 'idle', message: 'CSV를 선택하면 헤더·인코딩·필수 필드를 브라우저에서 먼저 검사합니다.' })
  const inspect = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    if (!file.name.toLowerCase().endsWith('.csv') || file.size === 0) {
      setResult({ status: 'invalid', message: '비어 있지 않은 CSV 파일만 사용할 수 있습니다.', file: file.name })
      return
    }
    const bytes = await file.slice(0, 64 * 1024).arrayBuffer()
    let encoding = 'UTF-8'
    let text = new TextDecoder('utf-8', { fatal: false }).decode(bytes)
    if (text.includes('�')) {
      encoding = 'CP949/EUC-KR'
      text = new TextDecoder('euc-kr').decode(bytes)
    }
    const header = text.replace(/^\uFEFF/, '').split(/\r?\n/, 1)[0] ?? ''
    const columns = header.split(',').map((column) => column.trim().replace(/^"|"$/g, ''))
    const hasDate = columns.includes('접수일자') || columns.includes('접수일')
    const hasTitle = columns.includes('민원명')
    const hasDepartment = columns.includes('처리부서명') || columns.includes('부서')
    if (!hasDate || !hasTitle || !hasDepartment) {
      setResult({ status: 'invalid', message: '필수 필드가 부족합니다. 접수일자(또는 접수일), 민원명, 처리부서명(또는 부서)이 필요합니다.', file: file.name, encoding, columns })
      return
    }
    setResult({ status: 'valid', message: '스키마 검증을 통과했습니다. 대용량 전체 분석은 로컬 Python 스트리밍 파이프라인에서 실행합니다.', file: file.name, encoding, columns })
  }
  return (
    <div className="csv-workbench">
      <div>
        <h3>용인시 민원 CSV 사전검사</h3>
        <p>원본 전체를 브라우저 메모리에 올리지 않고 첫 64KB로 파일 형식을 확인합니다.</p>
        <input ref={inputRef} type="file" accept=".csv,text/csv" onChange={inspect} aria-label="민원 CSV 파일 선택" />
        <button type="button" className="primary-command" onClick={() => inputRef.current?.click()}><Download /> CSV 선택</button>
      </div>
      <div className={`csv-result ${result.status}`} aria-live="polite">
        <strong>{result.status === 'valid' ? '검증 통과' : result.status === 'invalid' ? '검증 실패' : '검사 대기'}</strong>
        <p>{result.message}</p>
        {result.file ? <span>{result.file} · {result.encoding}</span> : null}
        {result.columns ? <small>{result.columns.join(' · ')}</small> : null}
      </div>
      <pre>python scripts\analyze_y_priority_data.py</pre>
    </div>
  )
}

function QualityPanel({ quality }: { quality: DataQuality }) {
  const checks = [
    ['최신 관측 월', quality.latestObservedMonth, '부분 집계 검사 대상'],
    ['최신 완전 월', quality.latestCompleteMonth, '추세·이상탐지 기준'],
    ['동일 비교기간', quality.comparisonPeriod, '양쪽에 존재하는 월만 사용'],
    ['민원명 결측', `${formatNumber(quality.missingTitleRows)}행`, '인코딩 복구 후 결과'],
    ['규칙 미분류', `${quality.ruleUnclassifiedShare.toFixed(1)}%`, 'AI 군집 검토 후보'],
    ['원본 무결성', `${quality.fileManifest.length}개 파일`, 'SHA-256 기록 완료'],
  ]
  return (
    <div className="quality-layout">
      <div className="quality-alert">
        <CircleWarning />
        <div><strong>{quality.excludedPartialMonths.join(', ')} 분석 제외</strong><p>{quality.reason}</p></div>
      </div>
      <div className="quality-table">
        {checks.map(([label, value, detail]) => <div key={label}><span>{label}</span><strong>{value}</strong><small>{detail}</small></div>)}
      </div>
      <details>
        <summary>원본 파일 해시 확인</summary>
        {quality.fileManifest.map((file) => <p key={file.file}><strong>{file.file}</strong><code>{file.sha256}</code></p>)}
      </details>
    </div>
  )
}

function SignalTable({ signals }: { signals: AnomalySignal[] }) {
  return (
    <div className="signal-list">
      {signals.slice(0, 6).map((signal) => <article key={signal.issue}>
        <span className={`status status-${signal.status}`}>{signal.status}</span>
        <div><strong>{signal.issue}</strong><p>{signal.reason}</p></div>
        <div className="signal-value"><strong>{formatNumber(signal.count)}</strong><span>{signal.month}</span></div>
      </article>)}
    </div>
  )
}

function ClusterList({ clusters }: { clusters: AiCluster[] }) {
  return (
    <div className="cluster-list">
      {clusters.slice(0, 6).map((cluster) => <article key={cluster.clusterId}>
        <div className="cluster-head"><span>{cluster.clusterId}</span><em className={cluster.reviewRequired ? 'review' : 'stable'}>{cluster.reviewRequired ? '검토 필요' : '일관성 양호'}</em></div>
        <strong>{cluster.label}</strong>
        <p>{cluster.topTerms.join(' · ')}</p>
        <div><span>{formatNumber(cluster.totalFrequency)}회</span><span>신뢰도 {(cluster.confidence * 100).toFixed(0)}%</span><span>{cluster.dominantCategory}</span></div>
      </article>)}
    </div>
  )
}

function DistrictPanel({ districts, selected, onSelect }: { districts: DistrictAnalysis[]; selected: string; onSelect: (district: string) => void }) {
  const coverage = data.dataQuality.districtEvidence.coverage
  return (
    <div className="district-panel">
      <div className="district-method"><div><strong>지역 판정 가능 {coverage.toFixed(1)}%</strong><span>{formatNumber(data.dataQuality.districtEvidence.matchedRows)}행 · {data.dataQuality.districtEvidence.method}</span></div><p>{data.dataQuality.districtEvidence.limitations}. 지역 미상 {formatNumber(data.dataQuality.districtEvidence.unknownRows)}행은 구별 통계에서 제외합니다.</p></div>
      <div className="district-tabs" role="group" aria-label="분석 지역 선택">
        {['전체', ...districts.map((row) => row.district)].map((district) => <button key={district} type="button" aria-pressed={selected === district} onClick={() => onSelect(district)}>{district}</button>)}
      </div>
      <div className="district-grid">
        {districts.map((row) => <article key={row.district} className={selected === row.district ? 'selected' : ''}>
          <div><span>{row.district}</span><b>{formatPercent(row.growthRate)}</b></div>
          <strong>{formatNumber(row.currentCount)}건</strong><small>{row.comparisonPeriod}</small>
          <dl><div><dt>판정 행</dt><dd>{formatNumber(row.evidenceCount)}</dd></div><div><dt>대표 분야</dt><dd>{row.topCategory}</dd></div><div><dt>집중 부서</dt><dd>{row.topDepartment}</dd></div></dl>
          <button type="button" onClick={() => onSelect(row.district)}>이 지역으로 분석</button>
        </article>)}
      </div>
    </div>
  )
}

type ReviewStatus = '검토 필요' | '승인' | '보류'
type ClusterReview = { clusterId: string; label: string; category: string; status: ReviewStatus; mergeCandidate: string; reason: string; note: string; updatedAt: string }
type ReviewHistory = { at: string; clusterId: string; before: ClusterReview; after: ClusterReview }

function initialClusterReviews(): ClusterReview[] {
  return data.aiClusters.map((cluster, index) => ({
    clusterId: cluster.clusterId,
    label: cluster.label,
    category: cluster.dominantCategory,
    status: cluster.reviewRequired ? '검토 필요' : '승인',
    mergeCandidate: data.aiClusters[(index + 1) % data.aiClusters.length]?.clusterId ?? '',
    reason: '',
    note: '',
    updatedAt: '',
  }))
}

function ClusterReviewWorkbench({ reviews, history, onSave, onReset, onExport }: { reviews: ClusterReview[]; history: ReviewHistory[]; onSave: (review: ClusterReview) => void; onReset: () => void; onExport: (format: 'json' | 'csv') => void }) {
  const [selectedId, setSelectedId] = useState(reviews[0]?.clusterId ?? '')
  const source = data.aiClusters.find((cluster) => cluster.clusterId === selectedId) ?? data.aiClusters[0]
  const saved = reviews.find((review) => review.clusterId === selectedId) ?? reviews[0]
  const [draft, setDraft] = useState<ClusterReview>(saved)
  useEffect(() => setDraft(saved), [saved])
  if (!source || !draft) return <p className="empty-state">검토할 군집이 없습니다.</p>
  const dirty = JSON.stringify(draft) !== JSON.stringify(saved)
  return (
    <div className="review-workbench">
      <aside className="review-list">{reviews.map((review) => <button key={review.clusterId} type="button" className={selectedId === review.clusterId ? 'active' : ''} onClick={() => setSelectedId(review.clusterId)}><span>{review.clusterId}</span><strong>{review.label}</strong><em>{review.status}</em></button>)}</aside>
      <div className="review-editor">
        <div className="review-evidence"><span>원본 AI 결과</span><strong>{source.label}</strong><p>{source.topTerms.join(' · ')}</p><small>신뢰도 {(source.confidence * 100).toFixed(0)}% · {source.algorithm}</small></div>
        <div className="review-form">
          <label><span>군집 이름</span><input value={draft.label} onChange={(event) => setDraft({ ...draft, label: event.target.value })} /></label>
          <label><span>카테고리</span><select value={draft.category} onChange={(event) => setDraft({ ...draft, category: event.target.value })}>{['도로/교통', '환경/청소', '안전/방범', '재난/침수', '조명/CCTV', '행정/인허가', '복지/보건', '기타'].map((item) => <option key={item}>{item}</option>)}</select></label>
          <label><span>검토 상태</span><select value={draft.status} onChange={(event) => setDraft({ ...draft, status: event.target.value as ReviewStatus })}>{['검토 필요', '승인', '보류'].map((item) => <option key={item}>{item}</option>)}</select></label>
          <label><span>병합 후보</span><select value={draft.mergeCandidate} onChange={(event) => setDraft({ ...draft, mergeCandidate: event.target.value })}>{reviews.filter((review) => review.clusterId !== draft.clusterId).map((review) => <option key={review.clusterId} value={review.clusterId}>{review.clusterId} · {review.label}</option>)}</select></label>
          <label className="wide"><span>수정 사유</span><input value={draft.reason} placeholder="변경 근거를 입력하세요" onChange={(event) => setDraft({ ...draft, reason: event.target.value })} /></label>
          <label className="wide"><span>담당자 메모</span><textarea value={draft.note} placeholder="원자료 확인 결과나 후속 검토 사항" onChange={(event) => setDraft({ ...draft, note: event.target.value })} /></label>
        </div>
        <div className="review-diff"><div><span>변경 전</span><b>{source.label}</b><small>{source.dominantCategory} · {source.reviewRequired ? '검토 필요' : '일관성 양호'}</small></div><div><span>변경 후</span><b>{draft.label}</b><small>{draft.category} · {draft.status}</small></div></div>
        <div className="review-actions"><button type="button" disabled={!dirty || !draft.reason.trim()} onClick={() => onSave({ ...draft, updatedAt: new Date().toISOString() })}><Check /> 변경 저장</button><span>{dirty && !draft.reason.trim() ? '수정 사유를 입력해야 저장할 수 있습니다.' : '변경 내용은 이 브라우저에만 저장됩니다.'}</span></div>
      </div>
      <div className="review-history"><div><strong>검토 이력 {history.length}건</strong><div><button type="button" onClick={() => onExport('json')}><Download /> JSON</button><button type="button" onClick={() => onExport('csv')}><Download /> CSV</button><button type="button" onClick={onReset}><ArrowReload02 /> 초기화</button></div></div>{history.length ? history.slice().reverse().slice(0, 5).map((entry) => <p key={`${entry.at}-${entry.clusterId}`}><time>{new Date(entry.at).toLocaleString('ko-KR')}</time><b>{entry.clusterId}</b><span>{entry.before.label} → {entry.after.label}</span></p>) : <p className="empty-state">저장된 검토 이력이 없습니다.</p>}</div>
    </div>
  )
}

function rebalanceWeights(current: Record<WeightKey, number>, key: WeightKey, value: number) {
  const next = { ...current, [key]: value }
  const others = (Object.keys(current) as WeightKey[]).filter((item) => item !== key)
  const target = 100 - value
  const oldTotal = others.reduce((sum, item) => sum + current[item], 0)
  let assigned = 0
  others.forEach((item, index) => {
    const adjusted = index === others.length - 1 ? target - assigned : Math.round((current[item] / Math.max(oldTotal, 1)) * target)
    next[item] = Math.max(0, adjusted)
    assigned += next[item]
  })
  return next
}

function WeightControls({ weights, onChange, onReset }: { weights: Record<WeightKey, number>; onChange: (key: WeightKey, value: number) => void; onReset: () => void }) {
  return (
    <div className="weight-controls">
      <div className="weight-header"><div><strong>정책 가중치</strong><span>한 항목을 바꾸면 나머지가 자동 조정되어 합계 100을 유지합니다.</span></div><button type="button" onClick={onReset}><ArrowReload02 /> 기본값</button></div>
      {(Object.keys(weights) as WeightKey[]).map((key) => <label key={key}><span>{weightLabels[key]}</span><input type="range" min="0" max="50" step="1" value={weights[key]} onChange={(event) => onChange(key, Number(event.target.value))} /><strong>{weights[key]}%</strong></label>)}
      <div className="weight-total"><Check /> 합계 {Object.values(weights).reduce((sum, value) => sum + value, 0)}%</div>
    </div>
  )
}

function PriorityTable({ issues, selected, onSelect }: { issues: RankedIssue[]; selected: string; onSelect: (issue: RankedIssue) => void }) {
  return (
    <div className="table-wrap"><table><thead><tr><th>순위</th><th>검토 이슈</th><th>동일기간 수요</th><th>증감</th><th>담당 집중</th><th>조정 점수</th></tr></thead><tbody>
      {issues.map((issue, index) => <tr key={issue.issue} className={selected === issue.issue ? 'selected' : ''}>
        <td><span className="rank">{index + 1}</span><small className={issue.rankDelta > 0 ? 'up' : issue.rankDelta < 0 ? 'down' : ''}>{issue.rankDelta ? `${issue.rankDelta > 0 ? '▲' : '▼'}${Math.abs(issue.rankDelta)}` : '유지'}</small></td>
        <td><button type="button" aria-pressed={selected === issue.issue} onClick={() => onSelect(issue)}>{issue.issue}</button><small>{issue.category} · {issue.impact}</small></td>
        <td><strong>{formatNumber(issue.currentCount)}건</strong><small>{issue.comparisonPeriod}</small></td>
        <td className={issue.growthRate >= 0 ? 'up' : 'down'}>{formatPercent(issue.growthRate)}</td>
        <td>{issue.dominantDepartment}<small>{issue.departmentConcentration.toFixed(1)}%</small></td>
        <td><strong>{issue.adjustedScore.toFixed(1)}</strong><i><span style={{ width: `${issue.adjustedScore}%` }} /></i></td>
      </tr>)}
    </tbody></table></div>
  )
}

function guidance(issue: PriorityIssue) {
  if (issue.category === '재난/침수') return { questions: ['반복 접수 구간과 시설물 유형이 내부 원자료에서 확인되는가?', '우기 전 점검 계획과 민원 증가 시점이 일치하는가?'], actions: ['배수시설·하천 담당부서 원자료 교차검토', '우기 전 예방점검 후보 목록 작성'], kpis: ['동일기간 반복 수요', '예방점검 완료율', '집중호우 후 재접수율'] }
  if (issue.category === '도로/교통') return { questions: ['시설 민원과 단속 민원을 구분할 수 있는가?', '보행·차량 안전 관련 반복 유형이 있는가?'], actions: ['대표 민원 유형별 담당 조직 재확인', '반복 시설 유형의 점검 우선순위 검토'], kpis: ['반복 민원 감소율', '평균 검토 착수시간', '시설 조치 후 재접수율'] }
  return { questions: ['반복 민원과 단순 행정 신청을 구분했는가?', '담당부서 집중이 실제 업무 병목을 의미하는가?'], actions: ['대표 민원 원자료 표본 검토', '담당부서와 분류·가중치 조정 회의'], kpis: ['동일기간 수요 변화', '검토 안건 처리율', '담당자 유용성 평가'] }
}

function IssueDetail({ issue, weights }: { issue: RankedIssue; weights: Record<WeightKey, number> }) {
  const plan = guidance(issue)
  return (
    <div className="detail-layout">
      <div className="detail-summary"><span>{issue.category}</span><h3>{issue.issue}</h3><p>{issue.rationale}</p><dl><div><dt>조정 점수</dt><dd>{issue.adjustedScore.toFixed(1)}</dd></div><div><dt>담당 집중</dt><dd>{issue.dominantDepartment}</dd></div><div><dt>규칙 근거</dt><dd>{issue.matchedKeywords.join(', ')}</dd></div><div><dt>데이터 상태</dt><dd>동일기간·부분 월 제외</dd></div></dl></div>
      <div className="component-list">{(Object.keys(weights) as WeightKey[]).map((key) => <div key={key}><span>{weightLabels[key]}</span><i><b style={{ width: `${issue.componentValues[key] * 100}%` }} /></i><strong>{(issue.componentValues[key] * weights[key]).toFixed(1)}</strong></div>)}</div>
      <div className="action-columns"><article><span>검토 질문</span>{plan.questions.map((item) => <p key={item}>{item}</p>)}</article><article><span>후속 조치 후보</span>{plan.actions.map((item) => <p key={item}>{item}</p>)}</article><article><span>추적 KPI</span>{plan.kpis.map((item) => <p key={item}>{item}</p>)}</article></div>
    </div>
  )
}

function reportHtml(issue: RankedIssue, weights: Record<WeightKey, number>) {
  const plan = guidance(issue)
  const components = (Object.keys(weights) as WeightKey[]).map((key) => `<tr><td>${weightLabels[key]}</td><td>${weights[key]}%</td><td>${(issue.componentValues[key] * weights[key]).toFixed(1)}</td></tr>`).join('')
  return `<!doctype html><html lang="ko"><head><meta charset="utf-8"><title>Y-Priority AI 실행 검토서</title><style>body{font-family:Pretendard,Arial,sans-serif;color:#121917;line-height:1.6;max-width:900px;margin:40px auto;padding:0 24px}h1{font-size:30px}h2{margin-top:32px;font-size:20px;color:#165b63}table{width:100%;border-collapse:collapse}th,td{padding:10px;border:1px solid #d8e1de;text-align:left}.meta{color:#66716f}.notice{background:#fbf4e8;padding:16px;border-left:4px solid #b7791f}.no-print{min-height:44px;padding:0 18px;border:0;background:#165b63;color:#fff;font-weight:700}@media print{body{margin:0}.no-print{display:none}}</style></head><body><p class="meta">Y-Priority AI · 생성 ${new Date().toLocaleDateString('ko-KR')}</p><h1>${issue.issue} 실행 검토서</h1><p>${issue.rationale}</p><h2>판단 근거</h2><table><tr><th>분야</th><td>${issue.category}</td><th>조정 점수</th><td>${issue.adjustedScore.toFixed(1)}</td></tr><tr><th>비교기간</th><td colspan="3">${issue.comparisonPeriod}</td></tr><tr><th>담당 집중 부서</th><td>${issue.dominantDepartment}</td><th>주요 영향</th><td>${issue.impact}</td></tr></table><h2>점수 구성</h2><table><thead><tr><th>요소</th><th>가중치</th><th>기여점수</th></tr></thead><tbody>${components}</tbody></table><h2>검토 질문</h2><ul>${plan.questions.map((item) => `<li>${item}</li>`).join('')}</ul><h2>후속 조치 후보</h2><ul>${plan.actions.map((item) => `<li>${item}</li>`).join('')}</ul><h2>추적 KPI</h2><ul>${plan.kpis.map((item) => `<li>${item}</li>`).join('')}</ul><p class="notice">공개 집계 CSV 기반 의사결정 보조자료입니다. 개별 민원의 처리 순서나 정책 결정을 자동 확정하지 않으며 담당자의 원자료 검토가 필요합니다.</p><button class="no-print" onclick="window.print()">인쇄·PDF 저장</button></body></html>`
}

function ReportPanel({ issue, weights }: { issue: RankedIssue; weights: Record<WeightKey, number> }) {
  const html = reportHtml(issue, weights)
  const fileName = `Y-Priority-${issue.issue.replace(/[^가-힣a-zA-Z0-9]+/g, '-')}-실행검토서.html`
  const print = () => {
    const popup = window.open('', '_blank', 'noopener,noreferrer')
    if (!popup) return
    popup.document.open(); popup.document.write(html); popup.document.close()
  }
  return (
    <div className="report-preview">
      <div><span>실행 검토서</span><h3>{issue.issue}</h3><p>점수 근거, 검토 질문, 후속 조치 후보와 추적 KPI를 한 문서로 정리합니다.</p></div>
      <div className="report-actions"><button type="button" onClick={print}><BookOpen /> 인쇄·PDF</button><a href={`data:text/html;charset=utf-8,${encodeURIComponent(html)}`} download={fileName}><Download /> HTML 저장</a></div>
      <p><strong>주의:</strong> 자동 행정 결정이 아니라 담당자 원자료 검토를 위한 회의 안건입니다.</p>
    </div>
  )
}

type OutcomeRecord = { period: string; complaintBefore: number; complaintAfter: number; satisfactionBefore: number; satisfactionAfter: number; reviewMinutesBefore: number; reviewMinutesAfter: number }

function OutcomeTracker() {
  const [form, setForm] = useState<OutcomeRecord>({ period: '', complaintBefore: 0, complaintAfter: 0, satisfactionBefore: 0, satisfactionAfter: 0, reviewMinutesBefore: 0, reviewMinutesAfter: 0 })
  const [records, setRecords] = useState<OutcomeRecord[]>(() => {
    try { return JSON.parse(localStorage.getItem('y-priority-outcomes') ?? '[]') as OutcomeRecord[] } catch { return [] }
  })
  useEffect(() => { localStorage.setItem('y-priority-outcomes', JSON.stringify(records)) }, [records])
  const update = (key: keyof OutcomeRecord, value: string) => setForm((current) => ({ ...current, [key]: key === 'period' ? value : Math.max(0, Number(value)) }))
  const add = () => {
    if (!form.period || !form.complaintBefore || !form.complaintAfter || !form.reviewMinutesBefore || !form.reviewMinutesAfter) return
    setRecords((current) => [form, ...current])
    setForm({ period: '', complaintBefore: 0, complaintAfter: 0, satisfactionBefore: 0, satisfactionAfter: 0, reviewMinutesBefore: 0, reviewMinutesAfter: 0 })
  }
  const latest = records[0]
  const change = (before: number, after: number) => before ? ((after - before) / before) * 100 : null
  return <div className="outcome-tracker">
    <div className="outcome-intro"><div><span>도입 효과 측정</span><h3>성과는 약속이 아니라 전후 데이터로 보고합니다</h3><p>우선 검토 이슈별 동일 기간을 비교해 민원량 변화, 시민 만족도, 공무원 검토 시간을 함께 기록합니다. 현재 공개 CSV만으로는 도입 효과를 주장하지 않습니다.</p></div><div className="outcome-rule"><b>보고 기준</b><span>동일 지역 · 동일 기간 · 같은 이슈</span><span>실제 설문·업무 기록만 입력</span></div></div>
    <div className="outcome-inputs"><label><span>비교 기간/이슈</span><input value={form.period} placeholder="예: 2026.08 처인구 침수·배수" onChange={(event) => update('period', event.target.value)} /></label><label><span>개선 전 민원 건수</span><input type="number" min="0" value={form.complaintBefore || ''} onChange={(event) => update('complaintBefore', event.target.value)} /></label><label><span>개선 후 민원 건수</span><input type="number" min="0" value={form.complaintAfter || ''} onChange={(event) => update('complaintAfter', event.target.value)} /></label><label><span>개선 전 만족도(0~100)</span><input type="number" min="0" max="100" value={form.satisfactionBefore || ''} onChange={(event) => update('satisfactionBefore', event.target.value)} /></label><label><span>개선 후 만족도(0~100)</span><input type="number" min="0" max="100" value={form.satisfactionAfter || ''} onChange={(event) => update('satisfactionAfter', event.target.value)} /></label><label><span>개선 전 검토시간(분)</span><input type="number" min="0" value={form.reviewMinutesBefore || ''} onChange={(event) => update('reviewMinutesBefore', event.target.value)} /></label><label><span>개선 후 검토시간(분)</span><input type="number" min="0" value={form.reviewMinutesAfter || ''} onChange={(event) => update('reviewMinutesAfter', event.target.value)} /></label><button type="button" onClick={add}>실제 성과 기록</button></div>
    {latest ? <><div className="outcome-kpis"><Kpi title="민원량 변화" value={`${change(latest.complaintBefore, latest.complaintAfter)?.toFixed(1)}%`} detail={`${latest.complaintBefore}건 → ${latest.complaintAfter}건`} tone="green" /><Kpi title="시민 만족도 변화" value={latest.satisfactionBefore && latest.satisfactionAfter ? `${(latest.satisfactionAfter - latest.satisfactionBefore).toFixed(1)}점` : '미입력'} detail={latest.satisfactionBefore && latest.satisfactionAfter ? `${latest.satisfactionBefore}점 → ${latest.satisfactionAfter}점` : '실제 설문 연동 필요'} /><Kpi title="검토시간 변화" value={`${change(latest.reviewMinutesBefore, latest.reviewMinutesAfter)?.toFixed(1)}%`} detail={`${latest.reviewMinutesBefore}분 → ${latest.reviewMinutesAfter}분`} tone="green" /></div><p className="outcome-latest">최근 기록: {latest.period} · 이 기록은 브라우저 로컬 저장소에만 보관됩니다.</p></> : <p className="empty-state">도입 전후의 실제 기록이 아직 없습니다. 본선에서는 담당자 과업 시간과 동일 이슈의 민원·만족도 자료를 입력해 효과를 검증합니다.</p>}
  </div>
}

type ValidationTask = { id: string; label: string; completed: boolean; errors: number }
type ValidationRecord = { id: string; createdAt: string; method: '기존 방식' | 'Y-Priority'; role: string; baselineSeconds: number | null; elapsedSeconds: number; completedTasks: number; taskSuccess: string; totalErrors: number; understanding: number; usefulness: number; reuseIntent: string; comment: string; sample: false }
const validationTasks = [
  ['partial-month', '부분 집계 월 찾기'],
  ['select-issue', '우선 검토 이슈 선택'],
  ['explain', '선택 근거 설명'],
  ['weights', '가중치 변경 후 순위 이해'],
  ['report', '실행 검토서 생성'],
] as const

function ValidationWorkbench() {
  const freshTasks = () => validationTasks.map(([id, label]) => ({ id, label, completed: false, errors: 0 }))
  const [running, setRunning] = useState(false)
  const [startedAt, setStartedAt] = useState(0)
  const [elapsed, setElapsed] = useState(0)
  const [tasks, setTasks] = useState<ValidationTask[]>(freshTasks)
  const [method, setMethod] = useState<'기존 방식' | 'Y-Priority'>('Y-Priority')
  const [role, setRole] = useState('')
  const [baseline, setBaseline] = useState('')
  const [understanding, setUnderstanding] = useState(0)
  const [usefulness, setUsefulness] = useState(0)
  const [reuseIntent, setReuseIntent] = useState('')
  const [comment, setComment] = useState('')
  const [records, setRecords] = useState<ValidationRecord[]>([])
  useEffect(() => {
    if (!running) return
    const timer = window.setInterval(() => setElapsed(Math.floor((Date.now() - startedAt) / 1000)), 250)
    return () => window.clearInterval(timer)
  }, [running, startedAt])
  const start = () => { setTasks(freshTasks()); setElapsed(0); setStartedAt(Date.now()); setRunning(true) }
  const stop = () => {
    if (!running || !role.trim() || understanding === 0 || usefulness === 0 || !reuseIntent) return
    const finalElapsed = Math.max(1, Math.floor((Date.now() - startedAt) / 1000))
    setElapsed(finalElapsed); setRunning(false)
    setRecords((current) => [...current, {
      id: `VAL-${String(current.length + 1).padStart(3, '0')}`,
      createdAt: new Date().toISOString(), method, role: role.trim(),
      baselineSeconds: baseline ? Number(baseline) : null, elapsedSeconds: finalElapsed,
      completedTasks: tasks.filter((task) => task.completed).length,
      taskSuccess: tasks.map((task) => `${task.label}:${task.completed ? '성공' : '미완료'}`).join('|'),
      totalErrors: tasks.reduce((sum, task) => sum + task.errors, 0), understanding, usefulness, reuseIntent, comment, sample: false,
    }])
  }
  const reset = () => { setRunning(false); setElapsed(0); setTasks(freshTasks()); setUnderstanding(0); setUsefulness(0); setReuseIntent(''); setComment('') }
  const exportCsv = () => {
    const headers = ['id', 'createdAt', 'method', 'role', 'baselineSeconds', 'elapsedSeconds', 'completedTasks', 'taskSuccess', 'totalErrors', 'understanding', 'usefulness', 'reuseIntent', 'comment', 'sample']
    const rows = records.map((record) => headers.map((key) => csvCell(record[key as keyof ValidationRecord])).join(','))
    downloadText(`\uFEFF${headers.join(',')}\n${rows.join('\n')}`, 'Y-Priority-사용자검증결과.csv', 'text/csv;charset=utf-8')
  }
  const average = (key: 'elapsedSeconds' | 'understanding' | 'usefulness') => records.length ? records.reduce((sum, record) => sum + record[key], 0) / records.length : 0
  const canStop = running && role.trim() && understanding > 0 && usefulness > 0 && reuseIntent
  return (
    <div className="validation-workbench">
      <div className="validation-status"><div><span>{records.length ? '실제 응답 기록 중' : '검증 대기'}</span><strong>{String(Math.floor(elapsed / 60)).padStart(2, '0')}:{String(elapsed % 60).padStart(2, '0')}</strong><small>예시 응답 없이 실제 입력만 집계합니다.</small></div><div className="timer-actions">{running ? <button type="button" disabled={!canStop} onClick={stop}>검증 종료·저장</button> : <button type="button" onClick={start}>새 검증 시작</button>}<button type="button" className="secondary" onClick={reset}>초기화</button></div></div>
      <div className="validation-setup"><label><span>비교 방식</span><select value={method} disabled={running} onChange={(event) => setMethod(event.target.value as '기존 방식' | 'Y-Priority')}><option>Y-Priority</option><option>기존 방식</option></select></label><label><span>사용자 역할</span><input value={role} placeholder="예: 행정 담당자" onChange={(event) => setRole(event.target.value)} /></label><label><span>기존 방식 기준 시간(초)</span><input type="number" min="0" value={baseline} placeholder="직접 측정한 경우만" onChange={(event) => setBaseline(event.target.value)} /></label></div>
      <div className="validation-tasks">{tasks.map((task, index) => <article key={task.id}><b>{String(index + 1).padStart(2, '0')}</b><span>{task.label}</span><button type="button" aria-pressed={task.completed} disabled={!running} onClick={() => setTasks((current) => current.map((item) => item.id === task.id ? { ...item, completed: !item.completed } : item))}>{task.completed ? '완료' : '미완료'}</button><label>오류 <input type="number" min="0" value={task.errors} disabled={!running} onChange={(event) => setTasks((current) => current.map((item) => item.id === task.id ? { ...item, errors: Number(event.target.value) } : item))} /></label></article>)}</div>
      <div className="validation-rating"><label><span>점수 근거 이해도</span><select value={understanding} onChange={(event) => setUnderstanding(Number(event.target.value))}><option value="0">선택</option>{[1,2,3,4,5].map((value) => <option key={value} value={value}>{value}점</option>)}</select></label><label><span>실행 검토서 유용성</span><select value={usefulness} onChange={(event) => setUsefulness(Number(event.target.value))}><option value="0">선택</option>{[1,2,3,4,5].map((value) => <option key={value} value={value}>{value}점</option>)}</select></label><label><span>재사용 의향</span><select value={reuseIntent} onChange={(event) => setReuseIntent(event.target.value)}><option value="">선택</option><option>있음</option><option>보통</option><option>없음</option></select></label><label className="wide"><span>자유 의견</span><textarea value={comment} onChange={(event) => setComment(event.target.value)} /></label></div>
      <div className="validation-report"><div><strong>실제 검증 집계</strong><button type="button" disabled={!records.length} onClick={exportCsv}><Download /> 결과 CSV</button></div>{records.length ? <div className="validation-kpis"><Kpi title="실제 응답" value={`${records.length}명`} detail="샘플 데이터 제외" tone="green" /><Kpi title="평균 완료시간" value={`${average('elapsedSeconds').toFixed(0)}초`} detail="기록된 세션 기준" /><Kpi title="평균 이해도" value={`${average('understanding').toFixed(1)}/5`} detail="실제 입력 평균" /><Kpi title="검토서 유용성" value={`${average('usefulness').toFixed(1)}/5`} detail="실제 입력 평균" /></div> : <p className="empty-state">저장된 실제 사용자 응답이 없습니다. 결과는 `검증 대기`이며 목표 수치를 성과로 표시하지 않습니다.</p>}</div>
    </div>
  )
}

export default function App() {
  const [activeNav, setActiveNav] = useState('overview')
  const [weights, setWeights] = useState(defaultWeights)
  const [selectedDistrict, setSelectedDistrict] = useState('전체')
  const [selectedIssueName, setSelectedIssueName] = useState(data.priorityIssues[0]?.issue ?? '')
  const [demoIndex, setDemoIndex] = useState(-1)
  const [clusterReviews, setClusterReviews] = useState<ClusterReview[]>(() => {
    try { return JSON.parse(localStorage.getItem('y-priority-cluster-reviews') ?? '') as ClusterReview[] } catch { return initialClusterReviews() }
  })
  const [reviewHistory, setReviewHistory] = useState<ReviewHistory[]>(() => {
    try { return JSON.parse(localStorage.getItem('y-priority-review-history') ?? '') as ReviewHistory[] } catch { return [] }
  })
  const districtData = data.districtAnalysis.find((row) => row.district === selectedDistrict)
  const sourceIssues = districtData?.priorityIssues ?? data.priorityIssues
  const sourceMonthly = districtData?.monthlyComplaints ?? data.monthlyComplaints
  const rankedIssues = useMemo(() => {
    const baseRanks = new Map(sourceIssues.map((issue, index) => [issue.issue, index + 1]))
    const ranked = sourceIssues.map((issue) => ({ ...issue, adjustedScore: (Object.keys(weights) as WeightKey[]).reduce((score, key) => score + issue.componentValues[key] * weights[key], 0), baseRank: baseRanks.get(issue.issue) ?? 0, rankDelta: 0 }))
    ranked.sort((a, b) => b.adjustedScore - a.adjustedScore)
    return ranked.map((issue, index) => ({ ...issue, rankDelta: issue.baseRank - (index + 1) }))
  }, [weights, sourceIssues])
  const selectedIssue = rankedIssues.find((issue) => issue.issue === selectedIssueName) ?? rankedIssues[0]
  useEffect(() => {
    if (rankedIssues.length && !rankedIssues.some((issue) => issue.issue === selectedIssueName)) setSelectedIssueName(rankedIssues[0].issue)
  }, [rankedIssues, selectedIssueName])
  useEffect(() => { localStorage.setItem('y-priority-cluster-reviews', JSON.stringify(clusterReviews)) }, [clusterReviews])
  useEffect(() => { localStorage.setItem('y-priority-review-history', JSON.stringify(reviewHistory)) }, [reviewHistory])
  const demoSteps = [
    { id: 'quality', title: '부분 집계 발견', description: '2025-12를 7.6% 부분 집계로 판정해 추세와 순위에서 제외합니다.' },
    { id: 'priority', title: '우선순위 변화', description: '규모 가중치를 50%로 조정해 정책 기준에 따른 순위 변화를 확인합니다.' },
    { id: 'report', title: '실행 검토서', description: '선택 이슈의 질문·조치 후보·KPI를 인쇄 가능한 문서로 저장합니다.' },
  ]
  const goDemo = (index: number) => {
    const bounded = Math.max(0, Math.min(index, demoSteps.length - 1))
    if (bounded === 1) setWeights((current) => rebalanceWeights(current, 'volume', 50))
    setDemoIndex(bounded); setActiveNav(demoSteps[bounded].id)
    window.setTimeout(() => scrollToSection(demoSteps[bounded].id), 40)
  }
  const nextDemo = () => goDemo(demoIndex < 0 ? 0 : Math.min(demoIndex + 1, demoSteps.length - 1))
  const stopDemo = () => { setDemoIndex(-1); setWeights(defaultWeights); setActiveNav('overview'); scrollToSection('overview') }
  const saveReview = (next: ClusterReview) => {
    const before = clusterReviews.find((review) => review.clusterId === next.clusterId)
    if (!before) return
    setClusterReviews((current) => current.map((review) => review.clusterId === next.clusterId ? next : review))
    setReviewHistory((current) => [...current, { at: next.updatedAt, clusterId: next.clusterId, before, after: next }])
  }
  const resetReviews = () => { setClusterReviews(initialClusterReviews()); setReviewHistory([]); localStorage.removeItem('y-priority-cluster-reviews'); localStorage.removeItem('y-priority-review-history') }
  const exportReviews = (format: 'json' | 'csv') => {
    if (format === 'json') return downloadText(JSON.stringify({ exportedAt: new Date().toISOString(), reviews: clusterReviews, history: reviewHistory }, null, 2), 'Y-Priority-AI-군집검토이력.json', 'application/json;charset=utf-8')
    const headers = ['clusterId', 'label', 'category', 'status', 'mergeCandidate', 'reason', 'note', 'updatedAt']
    const rows = clusterReviews.map((review) => headers.map((key) => csvCell(review[key as keyof ClusterReview])).join(','))
    downloadText(`\uFEFF${headers.join(',')}\n${rows.join('\n')}`, 'Y-Priority-AI-군집검토이력.csv', 'text/csv;charset=utf-8')
  }
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand"><img src={yonginBrand} alt="용인시 공식 통합도시브랜드" /><div><strong>Y-Priority AI</strong><span>공무원용 실행 우선순위</span></div></div>
        <nav>{navItems.map((item) => <button key={item.id} type="button" className={activeNav === item.id ? 'active' : ''} onClick={() => { setActiveNav(item.id); scrollToSection(item.id) }}><item.icon />{item.label}</button>)}</nav>
        <div className="source-summary"><span>현재 검증 데이터</span><strong>{formatNumber(data.summary.totalAnalyzedRows)}행</strong><p>두 공개 데이터셋 간 중복 가능</p><button type="button" onClick={nextDemo}><ChartLine /> 3분 시연 {demoIndex < 0 ? '시작' : `${demoIndex + 1}/3`}</button></div>
      </aside>
      <main>
        <header className="topbar"><div><h1>공무원의 다음 검토 순서를 제안합니다</h1><p>시민용 민원 현황 공개를 대체하지 않습니다. 변화 신호와 업무 부담을 해석해 담당부서의 주간 검토·회의 준비를 돕습니다.</p></div><div><span><CalendarCheck /> {data.summary.generatedAt}</span><span><Lock /> 로컬·CSV 전용</span></div></header>
        <div className="context-bar"><div><span>분석 지역</span><div role="group" aria-label="현재 분석 지역">{['전체', ...data.districtAnalysis.map((row) => row.district)].map((district) => <button key={district} type="button" aria-pressed={selectedDistrict === district} onClick={() => setSelectedDistrict(district)}>{district}</button>)}</div></div><p>{selectedDistrict === '전체' ? '전체 공개 새올 처리 행 기준' : `${selectedDistrict}가 처리부서명 또는 민원명에 명시된 행만 사용`} · {data.summary.priorityComparisonPeriod}</p></div>
        <section className="civic-hero" aria-labelledby="civic-hero-title">
          <img src={civicHero} alt="용인의 도시 데이터를 검토 우선순위와 실행 문서로 전환하는 시각화" />
          <div className="civic-hero-copy"><span>INTERNAL WORKFLOW AI · NOT A CITIZEN PORTAL</span><h2 id="civic-hero-title">현황을 보여주는 일을 넘어,<br />이번 주 먼저 검토할<br />생활문제를 정합니다.</h2><p>반복·증가·안전·부서 부담을 함께 읽고, 담당자가 근거를 조정해 회의 안건과 실행 검토서로 남깁니다.</p><div className="hero-actions"><button type="button" onClick={nextDemo}><ChartLine /> 실무 시연 시작</button><button type="button" className="secondary" onClick={() => scrollToSection('priority')}>이번 주 검토 후보</button></div></div>
          <div className="hero-finding"><span>{selectedDistrict} 1위 검토 후보</span><strong>{rankedIssues[0]?.issue ?? '검토 후보 없음'}</strong><div><b>{formatNumber(rankedIssues[0]?.currentCount ?? 0)}건</b><b>{formatPercent(rankedIssues[0]?.growthRate ?? 0)}</b><b>{(rankedIssues[0]?.adjustedScore ?? 0).toFixed(1)}점</b></div><small>{data.summary.priorityComparisonPeriod}</small></div>
        </section>
        <div className="workflow-steps" aria-label="공무원 실무 흐름"><span>01 데이터 검증</span><i /><span>02 이번 주 신호 확인</span><i /><span>03 우선순위 조정</span><i /><span>04 부서 검토</span><i /><span>05 회의 안건·실행 문서</span></div>
        <section className="truth-banner"><CircleWarning /><div><strong>의사결정 보조, 자동 결정 아님</strong><span>부분 집계 월은 제외하고 양쪽에 존재하는 동일기간만 비교합니다. AI 군집은 낮은 신뢰도를 숨기지 않고 담당자 검토 대상으로 표시합니다.</span></div></section>

        <section id="overview" className="section-block overview-block">
          <div className="section-title"><span>실무자 브리핑</span><h2>이번 주 회의에서 먼저 검토할 것</h2><p>최신 완전월은 {data.summary.latestCompleteMonth}, 우선순위 비교는 {data.summary.priorityComparisonPeriod}입니다.</p></div>
          <div className="kpi-grid"><Kpi title="분석 처리 행" value={formatNumber(data.summary.totalAnalyzedRows)} detail="고유 민원 수가 아닌 처리 행 합계" /><Kpi title="부분 집계 제외" value={data.summary.excludedPartialMonths.join(', ')} detail="정상 월·증가율·순위에서 제외" tone="amber" /><Kpi title="규칙 미분류" value={`${data.dataQuality.ruleUnclassifiedShare.toFixed(1)}%`} detail="AI 군집 검토 후보" tone="green" /><Kpi title="우선 검토 후보" value={`${rankedIssues.length}개`} detail={`1위 ${rankedIssues[0]?.issue}`} tone="slate" /></div>
          <div className="trend-panel"><div><h3>{selectedDistrict} 완전 집계 월별 흐름</h3><p>{data.summary.excludedPartialMonths.join(', ')} 제외 · 단위: 건</p></div><LineChart points={sourceMonthly} /></div>
        </section>

        <section id="district" className="section-block"><div className="section-title"><span>지역 비교</span><h2>명시된 근거만으로 세 구를 비교</h2><p>주소가 없는 행을 임의 배분하지 않고 처리부서명·민원명에 구 이름이 명시된 행만 사용합니다.</p></div><DistrictPanel districts={data.districtAnalysis} selected={selectedDistrict} onSelect={setSelectedDistrict} />{districtData ? <div className="district-breakdown"><div><strong>{selectedDistrict} 주요 카테고리</strong>{districtData.categorySummary.slice(0, 5).map((row) => <p key={row.category}><span>{row.category}</span><b>{formatNumber(row.currentCount)}건</b><em>{formatPercent(row.growthRate)}</em></p>)}</div><div><strong>{selectedDistrict} 부서 부담</strong>{districtData.departmentBurden.slice(0, 5).map((row) => <p key={row.department}><span>{row.department}</span><b>{formatNumber(row.count)}행</b><em>{row.topCategory}</em></p>)}</div></div> : null}</section>

        <section id="csv-input" className="section-block"><div className="section-title"><span>CSV 불러오기</span><h2>먼저 파일이 분석 가능한지 확인</h2><p>공공데이터 API 없이 용인시 공개 CSV를 로컬 스트리밍 파이프라인으로 처리합니다.</p></div><CsvInput /></section>
        <section id="quality" className="section-block"><div className="section-title"><span>데이터 품질</span><h2>부분 월과 비교기간을 분석 전에 차단</h2><p>원본 파일과 산출물 사이의 판단 근거를 재현할 수 있습니다.</p></div><QualityPanel quality={data.dataQuality} /></section>
        <section id="signals" className="section-block"><div className="section-title"><span>변화 신호</span><h2>규칙 기준선과 로컬 AI를 함께 검토</h2><p>급증 여부는 최신 완전월 기준이며, 군집은 빈도 상위 민원명의 유사 표현을 탐색합니다.</p></div>{selectedDistrict !== '전체' ? <p className="scope-notice"><CircleWarning /> 이상징후와 AI 군집은 지역 판정 행만으로 재학습하지 않고 전체 원본 기준을 유지합니다.</p> : null}<div className="two-column"><div><div className="subheading"><h3>급증 이상징후</h3><span>{data.methodology.anomalyDetection}</span></div><SignalTable signals={data.anomalySignals} /></div><div><div className="subheading"><h3>유사 민원 군집</h3><span>{data.methodology.classification}</span></div><ClusterList clusters={data.aiClusters} /></div></div></section>
        <section id="cluster-review" className="section-block"><div className="section-title"><span>사람 중심 AI 검토</span><h2>군집을 수정·승인하고 변경 근거를 남깁니다</h2><p>AI 결과를 자동 확정하지 않으며 모든 변경은 브라우저 로컬 저장소와 내보내기 파일에 기록됩니다.</p></div><ClusterReviewWorkbench reviews={clusterReviews} history={reviewHistory} onSave={saveReview} onReset={resetReviews} onExport={exportReviews} /></section>
        <section id="priority" className="section-block"><div className="section-title"><span>우선순위 · {selectedDistrict}</span><h2>정책 목적에 맞게 가중치를 조정</h2><p>기본 산식을 숨기지 않고 순위 변화와 점수 기여도를 즉시 확인합니다.</p></div><WeightControls weights={weights} onChange={(key, value) => setWeights((current) => rebalanceWeights(current, key, value))} onReset={() => setWeights(defaultWeights)} />{rankedIssues.length && selectedIssue ? <PriorityTable issues={rankedIssues} selected={selectedIssue.issue} onSelect={(issue) => { setSelectedIssueName(issue.issue); scrollToSection('detail') }} /> : <p className="empty-state">현재 지역에서 기준을 충족하는 우선 검토 이슈가 없습니다.</p>}</section>
        <section id="detail" className="section-block"><div className="section-title"><span>이슈 상세</span><h2>점수보다 먼저 확인할 근거와 질문</h2><p>후속 조치는 확정 처방이 아니라 담당부서 원자료 검토 후보입니다.</p></div>{selectedIssue ? <IssueDetail issue={selectedIssue} weights={weights} /> : <p className="empty-state">먼저 우선 검토 이슈를 선택하세요.</p>}</section>
        <section id="report" className="section-block"><div className="section-title"><span>실행 보고서</span><h2>회의 안건으로 바로 전달할 수 있는 형식</h2><p>브라우저 인쇄 기능으로 PDF 저장하거나 UTF-8 HTML 원본을 보관합니다.</p></div>{selectedIssue ? <ReportPanel issue={selectedIssue} weights={weights} /> : <p className="empty-state">보고서를 생성할 이슈가 없습니다.</p>}</section>
        <section id="validation" className="section-block"><div className="section-title"><span>사용자 검증 워크벤치</span><h2>기존 방식과 실제 과업 완료시간을 비교</h2><p>실제 응답만 기록하며 기준 시간이 없으면 비워 둡니다. 예시 응답은 성과로 집계하지 않습니다.</p></div><ValidationWorkbench /></section>
        <section id="outcomes" className="section-block"><div className="section-title"><span>도입 성과 추적</span><h2>민원 변화와 업무 효율을 한 번에 보고</h2><p>우선순위 기반 조치 전후의 민원량·시민 만족도·공무원 검토 시간을 같은 기준으로 비교해 관리자 보고 근거를 만듭니다.</p></div><OutcomeTracker /></section>
        <section id="reference" className="section-block reference"><div className="section-title"><span>참고 데이터</span><h2>핵심 점수와 분리된 부가 자료</h2><p>CCTV·범죄·합성 제보는 민원 우선순위에 사용하지 않습니다.</p></div><div className="reference-grid"><article><strong>재난 CCTV</strong><p>{formatNumber(data.cctvPoints.length)}개 공개 좌표</p><span>민원 위치와 결합하지 않음</span></article><article><strong>경찰서 집계</strong><p>{data.crimeSummary.length}개 행</p><span>범죄 예측에 사용하지 않음</span></article><article><strong>합성 연동 예시</strong><p>{data.sampleReports.length}개 DEMO</p><span>모든 위치값 null · 실제 신고 아님</span></article></div></section>
        {demoIndex >= 0 ? <div className="demo-controller" role="region" aria-label="3분 시연 컨트롤"><div><span>3분 시연 {demoIndex + 1}/3</span><strong>{demoSteps[demoIndex].title}</strong><p>{demoSteps[demoIndex].description}</p></div><div><button type="button" disabled={demoIndex === 0} onClick={() => goDemo(demoIndex - 1)}>이전</button><button type="button" disabled={demoIndex === demoSteps.length - 1} onClick={() => goDemo(demoIndex + 1)}>다음</button><button type="button" onClick={stopDemo}>시연 초기화</button></div></div> : null}
        <footer><span>{data.methodology.priorityFormula}</span><span>Y-Priority AI · 시민용 현황 공개와 분리된 공무원용 판단 보조 레이어</span></footer>
      </main>
    </div>
  )
}
