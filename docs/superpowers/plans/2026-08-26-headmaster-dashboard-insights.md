
# Headmaster Dashboard Insights Implementation Plan

> For agentic workers: REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox ([ ]) syntax for tracking.

Goal: Add period-aware SQLite seed data, analytics API fields, rankings, trends, and insight views to the headmaster dashboard.

Data completion follow-up: The current period is now seeded as a completed semester. All 12 published assignments have graded submissions for all five enrolled students in their class (60 graded rows total); the partial/submitted-only coverage described in the original Task 1 steps below is superseded. Historical periods remain intentionally sparse so period trends and no-data handling stay meaningful.

Architecture: Keep /api/headmaster/dashboard as the single dashboard data contract. Add a normalized student_enrollments history table, gather enrollment/assignment/submission/attitude rows in an isolated analytics module, calculate deterministic metrics in memory, and render the structured response through a focused React analytics component. Existing dashboard fields and detail modals remain compatible.

Tech Stack: SQLite/sql.js, Hono, TypeScript, React 18, React Test Renderer, Node's built-in test runner, Vite, existing CSS/SVG patterns.

Spec: docs/superpowers/specs/2026-08-26-headmaster-dashboard-insights-design.md

## Global Constraints

- Preserve the existing /api/headmaster/dashboard top-level response fields and headmaster authorization.
- Use student_enrollments for period-specific student membership while keeping students.class_id for current student profile behavior.
- Academic score is total_score / total_question_points * 100 for graded submissions.
- Completion rate is submitted or graded submissions divided by expected submissions for enrolled students.
- Class ranking sorts by average academic score descending, completion rate descending, then class name ascending.
- Student ranking returns the top 10 students with graded work, ordered by average academic score, completed assignments, then name.
- Nullable score and attitude metrics render as No graded data; do not convert unavailable measurements to zero.
- Do not add a runtime dependency, AI service, deployment change, credential change, or infrastructure change.
- Run git fetch origin, git status --short --branch, git rev-list --left-right --count HEAD...origin/main, and the configured-upstream divergence check before every edit and commit.
- Work only in E:/HackathonDevFest2026/ai-insight-tugas-uut/.worktrees/headmaster-insights on codex/headmaster-insights until the user explicitly approves integration.

---

### Task 1: Add periodized enrollment history and richer seed data

Files:
- Create: apps/api/src/headmaster.test.ts
- Modify: database/migration.sql
- Modify: database/seed.sql
- Modify: apps/api/src/teacher.test.ts:12-22

Interfaces:
- Produces the student_enrollments SQLite table and four-period seeded dataset consumed by the analytics API.
- Produces a seeded fixture with 30 students, 6 classes, 8 subjects, four academic periods, 12 published current-period assignments, at least 45 graded current-period submissions, two submitted-only records, and mixed current-period attitudes.
- Keeps apps/api/src/teacher.test.ts compatible with seeded period-2 teaching assignments by making its existing fixture insert idempotent.

- [ ] Step 1: Write the failing schema/seed test

Create apps/api/src/headmaster.test.ts with a seeded database helper and this first test. It intentionally queries the table before it exists:

    import assert from "node:assert/strict";
    import { readFileSync } from "node:fs";
    import { resolve } from "node:path";
    import test from "node:test";
    import initSqlJs, { Database } from "sql.js";

    let SQL: Awaited<ReturnType<typeof initSqlJs>>;

    async function createSeededDatabase(): Promise<Database> {
      SQL ??= await initSqlJs();
      const database = new SQL.Database();
      database.run(readFileSync(resolve(import.meta.dirname, "../../../database/migration.sql"), "utf8"));
      database.run(readFileSync(resolve(import.meta.dirname, "../../../database/seed.sql"), "utf8"));
      return database;
    }

    test("seed provides four academic periods and periodized enrollment history", async () => {
      const database = await createSeededDatabase();
      assert.equal(database.exec("SELECT COUNT(*) FROM academic_periods")[0].values[0][0], 4);
      assert.equal(
        database.exec("SELECT COUNT(DISTINCT academic_period_id) FROM student_enrollments")[0].values[0][0],
        4
      );
      assert.ok(
        Number(database.exec("SELECT COUNT(*) FROM student_enrollments WHERE academic_period_id = 2")[0].values[0][0]) >= 30
      );
    });

- [ ] Step 2: Run the new test and confirm the expected failure

Run from apps/api:

    node --import tsx --test src/headmaster.test.ts

