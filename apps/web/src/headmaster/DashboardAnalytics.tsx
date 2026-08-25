export interface DashboardAnalytics {
  overview: {
    student_count: number;
    average_score: number | null;
    completion_rate: number;
    average_attitude: number | null;
    students_needing_support: number;
  };
  period_trend: Array<{
    period_id: number;
    label: string;
    student_count: number;
    average_score: number | null;
    completion_rate: number;
    average_attitude: number | null;
  }>;
  class_ranking: Array<{
    rank: number;
    class_id: number;
    class_name: string;
    student_count: number;
    average_score: number | null;
    completion_rate: number;
    average_attitude: number | null;
  }>;
  student_ranking: Array<{
    rank: number;
    student_id: number;
    student_name: string;
    class_name: string;
    average_score: number;
    completed_assignments: number;
    average_attitude: number | null;
  }>;
  subject_performance: Array<{
    subject_id: number;
    subject_name: string;
    assignment_count: number;
    average_score: number | null;
    completion_rate: number;
  }>;
  insight_signals: Array<{
    key: string;
    title: string;
    detail: string;
    metric: number | string;
    tone: "positive" | "warning" | "neutral";
  }>;
}

export interface DashboardAnalyticsProps {
  analytics: DashboardAnalytics;
}

export function DashboardAnalytics({ analytics }: DashboardAnalyticsProps) {
  return (
    <section className="dashboard-analytics" aria-labelledby="analytics-heading">
      <div className="section-heading-row">
        <div>
          <span className="eyebrow">AI-ready data highlights</span>
          <h2 id="analytics-heading">School insights</h2>
        </div>
      </div>
      <InsightSignalGrid signals={analytics.insight_signals} />
      <div className="analytics-grid">
        <PeriodTrendCard trend={analytics.period_trend} />
        <SubjectPerformanceCard subjects={analytics.subject_performance} />
      </div>
      <div className="analytics-grid analytics-grid-wide">
        <ClassRankingTable rows={analytics.class_ranking} />
        <StudentRankingTable rows={analytics.student_ranking} />
      </div>
      <SupportSignals analytics={analytics} />
    </section>
  );
}

function InsightSignalGrid({
  signals,
}: {
  signals: DashboardAnalytics["insight_signals"];
}) {
  return (
    <div className="insight-signal-grid">
      {signals.map((signal) => (
        <article className={`insight-signal-card insight-tone-${signal.tone}`} key={signal.key}>
          <div className="insight-signal-header">
            <span className="insight-tone-label">{toneLabel(signal.tone)}</span>
            <strong className="insight-signal-metric">{formatMetric(signal.metric)}</strong>
          </div>
          <h3>{signal.title}</h3>
          <p>{signal.detail}</p>
        </article>
      ))}
    </div>
  );
}

