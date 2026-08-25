import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import initSqlJs, { Database } from "sql.js";
import { createApp } from "./app";
import { MemorySessionStore } from "./auth/session-store";

let SQL: Awaited<ReturnType<typeof initSqlJs>>;

export async function setupTeacherApp() {
  SQL ??= await initSqlJs();
  const database = new SQL.Database();
  database.run(readFileSync(resolve(import.meta.dirname, "../../../database/migration.sql"), "utf8"));
  database.run(readFileSync(resolve(import.meta.dirname, "../../../database/seed.sql"), "utf8"));
  database.run(`
    INSERT INTO subject_teacher_assignments
      (teacher_id, class_id, subject_id, academic_period_id)
    VALUES (2, 1, 1, 2)
  `);

  const sessions = new MemorySessionStore();
  return { app: createApp(database, sessions), database, sessions };
}

export async function login(
  app: ReturnType<typeof createApp>,
  username: string,
  password: string
) {
  const response = await app.request("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  const setCookie = response.headers.get("set-cookie") ?? "";
  return { response, cookie: setCookie.split(";", 1)[0] };
}

export function contextIdFor(
  database: Database,
  teacherId: number,
  classId: number,
  subjectId: number,
  academicPeriodId: number
) {
  const statement = database.prepare(`
    SELECT id
    FROM subject_teacher_assignments
    WHERE teacher_id = ?
      AND class_id = ?
      AND subject_id = ?
      AND academic_period_id = ?
  `);
  statement.bind([teacherId, classId, subjectId, academicPeriodId]);
  assert.equal(statement.step(), true);
  const contextId = statement.getAsObject().id;
  statement.free();
  return contextId as number;
}

test("lists only the authenticated teacher's teaching contexts", async () => {
  const { app } = await setupTeacherApp();
  const { cookie } = await login(app, "adminarsito", "admin123");

  const response = await app.request("/api/teacher/classes", {
    headers: { Cookie: cookie },
  });

  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.contexts.length, 11);
  assert.ok(body.contexts.every((context: any) => typeof context.id === "number"));
  assert.ok(body.contexts.every((context: any) => typeof context.studentCount === "number"));
  assert.ok(body.contexts.some((context: any) => context.academicPeriod.semester === 2));
  assert.equal(body.contexts.some((context: any) => context.subject.name === "Bahasa Indonesia"), false);
});

test("returns an authorized teaching context with its students and materials", async () => {
  const { app, database } = await setupTeacherApp();
  const { cookie } = await login(app, "adminarsito", "admin123");
  const contextId = contextIdFor(database, 2, 1, 1, 1);

  const response = await app.request(`/api/teacher/classes/${contextId}`, {
    headers: { Cookie: cookie },
  });

  assert.equal(response.status, 200);
  const body = await response.json();
  assert.deepEqual(body.class, { id: 1, name: "X-A", gradeLevel: 10 });
  assert.deepEqual(body.subject, { id: 1, name: "Matematika", code: "MTK" });
  assert.deepEqual(body.academicPeriod, { id: 1, schoolYear: "2025/2026", semester: 1 });
  assert.equal(body.studentCount, 5);
  assert.equal(body.materialCount, 2);
  assert.equal(body.students.length, 5);
  assert.ok(body.students.every((student: any) => Object.keys(student).sort().join(",") === "id,name,nis"));
  assert.equal(body.materials.length, 2);
});

test("does not disclose another teacher's teaching context", async () => {
  const { app, database } = await setupTeacherApp();
  const { cookie } = await login(app, "adminarsito", "admin123");
  const foreignContextId = contextIdFor(database, 3, 1, 2, 1);

  const response = await app.request(`/api/teacher/classes/${foreignContextId}`, {
    headers: { Cookie: cookie },
  });

  assert.equal(response.status, 404);
  assert.deepEqual(await response.json(), { error: "Teaching context not found" });
});
