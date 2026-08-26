import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import initSqlJs, { Database } from "sql.js";
import { createApp } from "./app";
import { MemorySessionStore } from "./auth/session-store";

let SQL: Awaited<ReturnType<typeof initSqlJs>>;

async function createSeededDatabase(): Promise<Database> {
  SQL ??= await initSqlJs();
  const database = new SQL.Database();
  database.run(readFileSync(resolve(import.meta.dirname, "../../../database/migration.sql"), "utf8"));
  database.run(readFileSync(resolve(import.meta.dirname, "../../../database/seed.sql"), "utf8"));
  return database;
}

async function login(app: ReturnType<typeof createApp>, username: string, password: string) {
  const response = await app.request("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  const setCookie = response.headers.get("set-cookie") ?? "";
  return { response, cookie: setCookie.split(";", 1)[0] };
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

test("seed preserves historical PAI coverage and current-period analytics fixtures", async () => {
  const database = await createSeededDatabase();
  assert.equal(
    database.exec(
      "SELECT COUNT(*) FROM subject_teacher_assignments WHERE teacher_id = 3 AND subject_id = 8 AND academic_period_id = 1"
    )[0].values[0][0],
    2
  );
  assert.deepEqual(
    database.exec(
      "SELECT MIN(id), MAX(id), COUNT(*) FROM subject_teacher_assignments WHERE academic_period_id = 2"
    )[0].values[0],
    [19, 30, 12]
  );
  assert.equal(
    database.exec("SELECT COUNT(*) FROM assignments WHERE subject_teacher_assignment_id BETWEEN 19 AND 24 AND status = 'published'")[0]
      .values[0][0],
    12
  );
  assert.equal(
    database.exec(
      "SELECT COUNT(*) FROM assignment_submissions WHERE assignment_id BETWEEN 10 AND 21 AND status = 'graded'"
    )[0].values[0][0],
    60
  );
  assert.equal(
    database.exec(
      "SELECT COUNT(*) FROM assignment_submissions WHERE assignment_id BETWEEN 10 AND 21 AND status = 'submitted'"
    )[0].values[0][0],
    0
  );
  assert.equal(
    database.exec(
      "SELECT COUNT(*) FROM assignment_submissions WHERE assignment_id BETWEEN 10 AND 21"
    )[0].values[0][0],
    60
  );
  assert.equal(
    database.exec("SELECT COUNT(*) FROM attitudes WHERE academic_period_id = 2")[0].values[0][0],
    30
  );
});

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
  assert.ok(body.analytics.subject_performance.length > 0);
  assert.ok(
    body.analytics.subject_performance.every((row: { assignment_count: number }) => row.assignment_count > 0)
  );
});

test("period-specific enrollment and rankings show a completed semester", async () => {
  const database = await createSeededDatabase();
  database.run(
    `UPDATE assignments
     SET status = 'closed'
     WHERE subject_teacher_assignment_id IN (
       SELECT id FROM subject_teacher_assignments WHERE academic_period_id = 2
     )`
  );
  const app = createApp(database, new MemorySessionStore());
  const { cookie } = await login(app, "adminbaim", "admin123");
  const current = await app.request("/api/headmaster/dashboard?academic_period_id=2", {
    headers: { Cookie: cookie },
  });
  const historical = await app.request("/api/headmaster/dashboard?academic_period_id=3", {
    headers: { Cookie: cookie },
  });
  const currentBody = await current.json();
  const historicalBody = await historical.json();

  assert.notEqual(currentBody.analytics.overview.student_count, historicalBody.analytics.overview.student_count);
  assert.ok(
    currentBody.analytics.class_ranking.every(
      (row: { average_score: number }, index: number, rows: Array<{ average_score: number }>) =>
        index === 0 || rows[index - 1].average_score >= row.average_score
    )
  );
  assert.ok(currentBody.analytics.student_ranking.every((row: { average_score: number }) => row.average_score > 0));
  assert.equal(currentBody.analytics.overview.completion_rate, 100);
  assert.equal(currentBody.analytics.class_ranking.length, 6);
  assert.ok(currentBody.analytics.subject_performance.length > 0);
  assert.equal(currentBody.analytics.student_ranking.length, 10);
});

test("headmaster classes keep current roster counts when academic_period_id is omitted", async () => {
  const database = await createSeededDatabase();
  const app = createApp(database, new MemorySessionStore());
  const { cookie } = await login(app, "adminbaim", "admin123");
  const currentRosterResponse = await app.request("/api/headmaster/classes", {
    headers: { Cookie: cookie },
  });
  const historicalResponse = await app.request("/api/headmaster/classes?academic_period_id=3", {
    headers: { Cookie: cookie },
  });
  const currentRoster = (await currentRosterResponse.json()).classes;
  const historicalRoster = (await historicalResponse.json()).classes;

  assert.equal(currentRosterResponse.status, 200);
  assert.equal(currentRoster.length, 6);
  assert.deepEqual(
    currentRoster.map((row: { student_count: number }) => row.student_count),
    [5, 5, 5, 5, 5, 5]
  );
  assert.deepEqual(
    currentRoster.map((row: { homeroom_teacher: string }) => row.homeroom_teacher),
    ["Arsito Guru", "Alfian Guru", "Arsito Guru", "Alfian Guru", "Arsito Guru", "Alfian Guru"]
  );
  assert.notDeepEqual(
    historicalRoster.map((row: { student_count: number }) => row.student_count),
    currentRoster.map((row: { student_count: number }) => row.student_count)
  );
});