Expected result: FAIL with a SQLite error that student_enrollments does not exist.

- [ ] Step 3: Add the enrollment table and indexes

Insert this table after academic_periods in database/migration.sql and before subject_teacher_assignments:

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

    CREATE INDEX idx_student_enrollments_student_id ON student_enrollments(student_id);
    CREATE INDEX idx_student_enrollments_class_id ON student_enrollments(class_id);
    CREATE INDEX idx_student_enrollments_period_id ON student_enrollments(academic_period_id);

- [ ] Step 4: Add the four-period enrollment seed

Keep the existing 2025/2026 period rows as IDs 1 and 2, set semester 1 to is_active = 0, set semester 2 to is_active = 1, and append the historical rows as IDs 3 and 4:

    INSERT INTO academic_periods (school_year, semester, start_date, end_date, is_active) VALUES
    ('2024/2025', 1, '2024-07-15', '2024-12-20', 0),
    ('2024/2025', 2, '2025-01-06', '2025-06-14', 0);

    INSERT INTO student_enrollments (student_id, class_id, academic_period_id)
    SELECT id, class_id, 1 FROM students;

    INSERT INTO student_enrollments (student_id, class_id, academic_period_id)
    SELECT id, class_id, 2 FROM students;

    INSERT INTO student_enrollments (student_id, class_id, academic_period_id)
    SELECT id,
           CASE
             WHEN id BETWEEN 1 AND 4 THEN 1
             WHEN id BETWEEN 5 AND 8 THEN 2
             WHEN id BETWEEN 9 AND 12 THEN 3
             WHEN id BETWEEN 13 AND 16 THEN 4
             WHEN id BETWEEN 17 AND 20 THEN 5
             ELSE 6
           END,
           3
    FROM students
    WHERE id <= 24;

    INSERT INTO student_enrollments (student_id, class_id, academic_period_id)
    SELECT id,
           CASE
             WHEN id BETWEEN 1 AND 5 THEN 1
             WHEN id BETWEEN 6 AND 9 THEN 2
             WHEN id BETWEEN 10 AND 14 THEN 3
             WHEN id BETWEEN 15 AND 18 THEN 4
             WHEN id BETWEEN 19 AND 23 THEN 5
             ELSE 6
           END,
           4
    FROM students
    WHERE id <= 27;

The period 1 and 2 rows preserve the existing five-students-per-class distribution; periods 3 and 4 intentionally contain 24 and 27 active enrollments with different class distributions.

- [ ] Step 5: Add current-period teaching, assignment, submission, and attitude data

Append period-2 teaching assignments with IDs 19–30 using this mapping: teacher 2 teaches Matematika for classes 1–6 (IDs 19–24); teacher 3 teaches Bahasa Indonesia for classes 1–4 (IDs 25–28); teacher 3 teaches Bahasa Inggris for classes 5–6 (IDs 29–30). Add six period-2 homeroom rows matching the existing class/teacher pattern.

Add 12 published assignments after the existing assignment rows, two per class: IDs 10–11 for class 1, 12–13 for class 2, 14–15 for class 3, 16–17 for class 4, 18–19 for class 5, and 20–21 for class 6. Give every new assignment one 100-point question so percentage scores are deterministic.

Seed submissions with this exact coverage:

    Assignment IDs | Class | Graded students | Submitted-only students
    10, 11         | 1     | all 5 for 10; students 1–3 for 11 | none
    12, 13         | 2     | all 5 for 12; students 6–8 for 13 | none
    14, 15         | 3     | all 5 for 14; students 11–13 for 15 | none
    16, 17         | 4     | students 16–18 for 16; students 16–17 for 17 | students 19–20 for 16
    18, 19         | 5     | all 5 for 18; students 21–23 for 19 | none
    20, 21         | 6     | all 5 for 20; students 26–28 for 21 | none

Use INSERT ... SELECT from students with a CASE expression for deterministic scores, rather than duplicating 45 nearly identical value rows. Use status = 'graded' and non-null scores for graded rows; use status = 'submitted' and total_score = NULL for students 19 and 20 on assignment 16.

Append 30 period-2 attitude rows from the current students. Use score A for students 1,3,6,8,11,12,14,17,21,22,24,26,29; B for 2,4,7,9,13,16,18,23,27,30; C for 5,10,15,19,25,28; and D for student 20. Use teacher 2 for classes 1, 3, and 5 and teacher 3 for classes 2, 4, and 6.

