import assert from "node:assert/strict";
import test from "node:test";
import { create, type ReactTestRenderer } from "react-test-renderer";
import { DashboardAnalytics } from "./DashboardAnalytics";

function renderedText(renderer: ReactTestRenderer): string {
  return JSON.stringify(renderer.toJSON());
}

const analytics = {
  overview: {
    student_count: 30,
    average_score: 82.4,
    completion_rate: 78.3,
    average_attitude: 3.1,
    students_needing_support: 4,
  },
  period_trend: [
    {
      period_id: 3,
      label: "2024/2025 · Semester 1",
      student_count: 24,
      average_score: null,
      completion_rate: 0,
      average_attitude: null,
    },
    {
      period_id: 2,
      label: "2025/2026 · Semester 2",
      student_count: 30,
      average_score: 82.4,
      completion_rate: 78.3,
      average_attitude: 3.1,
    },
  ],
  class_ranking: [
    {
      rank: 1,
      class_id: 3,
      class_name: "XI-A",
      student_count: 5,
      average_score: 91.2,
      completion_rate: 94,
      average_attitude: 3.8,
    },
    {
      rank: 2,
      class_id: 1,
      class_name: "X-A",
      student_count: 5,
      average_score: 80.1,
      completion_rate: 72,
      average_attitude: 3.2,
    },
  ],
  student_ranking: [
    {
      rank: 1,
      student_id: 11,
      student_name: "Kartika Sari",
      class_name: "XI-A",
      average_score: 96,
      completed_assignments: 4,
      average_attitude: 4,
    },
    {
      rank: 2,
      student_id: 1,
      student_name: "Ahmad Rizki Pratama",
      class_name: "X-A",
      average_score: 88,
      completed_assignments: 3,
      average_attitude: 3,
    },
  ],
  subject_performance: [
    {
      subject_id: 1,
      subject_name: "Matematika",
      assignment_count: 6,
      average_score: 84.5,
      completion_rate: 81,
    },
    {
      subject_id: 2,
      subject_name: "Bahasa Indonesia",
      assignment_count: 4,
      average_score: null,
      completion_rate: 0,
    },
  ],
  insight_signals: [
    {
      key: "top_class",
      title: "Top-performing class",
      detail: "XI-A leads with a 91.2% average score.",
      metric: "XI-A",
      tone: "positive" as const,
    },
    {
      key: "students_needing_support",
      title: "Students needing support",
      detail: "4 students need a follow-up review.",
      metric: 4,
      tone: "warning" as const,
    },
  ],
};

test("DashboardAnalytics renders insights, rankings, and support signals", () => {
  const renderer = create(<DashboardAnalytics analytics={analytics} />);
  const output = renderedText(renderer);

  for (const value of [
    "School insights",
    "Class performance ranking",
    "Student performance ranking",
    "Subject performance",
    "XI-A",
    "Kartika Sari",
    "4 students need a follow-up review.",
  ]) {
    assert.match(output, new RegExp(value));
  }
});

test("DashboardAnalytics renders no-data states for nullable scores and empty student rankings", () => {
  const renderer = create(
    <DashboardAnalytics
      analytics={{
        ...analytics,
        class_ranking: [
          {
            rank: 1,
            class_id: 9,
            class_name: "XII-A",
            student_count: 4,
            average_score: null,
            completion_rate: 0,
            average_attitude: null,
          },
        ],
        student_ranking: [],
        subject_performance: [
          {
            subject_id: 5,
            subject_name: "Sejarah",
            assignment_count: 0,
            average_score: null,
            completion_rate: 0,
          },
        ],
      }}
    />
  );

  const output = renderedText(renderer);
  assert.match(output, /No graded data/);
  assert.match(output, /No ranked students yet/);

  const trendRows = renderer.root.findAll((node) => node.props.className === "analytics-trend-row");
  assert.equal(trendRows.length, 2);

  const noDataTrendTrack = trendRows[0]!.findByProps({
    className: "analytics-trend-bar analytics-trend-bar-empty",
  });
  assert.ok(noDataTrendTrack);
  assert.equal(
    trendRows[0]!.findAll((node) => node.props.className === "analytics-trend-fill").length,
    0
  );

  const measuredTrendFill = trendRows[1]!.findByProps({ className: "analytics-trend-fill" });
  assert.ok(measuredTrendFill);
});
