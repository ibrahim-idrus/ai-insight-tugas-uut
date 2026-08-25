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
    45
  );
  assert.equal(
    database.exec(
      "SELECT COUNT(*) FROM assignment_submissions WHERE assignment_id BETWEEN 10 AND 21 AND status = 'submitted'"
    )[0].values[0][0],
    2
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
  assert.ok(body.analytics.subject_performance.length >= 3);
});

test("period-specific enrollment and rankings are ordered and exclude ungraded students", async () => {
  const database = await createSeededDatabase();
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
  assert.equal(
    currentBody.analytics.student_ranking.some(
      (row: { student_id: number }) => row.student_id === 19 || row.student_id === 20
    ),
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