- [ ] Step 6: Keep the teacher test fixture idempotent

In apps/api/src/teacher.test.ts, change the existing period-2 setup insert to:

    INSERT OR IGNORE INTO subject_teacher_assignments
      (teacher_id, class_id, subject_id, academic_period_id)
    VALUES (2, 1, 1, 2)

This preserves the test’s period-2 context whether the seed already contains the row or the fixture is run against a smaller test seed.

- [ ] Step 7: Run the schema/seed test and the existing API tests

Run:

    node --import tsx --test src/headmaster.test.ts
    npm test

Expected result: the new test passes, existing API tests pass, and the existing seed assertions still report one headmaster, two teachers, and 30 students.

- [ ] Step 8: Commit the data-model task

    git add database/migration.sql database/seed.sql apps/api/src/headmaster.test.ts apps/api/src/teacher.test.ts
    git commit -m "feat: add periodized headmaster sample data"

---

### Task 2: Add deterministic headmaster analytics to the API

Files:
- Create: apps/api/src/headmaster/analytics.ts
- Modify: apps/api/src/headmaster.test.ts
- Modify: apps/api/src/app.ts:140-535
- Modify: apps/api/package.json:8

Interfaces:
- Consumes Database, selected period ID, all academic periods, and rows from enrollment, assignment, submission, and attitude tables.
- Produces HeadmasterAnalytics with overview, period_trend, class_ranking, student_ranking, subject_performance, and insight_signals matching the approved spec.
- Produces period-aware legacy dashboard fields and student/class detail responses.

- [ ] Step 1: Add failing endpoint contract tests

Extend apps/api/src/headmaster.test.ts with MemorySessionStore, createApp, and a login helper matching apps/api/src/auth.test.ts. Add these tests before implementing analytics:

    test("headmaster dashboard returns the approved analytics contract", async () => {
      const database = await createSeededDatabase();
      const app = createApp(database, new MemorySessionStore());
      const { cookie } = await login(app, "adminbaim", "admin123");
      const response = await app.request("/api/headmaster/dashboard?academic_period_id=2", {
        headers: { Cookie: cookie },
      });
      const body = await response.json();

      assert.equal(response.status, 200);
      assert.equal(body.active_period_id, 2);
      assert.equal(body.analytics.period_trend.length, 4);
      assert.equal(body.analytics.student_ranking.length, 10);
      assert.deepEqual(
        body.analytics.insight_signals.map((signal: { key: string }) => signal.key),
        ["top_class", "completion_rate", "enrollment_trend", "students_needing_support"]
      );
      assert.ok(body.analytics.subject_performance.length >= 3);
    });

    test("period-specific enrollment and rankings are ordered and exclude ungraded students", async () => {
      const database = await createSeededDatabase();
      const app = createApp(database, new MemorySessionStore());
      const { cookie } = await login(app, "adminbaim", "admin123");
      const current = await app.request("/api/headmaster/dashboard?academic_period_id=2", { headers: { Cookie: cookie } });
      const historical = await app.request("/api/headmaster/dashboard?academic_period_id=3", { headers: { Cookie: cookie } });
      const currentBody = await current.json();
      const historicalBody = await historical.json();

      assert.notEqual(currentBody.analytics.overview.student_count, historicalBody.analytics.overview.student_count);
      assert.ok(currentBody.analytics.class_ranking.every(
        (row: { average_score: number }, index: number, rows: Array<{ average_score: number }>) =>
          index === 0 || rows[index - 1].average_score >= row.average_score
      ));
      assert.ok(currentBody.analytics.student_ranking.every((row: { average_score: number }) => row.average_score > 0));
      assert.equal(
        currentBody.analytics.student_ranking.some((row: { student_id: number }) => row.student_id === 19 || row.student_id === 20),
        false
      );
      assert.ok(currentBody.analytics.overview.completion_rate < 100);
    });

    test("headmaster dashboard remains protected", async () => {
      const database = await createSeededDatabase();
      const app = createApp(database, new MemorySessionStore());
      const response = await app.request("/api/headmaster/dashboard");
      assert.equal(response.status, 401);
    });

- [ ] Step 2: Run the endpoint tests and confirm the expected failure

Run:

    node --import tsx --test src/headmaster.test.ts

Expected result: the schema test passes, while endpoint tests fail because body.analytics is not present and the legacy dashboard still counts students without period enrollment.

- [ ] Step 3: Create the analytics module with explicit types and row queries

