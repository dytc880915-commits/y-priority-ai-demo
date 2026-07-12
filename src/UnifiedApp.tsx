import { useMemo, useState } from "react";
import ArrowReload02 from "coolicons-react/src/outline/Arrow/ArrowReload02.jsx";
import BookOpen from "coolicons-react/src/outline/Interface/BookOpen.jsx";
import CalendarCheck from "coolicons-react/src/outline/Calendar/CalendarCheck.jsx";
import ChartLine from "coolicons-react/src/outline/Interface/ChartLine.jsx";
import Check from "coolicons-react/src/outline/Interface/Check.jsx";
import CircleWarning from "coolicons-react/src/outline/Warning/CircleWarning.jsx";
import Download from "coolicons-react/src/outline/Interface/Download.jsx";
import data from "./data/integrated-dashboard-data.json";
import yonginBrand from "./assets/yongin-integrated-brand.jpg";

type Priority = (typeof data.baseline.priorities)[number];
type PageId =
  | "overview"
  | "trend"
  | "official2026"
  | "operations"
  | "context"
  | "priority"
  | "report"
  | "sources";

const pages: Array<{ id: PageId; label: string; icon: typeof ChartLine }> = [
  { id: "overview", label: "통합 브리핑", icon: ChartLine },
  { id: "trend", label: "장기 민원 분석", icon: ArrowReload02 },
  { id: "official2026", label: "2026 공개 민원", icon: CalendarCheck },
  { id: "operations", label: "부서·지역", icon: Check },
  { id: "context", label: "도시 맥락", icon: CircleWarning },
  { id: "priority", label: "검토 큐", icon: CalendarCheck },
  { id: "report", label: "실행 보고", icon: BookOpen },
  { id: "sources", label: "데이터 근거", icon: Download },
];
const pageMeta: Record<PageId, { title: string; description: string }> = {
  overview: { title: "장기 민원 우선검토 현황", description: "2020~2025년 민원 원자료의 규모·증가·반복·부서 부담을 확인합니다." },
  trend: { title: "장기 민원 추세 분석", description: "전체는 공통 1~10월 연도별, 특정 연도는 월별로 비교합니다." },
  official2026: { title: "2026년 공개 민원 분석", description: "용인시 공개 상세 6,435건을 장기점수와 분리해 최신 확인등급으로 분석합니다." },
  operations: { title: "부서·지역 업무 부담", description: "처리부서와 민원명에 명시된 근거만 사용해 업무량과 지역 변화를 비교합니다." },
  context: { title: "도시 맥락 지표", description: "인구·경제·뉴스·SNS 지표를 민원 원인이 아닌 검토 맥락으로 확인합니다." },
  priority: { title: "통합 검토 큐", description: "장기 기준점수와 2026 최신 확인등급을 나란히 보고 담당자가 판단합니다." },
  report: { title: "의사결정 메모", description: "선택 이슈의 장기 근거, 최신 확인, 담당자 상태를 보고서로 정리합니다." },
  sources: { title: "데이터 근거와 한계", description: "사용 데이터의 출처·기간·역할과 해석 제한을 확인합니다." },
};
const liveUrl = "https://live-proxy-sooty.vercel.app/api/yongin-dashboard";
const number = (value: number) => new Intl.NumberFormat("ko-KR").format(value);
const month = (value: string) =>
  value.includes("-") ? value : `${value.slice(0, 4)}-${value.slice(4)}`;

