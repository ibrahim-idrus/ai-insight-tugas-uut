# Headmaster Dashboard Insights Design

**Status:** Approved for implementation

**Date:** 2026-08-26

## Goal

Extend the headmaster dashboard with period-aware, SQLite-backed statistics that make school performance easier to understand now and provide a stable structured input for a future AI insight-summary model.

## Context

The existing headmaster dashboard already loads KPI values, class counts, assignments, attitude records, teacher assignments, and homeroom assignments from `/api/headmaster/dashboard`. Its period selector changes some assignment and attitude queries, but students are stored only with their current class, so historical enrollment counts and period comparisons are not possible. The dashboard also has no academic-performance ranking, period trend, completion-rate, or subject-performance view.

This feature keeps the existing dashboard route and visual language. It adds the missing historical data model, richer deterministic seed data, derived analytics, and dashboard sections without introducing a chart dependency or an AI runtime.

## Goals

- Track student enrollment by class and academic period.
- Seed four academic periods with meaningful enrollment, assignment, submission, and attitude variation.
- Return machine-readable school, period, class, student, subject, and support metrics from the existing dashboard API.
- Add class and student rankings where academic performance is the primary score.
- Show completion and attitude as supporting metrics and as separate support signals.
- Keep the selected academic period consistent across dashboard aggregates and detail views.
- Preserve the existing dashboard fields and existing role protection.
- Keep the API response suitable for future AI summaries by giving each signal a stable key, metric, tone, and source context.

## Non-goals

- No AI model, prompt, inference service, or generated summary is included in this feature.
- No production deployment, Vercel configuration, Cloudflare configuration, credential changes, or infrastructure changes are included.
- No attendance or finance analytics are added because the current schema has no source data for them.
- No new charting library is added.
- Existing teacher, student, or assignment workflows are not redesigned.

## Data model and seed data

### Student enrollment history

Add a `student_enrollments` table to `database/migration.sql`:

```sql
CREATE TABLE student_enrollments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER NOT NULL,
    class_id INTEGER NOT NULL,
    academic_period_id INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'transferred', 'completed')),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (student_id) REFERENCES students(id),
    FOREIGN KEY (class_id) REFERENCES classes(id),
    FOREIGN KEY (academic_period_id) REFERENCES academic_periods(id),
    UNIQUE (student_id, academic_period_id)
);
```

Add indexes for `student_id`, `class_id`, and `academic_period_id`. Keep `students.class_id` as the current profile class for existing student-facing behavior; dashboard history uses `student_enrollments`.

### Dummy dataset

Update `database/seed.sql` so the database contains:

- Four periods: `2024/2025` semesters 1 and 2, and `2025/2026` semesters 1 and 2.
- `2025/2026` semester 2 marked active, with the existing period IDs preserved so existing assignment and attitude foreign-key values remain valid.
- Enrollment history for the 30 seeded students across all periods, with earlier periods containing fewer enrolled students and different class distributions so the trend chart is not flat.
- Current-period teaching assignments covering the seeded classes and multiple subjects.
- At least 12 published current-period assignments across classes and subjects.
- All 60 expected current-period submission rows (12 published assignments across six five-student classes) are graded, with score quality distributed unevenly across classes so rankings and support signals still differ.
- Current-period attitude records with a mix of A, B, C, and D values, including at least one class with a lower support signal.
- Historical enrollment and assessment records sufficient for period trend values; periods without a graded score must return nullable academic metrics rather than fabricated zeros.

The tracked `database/lms.db` file will be regenerated from the migration and seed files after the SQL changes so the default local API uses the same dataset as tests.

## Metric definitions