Create apps/api/src/headmaster/analytics.ts with these exported interfaces and signature:

    import { Database } from "sql.js";

    export interface AcademicPeriodRow {
      id: number;
      school_year: string;
      semester: number;
      start_date: string;
      end_date: string;
    }

    export interface HeadmasterAnalytics {
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

    export function getHeadmasterAnalytics(
      database: Database,
      selectedPeriodId: number,
      academicPeriods: AcademicPeriodRow[]
    ): HeadmasterAnalytics;

Query these row sets once per request:

    SELECT se.academic_period_id, se.student_id, se.class_id, c.name AS class_name
    FROM student_enrollments se
    JOIN classes c ON c.id = se.class_id
    WHERE se.status = 'active';

    SELECT a.id AS assignment_id, sta.academic_period_id, sta.class_id, c.name AS class_name,
           sta.subject_id, sub.name AS subject_name, a.status,
           COALESCE((SELECT SUM(points) FROM assignment_questions aq WHERE aq.assignment_id = a.id), 0) AS total_points
    FROM assignments a
    JOIN subject_teacher_assignments sta ON sta.id = a.subject_teacher_assignment_id
    JOIN classes c ON c.id = sta.class_id
    JOIN subjects sub ON sub.id = sta.subject_id;

    SELECT assignment_id, student_id, status, total_score FROM assignment_submissions;

    SELECT academic_period_id, student_id, class_id, score FROM attitudes;

Build maps keyed by period/class/student/subject. For each period, calculate expected submissions from active enrollments multiplied by published assignments for the enrollment class, count submissions with status submitted or graded, and calculate graded percentages only when total_points is greater than zero. Compute support conditions once per student and add each matching student once. Reuse the same period calculator for the selected-period overview, all period trend rows, class ranking, student ranking, and subject performance.

- [ ] Step 4: Integrate analytics and active-period selection into app.ts

Import getHeadmasterAnalytics and AcademicPeriodRow. Change the academicPeriods query to read id, school_year, semester, start_date, end_date, and is_active; use is_active for resolution and omit that internal flag from the public academic_periods response. Resolve the selected period in this order:

1. Parse academic_period_id only when supplied as a positive integer.
2. Use that ID when it exists in academic_periods.
3. Otherwise choose is_active = 1 ordered by start date descending.
4. If no active period exists, choose the latest start date.

Use the resolved period ID for all period-sensitive legacy queries. Change kpiStudents and students_per_class to count active student_enrollments, and rewrite class_overview so student and attitude aggregates cannot multiply each other through a join. Keep teacher, subject, assignment, attitude, and homeroom fields in the response.

Add this field to the response:

    analytics: getHeadmasterAnalytics(
      database,
      activePeriodId ?? 0,
      toRows(academicPeriods) as AcademicPeriodRow[]
    ),

Return empty analytics arrays and nullable scores when no period is available. Update /api/headmaster/students to join active enrollments when academic_period_id is supplied, and update /api/headmaster/classes to count enrollments for the requested period. Make /api/headmaster/assignments-by-type-per-class default to the resolved active period when no query parameter is supplied.

- [ ] Step 5: Include the new API test file in the package script

Change apps/api/package.json to:

    "test": "node --import tsx --test src/auth.test.ts src/teacher.test.ts src/headmaster.test.ts"

- [ ] Step 6: Run the API red/green cycle and existing tests

Run:

    node --import tsx --test src/headmaster.test.ts
    npm test
    npm run build

Expected result: all headmaster contract tests, existing authentication tests, teacher tests, and the API TypeScript build pass with zero failures.

- [ ] Step 7: Commit the API task

    git add apps/api/src/headmaster/analytics.ts apps/api/src/headmaster.test.ts apps/api/src/app.ts apps/api/package.json
    git commit -m "feat: expose headmaster dashboard analytics"

---

### Task 3: Render analytics, rankings, and support signals in the web dashboard

Files:
- Create: apps/web/src/headmaster/DashboardAnalytics.tsx
- Create: apps/web/src/headmaster/DashboardAnalytics.test.tsx
- Modify: apps/web/src/headmaster/Dashboard.tsx:1-500,697-770
- Modify: apps/web/src/styles.css in the Headmaster Dashboard section
- Modify: apps/web/package.json:8

Interfaces:
- Consumes the API analytics object through a typed DashboardAnalytics prop.
- Produces semantic insight cards, period trend metrics, class ranking, top-10 student ranking, subject performance, and support signal output.
- Keeps the existing dashboard fetch, period selector, KPI cards, charts, tables, and detail modals working.

- [ ] Step 1: Write the failing presentational tests

Create apps/web/src/headmaster/DashboardAnalytics.test.tsx with a fixture containing one positive insight, one warning insight, two periods, two class rows, two student rows, and two subject rows. Render with react-test-renderer and assert that output contains School insights, Class performance ranking, Student performance ranking, Subject performance, the top class name, the top student name, and the warning detail. Add a second test with nullable scores and empty rankings that asserts No graded data and No ranked students yet are visible.

Use this fixture shape:

    const analytics = {
      overview: {
        student_count: 30,
        average_score: 82.4,
        completion_rate: 78.3,
        average_attitude: 3.1,
        students_needing_support: 4,
      },
      period_trend: [
        { period_id: 3, label: "2024/2025 · Semester 1", student_count: 24, average_score: null, completion_rate: 0, average_attitude: null },
        { period_id: 2, label: "2025/2026 · Semester 2", student_count: 30, average_score: 82.4, completion_rate: 78.3, average_attitude: 3.1 },
      ],
      class_ranking: [
        { rank: 1, class_id: 3, class_name: "XI-A", student_count: 5, average_score: 91.2, completion_rate: 94, average_attitude: 3.8 },
        { rank: 2, class_id: 1, class_name: "X-A", student_count: 5, average_score: 80.1, completion_rate: 72, average_attitude: 3.2 },
      ],
      student_ranking: [
        { rank: 1, student_id: 11, student_name: "Kartika Sari", class_name: "XI-A", average_score: 96, completed_assignments: 4, average_attitude: 4 },
        { rank: 2, student_id: 1, student_name: "Ahmad Rizki Pratama", class_name: "X-A", average_score: 88, completed_assignments: 3, average_attitude: 3 },
      ],
      subject_performance: [
        { subject_id: 1, subject_name: "Matematika", assignment_count: 6, average_score: 84.5, completion_rate: 81 },
        { subject_id: 2, subject_name: "Bahasa Indonesia", assignment_count: 4, average_score: null, completion_rate: 0 },
      ],
      insight_signals: [
        { key: "top_class", title: "Top-performing class", detail: "XI-A leads with a 91.2% average score.", metric: "XI-A", tone: "positive" },
        { key: "students_needing_support", title: "Students needing support", detail: "4 students need a follow-up review.", metric: 4, tone: "warning" },
      ],
    };

- [ ] Step 2: Run the focused web test and confirm the expected failure

Run from apps/web:

    node --import tsx --test src/headmaster/DashboardAnalytics.test.tsx

Expected result: FAIL because DashboardAnalytics.tsx does not exist.

- [ ] Step 3: Implement the focused analytics component

Create DashboardAnalytics.tsx with exported DashboardAnalytics and DashboardAnalyticsProps types. Render these semantic sections:

    export function DashboardAnalytics({ analytics }: { analytics: DashboardAnalytics }) {
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

Keep each child presentational and use visible values beside bars. Format scores with one decimal place and attitude values with / 4.0. Render No graded data for null score/attitude values and No ranked students yet for an empty student ranking.

- [ ] Step 4: Wire the component into Dashboard.tsx

Move the approved analytics interfaces into DashboardAnalytics.tsx, import the type and component into Dashboard.tsx, add analytics: DashboardAnalytics to DashboardData, and render this after the KPI grid and before the existing chart grid:

    <DashboardAnalytics analytics={data.analytics} />

Keep the existing KpiCard, assignment-type chart, detail modal, and legacy dashboard fields unchanged apart from using the new period-aware response.

Update StudentsDetail so its fetch includes the selected period:

    const params = periodId ? "?academic_period_id=" + periodId : "";
    fetch(apiUrl("/api/headmaster/students" + params), { credentials: "include" });

- [ ] Step 5: Add scoped dashboard styles

Add styles to the existing Headmaster Dashboard section in apps/web/src/styles.css for dashboard-analytics, insight-signal-grid, insight-signal-card, analytics-grid, analytics-trend, ranking-table, support-signal-list, and responsive states. Use existing variables and card/table conventions. Add visible tone labels or text so positive/warning colors are not the only distinction.

- [ ] Step 6: Include the focused web test and run the green cycle

Change apps/web/package.json to:

    "test": "node --import tsx --test src/auth/routing.test.ts src/auth/AuthContext.test.tsx src/teacher/teacher.test.tsx src/headmaster/DashboardAnalytics.test.tsx"

Run:

    node --import tsx --test src/headmaster/DashboardAnalytics.test.tsx
    npm test
    npm run build

Expected result: focused analytics tests pass, all existing web tests pass, and the web build succeeds with no TypeScript errors.

- [ ] Step 7: Commit the frontend task

    git add apps/web/src/headmaster/DashboardAnalytics.tsx apps/web/src/headmaster/DashboardAnalytics.test.tsx apps/web/src/headmaster/Dashboard.tsx apps/web/src/styles.css apps/web/package.json
    git commit -m "feat: show headmaster dashboard insights"

---

### Task 4: Regenerate the local database artifact and perform full verification

Files:
- Modify: database/lms.db by regenerating it from database/migration.sql and database/seed.sql

Interfaces:
- Produces a tracked local SQLite database with the same schema and dummy data used by API tests.
- Produces fresh verification evidence for API tests, web tests, both builds, database counts, and worktree status.

- [ ] Step 1: Synchronize and verify the feature branch before generating the database

Run:

    git fetch origin
    git status --short --branch
    git rev-list --left-right --count HEAD...origin/main
    $upstream = git rev-parse --abbrev-ref --symbolic-full-name '@{upstream}' 2>$null
    if ($LASTEXITCODE -eq 0 -and $upstream) { git rev-list --left-right --count HEAD...$upstream }

Expected result: the feature branch is clean and ahead of the already reconciled origin/main only by its feature commits.

- [ ] Step 2: Regenerate database/lms.db using sql.js

Run from the worktree root:

    node --input-type=module -e "import initSqlJs from 'sql.js'; import { readFileSync, writeFileSync } from 'node:fs'; import { resolve } from 'node:path'; const SQL = await initSqlJs({ locateFile: (file) => resolve('node_modules/sql.js/dist', file) }); const database = new SQL.Database(); database.run(readFileSync('database/migration.sql', 'utf8')); database.run(readFileSync('database/seed.sql', 'utf8')); writeFileSync('database/lms.db', Buffer.from(database.export()));"

- [ ] Step 3: Verify the generated database inputs

Run:

    node --input-type=module -e 'import initSqlJs from "sql.js"; import { readFileSync } from "node:fs"; const SQL = await initSqlJs({ locateFile: (file) => "node_modules/sql.js/dist/" + file }); const database = new SQL.Database(new Uint8Array(readFileSync("database/lms.db"))); for (const query of ["SELECT COUNT(*) AS periods FROM academic_periods", "SELECT COUNT(*) AS enrollments FROM student_enrollments", "SELECT COUNT(*) AS published FROM assignments WHERE status = ''published''", "SELECT COUNT(*) AS graded FROM assignment_submissions WHERE status = ''graded''"]) console.log(database.exec(query)[0].values[0][0]);'

Expected result: 4 periods, at least 111 enrollments, at least 12 published current-period assignments plus original published assignments, and at least 45 graded submissions.

- [ ] Step 4: Run full repository verification

Run from the worktree root:

    npm test -w apps/api
    npm test -w apps/web
    npm run build

Expected result: all API and web tests pass and both builds exit successfully. Existing React Router warnings may remain, but there must be zero test failures and zero build errors.

- [ ] Step 5: Review final diff and status

Run:

    git diff --stat origin/main...HEAD
    git status --short --branch
    git worktree list

Confirm the diff contains only approved dashboard schema, seed, API, web, test, database, spec, and plan files. Confirm the feature worktree is clean after committing, and do not merge or remove the worktree until the user explicitly approves integration.

- [ ] Step 6: Commit the generated database artifact

    git add database/lms.db
    git commit -m "chore: refresh headmaster dashboard database"

- [ ] Step 7: Request a code review before handoff

After the final commit, collect base and head SHAs:

    $base = git merge-base HEAD origin/main
    $head = git rev-parse HEAD
    Write-Output "BASE=$base"
    Write-Output "HEAD=$head"

Dispatch a reviewer with this context: the feature adds periodized enrollment history, four-period seeded data, deterministic headmaster analytics, class/student rankings, trend/subject/support views, period-aware detail queries, and tests. Require review against docs/superpowers/specs/2026-08-26-headmaster-dashboard-insights-design.md, comparing base to head. Fix Critical and Important findings, rerun the full verification commands, and report any Minor findings without hiding them.