function Kpi({
  label,
  value,
  detail,
  tone = "",
}: {
  label: string;
  value: string;
  detail: string;
  tone?: string;
}) {
  return (
    <article className={`integrated-kpi ${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      <p>{detail}</p>
    </article>
  );
}

function LineChart({
  rows,
  label,
  showLabels = false,
}: {
  rows: Array<{ month: string; count: number }>;
  label: string;
  showLabels?: boolean;
}) {
  const width = 920,
    height = 250,
    padX = 88,
    padY = 38;
  const values = rows.map((row) => row.count);
  const min = Math.min(...values),
    max = Math.max(...values),
    range = Math.max(max - min, 1);
  const x = (i: number) =>
    padX + (i / Math.max(rows.length - 1, 1)) * (width - padX * 2);
  const y = (v: number) =>
    height - padY - ((v - min) / range) * (height - padY * 2);
  const path = rows
    .map((row, i) => `${i ? "L" : "M"} ${x(i)} ${y(row.count)}`)
    .join(" ");
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((ratio) =>
    Math.round(min + range * ratio),
  );
  return (
    <div className="integrated-chart">
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={label}>
        {ticks.map((tick) => (
          <g className="axis-tick" key={tick}>
            <line x1={padX} x2={width - padX} y1={y(tick)} y2={y(tick)} />
            <text x={padX - 8} y={y(tick) + 4} textAnchor="end">
              {number(tick)}
            </text>
          </g>
        ))}
        <path d={path} />
        {rows.map((row, i) => {
          const peak = row.count === max;
          return (
            <g className={peak ? "peak" : ""} key={`${row.month}-${i}`}>
              <circle cx={x(i)} cy={y(row.count)} r={peak ? 6 : 4}>
                <title>
                  {row.month} · {number(row.count)}건
                </title>
              </circle>
              {showLabels ? (
                <text
                  className="point-label"
                  x={x(i)}
                  y={Math.max(y(row.count) - 11, 12)}
                  textAnchor="middle"
                >
                  {number(row.count)}
                </text>
              ) : null}
              <text
                className="month-label"
                x={x(i)}
                y={height - 10}
                textAnchor="middle"
              >
                {row.month.length === 4 ? row.month : row.month.slice(2)}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export default function UnifiedApp() {
  const hash = location.hash.slice(1) as PageId;
  const [active, setActive] = useState<PageId>(
    pages.some((page) => page.id === hash) ? hash : "overview",
  );
  const [official, setOfficial] = useState(data.officialComplaints);
  const [refresh, setRefresh] = useState({ state: "idle", message: "" });
  const [selectedIssue, setSelectedIssue] = useState(
    data.baseline.priorities[0].issue,
  );
  const [trendYear, setTrendYear] = useState("전체");
  const [trendDistrict, setTrendDistrict] = useState("전체");
  const [reviews, setReviews] = useState<Record<string, string>>(() => {
    try {
      return JSON.parse(localStorage.getItem("yq-integrated-reviews") ?? "{}");
    } catch {
      return {};
    }
  });
  const selected =
    data.baseline.priorities.find((row) => row.issue === selectedIssue) ??
    data.baseline.priorities[0];
  const selectedCheck =
    data.officialComplaints.latestChecks.find(
      (row) => row.issue === selected.issue,
    ) ?? data.officialComplaints.latestChecks[0];
  const currentMonthly = official.monthly.map((row) => ({
    month: month(String(row.crtr_ym)),
    count: Number(row.tot_nocs),
  }));
  const trendSource =
    trendDistrict === "전체"
      ? data.baseline.monthly
      : (data.baseline.districts.find((row) => row.district === trendDistrict)
          ?.monthlyComplaints ?? []);
  const trendRows =
    trendYear === "전체"
      ? Object.entries(
          trendSource
            .filter((row) => Number(row.month.slice(5, 7)) <= 10)
            .reduce<Record<string, number>>((years, row) => {
              const year = row.month.slice(0, 4);
              years[year] = (years[year] ?? 0) + row.count;
              return years;
            }, {}),
        ).map(([year, count]) => ({ month: year, count }))
      : trendSource
          .filter((row) => row.month.startsWith(trendYear))
          .map((row) => ({ month: row.month, count: row.count }));
  const trendUnit = trendYear === "전체" ? "연" : "월";
  const trendTotal = trendRows.reduce((sum, row) => sum + row.count, 0);
  const trendAverage = trendRows.length
    ? Math.round(trendTotal / trendRows.length)
    : 0;
  const trendPeak = trendRows.reduce(
    (peak, row) => (row.count > peak.count ? row : peak),
    trendRows[0] ?? { month: "-", count: 0 },
  );
  const trendChange =
    trendRows.length > 1 && trendRows[0].count
      ? ((trendRows.at(-1)!.count - trendRows[0].count) / trendRows[0].count) *
        100
      : 0;
  const navigate = (id: PageId) => {
    setActive(id);
    history.pushState(null, "", `#${id}`);
    scrollTo({ top: 0 });
  };
  const review = (status: string) => {
    const next = { ...reviews, [selected.issue]: status };
    setReviews(next);
    localStorage.setItem("yq-integrated-reviews", JSON.stringify(next));
  };
  const refreshOfficial = async () => {
    setRefresh({
      state: "loading",
      message: "용인시 최신 민원 집계를 확인하고 있습니다.",
    });
    try {
      const response = await fetch(`${liveUrl}?t=${Date.now()}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const payload = await response.json();
      setOfficial((current) => ({
        ...current,
        latestMonth: payload.latestMonth,
        latestTotal: payload.latestMonthTotal,
        latestRate: payload.latestMonthRate,
        monthly: payload.monthly.map(
          (row: { month: string; count: number; changeRate: number }) => ({
            crtr_ym: row.month,
            tot_nocs: row.count,
            lsmth_nocs: 0,
            irds_rt: row.changeRate,
          }),
        ),
        categories: payload.categories.map(
          (row: { category: string; count: number }) => ({
            cvlcpt_clsf: row.category,
            tot_nocs: row.count,
          }),
        ),
        keywords: payload.keywords.map(
          (row: { keyword: string; count: number; month: string }) => ({
            crtr_ym: row.month,
            kwrd: row.keyword,
            tot_nocs: row.count,
          }),
        ),
      }));
      setRefresh({
        state: "success",
        message: `공식 ${month(payload.latestMonth)} 집계를 적용했습니다.`,
      });
    } catch (error) {
      setRefresh({
        state: "error",
        message: `갱신 실패: ${String(error)}. 저장된 스냅샷을 유지합니다.`,
      });
    }
  };
  const report = useMemo(
    () =>
      `${selected.issue}\n\n[장기 기준선]\n장기점수 ${selected.score.toFixed(1)}점\n${selected.comparisonPeriod}\n${number(selected.currentCount)}건 · ${selected.growthRate >= 0 ? "+" : ""}${selected.growthRate.toFixed(1)}%\n담당 후보: ${selected.dominantDepartment}\n\n[2026 최신 확인]\n공개 상세 매칭 ${number(selectedCheck.latestCount)}건 · ${selectedCheck.latestShare}%\n최신 확인등급: ${selectedCheck.latestGrade}\n제안 상태: ${selectedCheck.reviewStatus}\n\n[담당자 검토]\n영향: ${selected.impact}\n상태: ${reviews[selected.issue] ?? "미검토"}\n주의: 최신 0건은 문제 없음이 아니라 공개 상세 범위 미확인입니다.`,
    [selected, selectedCheck, reviews],
  );
  const saveReport = () => {
    const link = document.createElement("a");
    link.href = URL.createObjectURL(
      new Blob([report], { type: "text/plain;charset=utf-8" }),
    );
    link.download = `YQ-${selected.issue}.txt`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  return (
    <div className="app-shell unified-app">
      <aside className="sidebar">
        <div className="brand">
          <img src={yonginBrand} alt="용인특례시 통합도시브랜드" />
          <div>
            <strong>Y:Q</strong>
            <span>민원 검토·보고 업무도구</span>
          </div>
        </div>
        <nav aria-label="Y:Q 주요 업무">
          {pages.map((page) => (
            <button
              key={page.id}
              className={active === page.id ? "active" : ""}
              aria-current={active === page.id ? "page" : undefined}
              onClick={() => navigate(page.id)}
            >
              <page.icon />
              {page.label}
            </button>
          ))}
        </nav>
        <div className="bundle-status">
          <span>DATA BUNDLE</span>
          <strong>v{data.bundle.version}</strong>
          <p>민원 {number(data.bundle.publicComplaintRows)}행</p>
          <small>
            공식 {data.bundle.officialDatasets}종 · 연계{" "}
            {data.bundle.partnerDownloaded}종
          </small>
        </div>
      </aside>
      <main data-active-page={active}>
        <header className="topbar integrated-topbar">
          <div className="workspace-heading">
            <span className="product-kicker">Y:Q · {pages.find((page) => page.id === active)?.label}</span>
            <h1>{pageMeta[active].title}</h1>
            <p>{pageMeta[active].description}</p>
            <div className="compact-meta">
              <span><b>장기</b> 2020~2025</span>
              <span><b>최신</b> {month(official.latestMonth)}</span>
              <span><b>원칙</b> 기준선·최신 집계 분리</span>
            </div>
          </div>
          <button
            className="official-refresh"
            disabled={refresh.state === "loading"}
            onClick={refreshOfficial}
          >
            <ArrowReload02 />
            {refresh.state === "loading" ? "확인 중" : "최신 데이터 확인"}
          </button>
        </header>
        {refresh.message && (
          <div className={`refresh-notice ${refresh.state}`} role="status">
            {refresh.message}
          </div>
        )}
        <section id="overview" className="section-block">
          <div className="section-title">
            <span>공공데이터 기반 핵심 분석</span>
            <h2>장기 민원 우선검토 현황</h2>
            <p>
              2020~2025년 민원 원자료로 규모·증가·반복·부서 부담을 분석합니다.
            </p>
          </div>
          <div className="kpi-grid">
            <Kpi
              label="공공데이터 분석 행"
              value={`${number(data.bundle.publicComplaintRows)}행`}
              detail="두 민원 데이터셋의 원자료 행 합계"
            />
            <Kpi
              label="장기 분석 기간"
              value="2020~2025"
              detail="부분 집계 제외·동일기간 비교"
            />
            <Kpi
              label="검토 후보"
              value={`${data.baseline.priorities.length}개`}
              detail="자동 확정이 아닌 담당자 큐"
            />
            <Kpi
              label="2026 확인 레이어"
              value={`${number(official.detailRows)}건`}
              detail="별도 공개 범위·점수에 직접 합산 안 함"
              tone="current"
            />
          </div>
          <div className="briefing-grid">
            <div className="briefing-panel">
              <div className="panel-heading">
                <h3>장기 우선검토 TOP 5</h3>
                <button onClick={() => navigate("priority")}>전체 보기</button>
              </div>
              {data.baseline.priorities.slice(0, 5).map((row, index) => (
                <button
                  className="rank-row"
                  key={row.issue}
                  onClick={() => {
                    setSelectedIssue(row.issue);
                    navigate("priority");
                  }}
                >
                  <b>{String(index + 1).padStart(2, "0")}</b>
                  <span>
                    <strong>{row.issue}</strong>
                    <small>{row.dominantDepartment}</small>
                  </span>
                  <em>
                    {row.growthRate >= 0 ? "+" : ""}
                    {row.growthRate.toFixed(1)}%
                  </em>
                  <i>{row.score.toFixed(1)}점</i>
                </button>
              ))}
            </div>
            <div className="briefing-panel">
              <div className="panel-heading">
                <h3>2026 공식 분류</h3>
                <button onClick={() => navigate("trend")}>추세 보기</button>
              </div>
              {official.categories.slice(0, 6).map((row, index) => (
                <div className="rank-row static" key={row.cvlcpt_clsf}>
                  <b>{String(index + 1).padStart(2, "0")}</b>
                  <span>
                    <strong>{row.cvlcpt_clsf}</strong>
                    <small>용인시 공식 최신월</small>
                  </span>
                  <i>{number(Number(row.tot_nocs))}건</i>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="trend" className="section-block">
          <div className="section-title">
            <span>공공데이터포털 기반</span>
            <h2>장기 민원 추세를 연도·지역별로 비교</h2>
            <p>
              전체는 모든 연도의 공통 1~10월을 연도별로 비교하고, 특정 연도는
              월별로 표시합니다. 점에 마우스를 올리면 정확한 값을 확인할 수
              있습니다.
            </p>
          </div>
          <div className="trend-filter-bar">
            <div>
              <span>연도</span>
              {["전체", "2020", "2021", "2022", "2023", "2024", "2025"].map(
                (year) => (
                  <button
                    className={trendYear === year ? "active" : ""}
                    key={year}
                    onClick={() => setTrendYear(year)}
                  >
                    {year}
                  </button>
                ),
              )}
            </div>
            <div>
              <span>지역</span>
              {["전체", "처인구", "기흥구", "수지구"].map((district) => (
                <button
                  className={trendDistrict === district ? "active" : ""}
                  key={district}
                  onClick={() => setTrendDistrict(district)}
                >
                  {district}
                </button>
              ))}
            </div>
          </div>
          <div className="trend-summary">
            <Kpi
              label="선택 기간 합계"
              value={`${number(trendTotal)}건`}
              detail={
                trendYear === "전체"
                  ? `${trendDistrict} · 공통 1~10월`
                  : `${trendDistrict} · ${trendYear}`
              }
            />
            <Kpi
              label={`${trendUnit}평균`}
              value={`${number(trendAverage)}건`}
              detail={`${trendRows.length}개 ${trendUnit}`}
            />
            <Kpi
              label={`최고 ${trendUnit}`}
              value={`${number(trendPeak.count)}건`}
              detail={trendPeak.month}
              tone="current"
            />
            <Kpi
              label={`첫 ${trendUnit} 대비`}
              value={`${trendChange >= 0 ? "+" : ""}${trendChange.toFixed(1)}%`}
              detail={`${trendRows[0]?.month ?? "-"} → ${trendRows.at(-1)?.month ?? "-"}`}
            />
          </div>
          <article className="trend-visual">
            <div className="panel-heading">
              <h3>
                {trendDistrict} ·{" "}
                {trendYear === "전체"
                  ? "공통 1~10월 · 연도별"
                  : `${trendYear} 월별`} 민원량
              </h3>
              <span>
                <i /> 최고값 강조 · 단위 건
              </span>
            </div>
            <LineChart
              rows={trendRows}
              label={`${trendDistrict} ${trendYear} 장기 민원 추세`}
              showLabels
            />
          </article>
          <div className="trend-table">
            <div className="trend-table-head">
              <b>{trendUnit}</b>
              <b>민원량</b>
              <b>{trendUnit}평균 대비</b>
              <b>시각 비교</b>
            </div>
            {trendRows.map((row) => (
              <div key={row.month}>
                <strong>{row.month}</strong>
                <b>{number(row.count)}건</b>
                <em className={row.count >= trendAverage ? "up" : "down"}>
                  {row.count >= trendAverage ? "▲" : "▼"}{" "}
                  {Math.abs(
                    ((row.count - trendAverage) / Math.max(trendAverage, 1)) *
                      100,
                  ).toFixed(1)}
                  %
                </em>
                <span>
                  <i
                    style={{
                      width: `${(row.count / Math.max(trendPeak.count, 1)) * 100}%`,
                    }}
                  />
                </span>
              </div>
            ))}
          </div>
        </section>

        <section id="official2026" className="section-block">
          <div className="section-title">
            <span>용인시 공개 데이터 전용</span>
            <h2>2026년 공개 민원에서 확인되는 것</h2>
            <p>
              {data.officialComplaints.analysisScope}. 장기 점수와 혼합하지 않고
              최신 확인등급으로만 사용합니다.
            </p>
          </div>
          <div className="kpi-grid">
            <Kpi
              label="2026년 5월 전체"
              value={`${number(official.latestTotal)}건`}
              detail={`전월 대비 ${official.latestRate > 0 ? "+" : ""}${official.latestRate.toFixed(1)}%`}
              tone="current"
            />
            <Kpi
              label="상세 공개 범위"
              value={`${number(official.detailRows)}건`}
              detail="전체 민원과 동일 모집단 아님"
            />
            <Kpi
              label="최다 공개 출처"
              value={data.officialComplaints.sourceDistribution[0].source}
              detail={`${number(data.officialComplaints.sourceDistribution[0].count)}건`}
            />
            <Kpi
              label="최다 반복 민원"
              value={data.officialComplaints.repeatedTitles[0].title}
              detail={`${number(data.officialComplaints.repeatedTitles[0].count)}건`}
            />
          </div>
          <div className="official-only-grid">
            <article>
              <h3>공식 분류</h3>
              {official.categories.map((row) => (
                <p key={row.cvlcpt_clsf}>
                  <span>{row.cvlcpt_clsf}</span>
                  <b>{number(Number(row.tot_nocs))}건</b>
                </p>
              ))}
            </article>
            <article>
              <h3>상세 공개 출처</h3>
              {data.officialComplaints.sourceDistribution.map((row) => (
                <p key={row.source}>
                  <span>{row.source}</span>
                  <b>{number(row.count)}건</b>
                </p>
              ))}
              <h3 className="subhead">반복 민원명 TOP 5</h3>
              {data.officialComplaints.repeatedTitles.slice(0, 5).map((row) => (
                <p key={row.title}>
                  <span>{row.title}</span>
                  <b>{number(row.count)}건</b>
                </p>
              ))}
            </article>
          </div>
          <LineChart rows={currentMonthly} label="2026 용인시 공식 민원 추이" />
          <div className="latest-check-table">
            <div className="latest-check-head">
              <b>장기 이슈</b>
              <b>2026 공개 상세 매칭</b>
              <b>최신 확인</b>
              <b>해석</b>
            </div>
            {data.officialComplaints.latestChecks.map((row) => (
              <div key={row.issue}>
                <strong>{row.issue}</strong>
                <span>
                  {number(row.latestCount)}건 · {row.latestShare}%
                </span>
                <em data-grade={row.latestGrade}>{row.latestGrade}</em>
                <small>
                  {row.latestCount
                    ? "공개 범위에서 관련 문자열 확인"
                    : "0건은 현재 문제 없음이 아닌 공개 범위 미확인"}
                </small>
              </div>
            ))}
          </div>
        </section>

        <section id="operations" className="section-block">
          <div className="section-title">
            <span>부서·지역</span>
            <h2>업무 부담과 지역 증거</h2>
            <p>
              처리부서·민원명에 명시된 값만 사용하며 미확인 지역은 추정하지
              않습니다.
            </p>
          </div>
          <div className="operations-grid">
            <article>
              <h3>부서 부담 TOP 10</h3>
              {data.baseline.departments.slice(0, 10).map((row) => (
                <div className="bar-row" key={row.department}>
                  <span>
                    {row.department}
                    <small>{row.topCategory}</small>
                  </span>
                  <div>
                    <i
                      style={{
                        width: `${(row.share / data.baseline.departments[0].share) * 100}%`,
                      }}
                    />
                  </div>
                  <b>{number(row.count)}</b>
                </div>
              ))}
            </article>
            <article>
              <h3>구별 명시 증거</h3>
              {data.baseline.districts.map((row) => (
                <div className="district-card" key={row.district}>
                  <span>{row.district}</span>
                  <strong>{number(row.currentCount)}건</strong>
                  <em>
                    {row.growthRate >= 0 ? "+" : ""}
                    {row.growthRate.toFixed(1)}%
                  </em>
                  <p>
                    {row.topDepartment} · {row.topCategory}
                  </p>
                </div>
              ))}
              <div className="infra-note">
                <b>CCTV {data.baseline.cctv.length}개 지점</b>
                <span>안전 인프라 배경</span>
                <b>경찰서 {data.baseline.crime.length}곳</b>
                <span>범죄 통계는 예측에 미사용</span>
              </div>
            </article>
          </div>
        </section>

        <section id="context" className="section-block">
          <div className="section-title">
            <span>도시 맥락</span>
            <h2>민원 뒤의 인구·경제·공론 신호</h2>
            <p>
              상관관계 검토용 지표이며 민원의 원인으로 자동 판정하지 않습니다.
            </p>
          </div>
          <div className="context-metric-grid">
            {data.population.metrics.slice(0, 6).map((item) => (
              <Kpi
                key={item.label}
                label={item.label}
                value={`${number(Number(item.value))}${item.unit}`}
                detail={String(item.period)}
              />
            ))}
          </div>
          <div className="context-columns">
            <article>
              <h3>경제·행정 지표</h3>
              {data.economy.metrics.slice(0, 6).map((item) => (
                <p key={item.label}>
                  <span>
                    {item.label}
                    <small>{item.period}</small>
                  </span>
                  <b>
                    {number(Number(item.value))}
                    {item.unit}
                  </b>
                </p>
              ))}
            </article>
            <article>
              <h3>뉴스 관심 TOP 8</h3>
              {data.publicAttention.newsTop.slice(0, 8).map((item) => (
                <p key={item.column}>
                  <span>{item.column}</span>
                  <b>{number(item.value)}</b>
                </p>
              ))}
            </article>
            <article>
              <h3>SNS 관심 TOP 8</h3>
              {data.publicAttention.snsTop.slice(0, 8).map((item) => (
                <p key={item.column}>
                  <span>{item.column}</span>
                  <b>{number(item.value)}</b>
                </p>
              ))}
            </article>
          </div>
        </section>

        <section id="priority" className="section-block">
          <div className="section-title">
            <span>통합 검토 큐</span>
            <h2>장기점수와 최신 확인을 나란히 판단</h2>
            <p>
              서로 다른 범위의 수치를 합산하지 않고 최종 검토상태만 규칙으로
              제안합니다.
            </p>
          </div>
          <div className="decision-layout">
            <div className="decision-list">
              {data.baseline.priorities.map((row, index) => {
                const check = data.officialComplaints.latestChecks.find(
                  (item) => item.issue === row.issue,
                );
                return (
                  <button
                    key={row.issue}
                    className={selected.issue === row.issue ? "selected" : ""}
                    onClick={() => setSelectedIssue(row.issue)}
                  >
                    <b>{String(index + 1).padStart(2, "0")}</b>
                    <span>
                      <strong>{row.issue}</strong>
                      <small>
                        장기 {row.score.toFixed(1)}점 · 최신{" "}
                        {check?.latestGrade} · {reviews[row.issue] ?? "미검토"}
                      </small>
                    </span>
                    <em>{check?.reviewStatus}</em>
                  </button>
                );
              })}
            </div>
            <aside className="decision-detail">
              <span>담당자 판단</span>
              <h3>{selected.issue}</h3>
              <div className="decision-numbers four">
                <b>
                  {selected.score.toFixed(1)}점<small>장기 기준점수</small>
                </b>
                <b>
                  {selectedCheck.latestGrade}
                  <small>2026 최신 확인</small>
                </b>
                <b>
                  {number(selectedCheck.latestCount)}건
                  <small>공개 상세 매칭</small>
                </b>
                <b>
                  {selectedCheck.reviewStatus}
                  <small>제안 상태</small>
                </b>
              </div>
              <p>{selected.rationale}</p>
              <div className="scope-warning">
                <CircleWarning />
                최신 0건은 문제 없음이 아니라 공개 상세 범위에서 확인되지
                않았다는 의미입니다.
              </div>
              <dl>
                <dt>담당 후보</dt>
                <dd>{selected.dominantDepartment}</dd>
                <dt>시민 영향</dt>
                <dd>{selected.impact}</dd>
                <dt>판단 기간</dt>
                <dd>{selected.comparisonPeriod}</dd>
              </dl>
              <div className="review-actions">
                <button onClick={() => review("승인")}>승인</button>
                <button onClick={() => review("보류")}>보류</button>
                <button onClick={() => review("추가확인")}>추가 확인</button>
              </div>
            </aside>
          </div>
        </section>

        <section id="report" className="section-block">
          <div className="section-title">
            <span>실행 보고</span>
            <h2>선택 이슈 의사결정 메모</h2>
            <p>
              장기 근거와 최신 확인등급, 담당자 판단을 한 파일로 내보냅니다.
            </p>
          </div>
          <div className="report-sheet">
            <span>Y:Q DECISION NOTE · {month(official.latestMonth)}</span>
            <h3>{selected.issue}</h3>
            <div className="kpi-grid">
              <Kpi
                label="장기 기준점수"
                value={`${selected.score.toFixed(1)}점`}
                detail="공공데이터포털 기반"
              />
              <Kpi
                label="2026 최신 확인"
                value={selectedCheck.latestGrade}
                detail={`${number(selectedCheck.latestCount)}건 매칭`}
              />
              <Kpi
                label="제안 상태"
                value={selectedCheck.reviewStatus}
                detail="두 점수를 직접 합산하지 않음"
              />
              <Kpi
                label="담당자 상태"
                value={reviews[selected.issue] ?? "미검토"}
                detail="최종 결정은 담당자"
              />
            </div>
            <pre>{report}</pre>
            <button className="official-refresh" onClick={saveReport}>
              <Download /> 의사결정 메모 저장
            </button>
          </div>
        </section>

        <section id="sources" className="section-block">
          <div className="section-title">
            <span>데이터 근거</span>
            <h2>무엇을 어디에 사용했는가</h2>
            <p>
              출처·시점·역할·한계를 심사위원과 실무자가 바로 확인할 수 있습니다.
            </p>
          </div>
          <div className="source-grid">
            <article>
              <b>공공데이터포털</b>
              <strong>{number(data.bundle.publicComplaintRows)}행</strong>
              <p>2020~2025 장기 민원, 부서·출처·키워드 기준선</p>
            </article>
            <article>
              <b>용인시 직접 대시보드</b>
              <strong>{data.bundle.officialDatasets}종</strong>
              <p>2026 최신 민원, 인구, 경제, SNS·뉴스, 용인지표</p>
            </article>
            <article>
              <b>외부 연계 서비스</b>
              <strong>{data.bundle.partnerDownloaded}종</strong>
              <p>생활패턴 공개 응답. 방문소비는 다운로드 차단으로 제외</p>
            </article>
            <article>
              <b>안전 보조 데이터</b>
              <strong>
                {data.baseline.cctv.length + data.baseline.crime.length}개 단위
              </strong>
              <p>CCTV와 경찰서 통계는 배경 설명에만 사용</p>
            </article>
          </div>
          <div className="limitations">
            <h3>해석 제한</h3>
            {data.limitations.map((item) => (
              <p key={item}>
                <CircleWarning />
                {item}
              </p>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