- **Academic score:** For each graded submission, `total_score / total_question_points * 100`. Student and class averages are averages of available graded submission percentages.
- **Completion rate:** submitted or graded submissions divided by expected submissions. Expected submissions are published assignments multiplied by enrolled students in the assignment’s class and selected period.
- **Average attitude:** A = 4, B = 3, C = 2, D = 1, averaged over records in the selected period.
- **Students needing support:** Enrolled students with no graded submission, average academic score below 60, completion rate below 70%, or average attitude below 2.5. A student is counted once even if multiple conditions apply.
- **Class ranking:** Classes with at least one graded score are ordered by average academic score descending, completion rate descending, then class name ascending. Ranks are consecutive and start at 1. Classes without graded data remain in the class overview but have no performance rank.
- **Student ranking:** Students with at least one graded submission are ordered by average academic score descending, completed assignment count descending, then name ascending. The API returns the top 10 rows for the selected period.
- **Subject performance:** Published assignments are grouped by subject. Academic score uses graded submissions, while completion uses expected submissions for the subject’s assigned classes.

## API contract

Extend `GET /api/headmaster/dashboard?academic_period_id=<id>` while preserving all existing top-level fields. Add:

```ts
analytics: {
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
```

The initial signal keys are stable and deterministic: `top_class`, `completion_rate`, `enrollment_trend`, and `students_needing_support`. Signal details are generated from metrics in the API as sample copy; the UI must not treat them as AI-generated.

The API selects the requested period when it is a valid existing ID. When no period is provided, it selects the period marked `is_active`, falling back to the latest period by start date. Invalid or missing data produces safe empty arrays and nullable metric values. Headmaster authorization remains mandatory.

Update the existing student and class detail queries so `academic_period_id` uses `student_enrollments` for period-specific student membership and counts. Existing assignment, subject, and attitude detail filters remain compatible with the selected period.

## Dashboard experience

Keep the current KPI cards and existing chart/table sections. Add a new analytics section after the KPI cards:

1. **School insights:** four cards using `insight_signals` for the top class, completion, enrollment trend, and students needing support.
2. **Period trend:** a lightweight chart with period labels and text values for enrollment, average score, completion, and attitude.
3. **Class performance ranking:** a table with rank, class, student count, academic score, completion, and attitude.
4. **Student performance ranking:** a top-10 table with rank, student, class, average score, completed assignments, and attitude.
5. **Subject performance:** a chart/table comparing assignment count, average score, and completion rate.
6. **Support signals:** a compact list derived from the same metrics for classes or students with low completion, low attitude, or missing graded work.

The period selector refreshes all new and existing period-sensitive content. New charts use existing CSS and semantic HTML/SVG patterns, provide visible labels and values, and do not rely on color alone. Tables remain horizontally scrollable on narrow screens and chart grids collapse to one column.

When a metric is unavailable, render `No graded data` or an equivalent explicit empty state. Do not render a zero that could be mistaken for a measured value. Preserve the existing loading, initial-error, modal, and keyboard-accessible interaction patterns.

## Implementation boundaries

- Backend changes are limited to the enrollment schema, seed data, dashboard analytics queries/response, period-aware student/class detail queries, and API tests.
- Frontend changes are limited to dashboard types/rendering/styles and focused dashboard tests.
- The implementation may add a small API analytics helper module if it keeps metric calculations testable, but it must not introduce a new runtime dependency.
- The existing dashboard response fields must remain available to avoid breaking current rendering and detail modals.

## Verification plan

Add API tests that create the seeded database and verify:

- The enrollment table and multiple periods are present.
- The dashboard requires a headmaster session.
- The selected period changes enrollment-sensitive counts.
- Analytics returns all documented groups and stable signal keys.
- Class and student rankings follow the specified ordering.
- Students without graded submissions are excluded from performance ranking but included in support counts.
- Completion rates use expected enrolled submissions.
- Historical nullable metrics are represented safely.

Add web tests that verify:

- The new insight cards and ranking sections render from a dashboard response.
- Period selection requests the selected period.
- `No graded data` is rendered for nullable score metrics.
- Existing dashboard tests and role behavior remain unaffected.

Run the repository’s web and API test scripts, the combined workspace build, and a fresh database/API smoke check after regenerating `database/lms.db`. Before handoff, verify the feature worktree and the main worktree status separately.