test("headmaster detail routes fall back to the resolved period for invalid academic_period_id", async () => {
  const database = await createSeededDatabase();
  const app = createApp(database, new MemorySessionStore());
  const { cookie } = await login(app, "adminbaim", "admin123");

  const validClassesResponse = await app.request("/api/headmaster/classes?academic_period_id=2", {
    headers: { Cookie: cookie },
  });
  const invalidClassesResponse = await app.request("/api/headmaster/classes?academic_period_id=999999", {
    headers: { Cookie: cookie },
  });
  const validStudentsResponse = await app.request("/api/headmaster/students?academic_period_id=2", {
    headers: { Cookie: cookie },
  });
  const invalidStudentsResponse = await app.request("/api/headmaster/students?academic_period_id=999999", {
    headers: { Cookie: cookie },
  });

  assert.equal(validClassesResponse.status, 200);
  assert.equal(invalidClassesResponse.status, 200);
  assert.equal(validStudentsResponse.status, 200);
  assert.equal(invalidStudentsResponse.status, 200);
  assert.deepEqual(
    (await invalidClassesResponse.json()).classes,
    (await validClassesResponse.json()).classes
  );
  assert.deepEqual(
    (await invalidStudentsResponse.json()).students,
    (await validStudentsResponse.json()).students
  );
});

test("headmaster analytics treat no-assignment periods as neutral no-data", async () => {
  const database = await createSeededDatabase();
  const app = createApp(database, new MemorySessionStore());
  const { cookie } = await login(app, "adminbaim", "admin123");
  const response = await app.request("/api/headmaster/dashboard?academic_period_id=3", {
    headers: { Cookie: cookie },
  });
  const body = await response.json();
  const completionSignal = body.analytics.insight_signals.find(
    (signal: { key: string }) => signal.key === "completion_rate"
  );

  assert.equal(response.status, 200);
  assert.equal(body.analytics.overview.student_count, 24);
  assert.equal(body.analytics.overview.average_score, null);
  assert.equal(body.analytics.overview.average_attitude, null);
  assert.equal(body.analytics.overview.students_needing_support, 0);
  assert.equal(body.analytics.class_ranking.length, 0);
  assert.equal(body.analytics.student_ranking.length, 0);
  assert.equal(completionSignal.tone, "neutral");
  assert.equal(typeof completionSignal.metric, "string");
});

test("headmaster analytics flag no-graded students when their class has published assessments", async () => {
  const database = await createSeededDatabase();
  database.run(
    `INSERT INTO subject_teacher_assignments (teacher_id, class_id, subject_id, academic_period_id)
     VALUES (?, ?, ?, ?)`,
    [2, 1, 1, 3]
  );
  const assignmentContextId = Number(
    database.exec("SELECT MAX(id) FROM subject_teacher_assignments")[0].values[0][0]
  );
  database.run(
    `INSERT INTO assignments
       (subject_teacher_assignment_id, title, description, assignment_type, start_at, due_at, status)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      assignmentContextId,
      "Historical no-grade assessment",
      "Published without any submissions",
      "quiz",
      "2024-08-01 08:00:00",
      "2024-08-01 10:00:00",
      "published",
    ]
  );
  const assignmentId = Number(database.exec("SELECT MAX(id) FROM assignments")[0].values[0][0]);
  database.run(
    `INSERT INTO assignment_questions (assignment_id, question_text, question_type, points, question_order, answer_key)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [assignmentId, "Historical assessment", "essay", 100, 1, "Rubric"]
  );
  database.run(
    `INSERT INTO assignment_submissions (assignment_id, student_id, started_at, submitted_at, status, total_score)
     VALUES
       (?, ?, ?, ?, ?, ?),
       (?, ?, ?, ?, ?, ?),
       (?, ?, ?, ?, ?, ?),
       (?, ?, ?, ?, ?, ?)`,
    [
      assignmentId, 1, "2024-08-01 08:00:00", "2024-08-01 08:20:00", "submitted", null,
      assignmentId, 2, "2024-08-01 08:00:00", "2024-08-01 08:21:00", "submitted", null,
      assignmentId, 3, "2024-08-01 08:00:00", "2024-08-01 08:22:00", "submitted", null,
      assignmentId, 4, "2024-08-01 08:00:00", "2024-08-01 08:23:00", "submitted", null,
    ]
  );

  const app = createApp(database, new MemorySessionStore());
  const { cookie } = await login(app, "adminbaim", "admin123");
  const response = await app.request("/api/headmaster/dashboard?academic_period_id=3", {
    headers: { Cookie: cookie },
  });
  const body = await response.json();
  const completionSignal = body.analytics.insight_signals.find(
    (signal: { key: string }) => signal.key === "completion_rate"
  );

  assert.equal(response.status, 200);
  assert.equal(body.analytics.overview.students_needing_support, 4);
  assert.equal(body.analytics.student_ranking.length, 0);
  assert.equal(completionSignal.tone, "positive");
  assert.equal(completionSignal.metric, 100);
});

test("headmaster dashboard remains protected", async () => {
  const database = await createSeededDatabase();
  const app = createApp(database, new MemorySessionStore());
  const response = await app.request("/api/headmaster/dashboard");

  assert.equal(response.status, 401);
});