function PeriodTrendCard({
  trend,
}: {
  trend: DashboardAnalytics["period_trend"];
}) {
  const maxAverage = Math.max(
    ...trend.map((period) => period.average_score ?? 0),
    1
  );

  return (
    <article className="chart-card analytics-trend">
      <h3 className="chart-title">Period trend</h3>
      <div className="analytics-trend-list">
        {trend.map((period) => (
          <div className="analytics-trend-row" key={period.period_id}>
            <div className="analytics-trend-copy">
              <strong>{period.label}</strong>
              <span>{period.student_count} students tracked</span>
            </div>
            <div className="analytics-trend-bar-wrap">
              <div className="analytics-trend-bar" aria-hidden="true">
                <div
                  className="analytics-trend-fill"
                  style={{ width: `${((period.average_score ?? 0) / maxAverage) * 100}%` }}
                />
              </div>
              <div className="analytics-trend-values">
                <span>{formatScore(period.average_score)}</span>
                <span>{formatPercent(period.completion_rate)} completion</span>
                <span>{formatAttitude(period.average_attitude)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </article>
  );
}

function SubjectPerformanceCard({
  subjects,
}: {
  subjects: DashboardAnalytics["subject_performance"];
}) {
  return (
    <article className="chart-card">
      <h3 className="chart-title">Subject performance</h3>
      <div className="support-signal-list">
        {subjects.map((subject) => (
          <div className="support-signal-item" key={subject.subject_id}>
            <div>
              <strong>{subject.subject_name}</strong>
              <span>{subject.assignment_count} assignments</span>
            </div>
            <div className="support-signal-metrics">
              <span>{formatScore(subject.average_score)}</span>
              <span>{formatPercent(subject.completion_rate)} completion</span>
            </div>
          </div>
        ))}
      </div>
    </article>
  );
}

function ClassRankingTable({
  rows,
}: {
  rows: DashboardAnalytics["class_ranking"];
}) {
  return (
    <article className="chart-card">
      <h3 className="chart-title">Class performance ranking</h3>
      <div className="ranking-table-wrap">
        <table className="ranking-table">
          <thead>
            <tr>
              <th>Rank</th>
              <th>Class</th>
              <th>Students</th>
              <th>Average score</th>
              <th>Completion</th>
              <th>Attitude</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.class_id}>
                <td>{row.rank}</td>
                <td className="cell-bold">{row.class_name}</td>
                <td>{row.student_count}</td>
                <td>{formatScore(row.average_score)}</td>
                <td>{formatPercent(row.completion_rate)}</td>
                <td>{formatAttitude(row.average_attitude)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </article>
  );
}

function StudentRankingTable({
  rows,
}: {
  rows: DashboardAnalytics["student_ranking"];
}) {
  return (
    <article className="chart-card">
      <h3 className="chart-title">Student performance ranking</h3>
      {rows.length === 0 ? (
        <div className="chart-empty">No ranked students yet</div>
      ) : (
        <div className="ranking-table-wrap">
          <table className="ranking-table">
            <thead>
              <tr>
                <th>Rank</th>
                <th>Student</th>
                <th>Class</th>
                <th>Average score</th>
                <th>Completed assignments</th>
                <th>Attitude</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.student_id}>
                  <td>{row.rank}</td>
                  <td className="cell-bold">{row.student_name}</td>
                  <td>{row.class_name}</td>
                  <td>{formatScore(row.average_score)}</td>
                  <td>{row.completed_assignments}</td>
                  <td>{formatAttitude(row.average_attitude)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </article>
  );
}

function SupportSignals({ analytics }: DashboardAnalyticsProps) {
  return (
    <article className="chart-card">
      <h3 className="chart-title">Support signals</h3>
      <div className="support-signal-list">
        <div className="support-signal-item">
          <div>
            <strong>Students needing support</strong>
            <span>Follow up on students flagged across the selected period.</span>
          </div>
          <div className="support-signal-metrics">
            <span>{analytics.overview.students_needing_support} flagged</span>
          </div>
        </div>
        <div className="support-signal-item">
          <div>
            <strong>Average score snapshot</strong>
            <span>School-wide average based on graded assignments.</span>
          </div>
          <div className="support-signal-metrics">
            <span>{formatScore(analytics.overview.average_score)}</span>
          </div>
        </div>
        <div className="support-signal-item">
          <div>
            <strong>Average attitude snapshot</strong>
            <span>Observed attitude trend for the selected period.</span>
          </div>
          <div className="support-signal-metrics">
            <span>{formatAttitude(analytics.overview.average_attitude)}</span>
          </div>
        </div>
      </div>
    </article>
  );
}

function toneLabel(tone: DashboardAnalytics["insight_signals"][number]["tone"]): string {
  if (tone === "positive") return "Positive signal";
  if (tone === "warning") return "Warning signal";
  return "Neutral signal";
}

function formatScore(score: number | null): string {
  if (score === null) return "No graded data";
  return `${score.toFixed(1)}`;
}

function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

function formatAttitude(score: number | null): string {
  if (score === null) return "No graded data";
  return `${score.toFixed(1)} / 4.0`;
}

function formatMetric(metric: number | string): string {
  return typeof metric === "number" ? metric.toFixed(1) : metric;
}
