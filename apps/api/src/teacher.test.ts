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

test("requires a teacher session to list teaching contexts", async () => {
  const { app } = await setupTeacherApp();

  const response = await app.request("/api/teacher/classes");

  assert.equal(response.status, 401);
  assert.deepEqual(await response.json(), { error: "Authentication required" });
});

test("forbids student sessions from teacher context routes", async () => {
  const { app } = await setupTeacherApp();
  const { cookie } = await login(app, "ahmad.rizki", "student123");

  const response = await app.request("/api/teacher/classes", {
    headers: { Cookie: cookie },
  });

  assert.equal(response.status, 403);
  assert.deepEqual(await response.json(), { error: "Forbidden" });
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

test("creates, reads, updates, and deletes a teacher-owned material", async () => {
  const { app, database } = await setupTeacherApp();
  const { cookie } = await login(app, "adminarsito", "admin123");
  const contextId = contextIdFor(database, 2, 1, 1, 1);

  const created = await app.request(`/api/teacher/classes/${contextId}/materials`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookie },
    body: JSON.stringify({ title: "New guide", description: "Intro", content: "Read this" }),
  });

  assert.equal(created.status, 201);
  const material = await created.json();
  assert.equal(material.title, "New guide");
  assert.equal(material.description, "Intro");
  assert.equal(material.content, "Read this");

  const found = await app.request(`/api/teacher/classes/${contextId}/materials/${material.id}`, {
    headers: { Cookie: cookie },
  });
  assert.equal(found.status, 200);
  assert.deepEqual(await found.json(), material);

  const updated = await app.request(`/api/teacher/classes/${contextId}/materials/${material.id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Cookie: cookie },
    body: JSON.stringify({
      teacher_id: 3,
      title: "Updated guide",
      description: null,
      content: "Updated",
    }),
  });
  assert.equal(updated.status, 200);
  const updatedMaterial = await updated.json();
  assert.equal(updatedMaterial.id, material.id);
  assert.equal(updatedMaterial.title, "Updated guide");
  assert.equal(updatedMaterial.description, null);
  assert.equal(updatedMaterial.content, "Updated");
  assert.equal(updatedMaterial.createdAt, material.createdAt);
  assert.equal(typeof updatedMaterial.updatedAt, "string");

  const deleted = await app.request(`/api/teacher/classes/${contextId}/materials/${material.id}`, {
    method: "DELETE",
    headers: { Cookie: cookie },
  });
  assert.equal(deleted.status, 204);

  const missing = await app.request(`/api/teacher/classes/${contextId}/materials/${material.id}`, {
    headers: { Cookie: cookie },
  });
  assert.equal(missing.status, 404);
});

test("does not allow a teacher to access another teacher's materials", async () => {
  const { app, database } = await setupTeacherApp();
  const { cookie: ownerCookie } = await login(app, "adminarsito", "admin123");
  const { cookie: foreignCookie } = await login(app, "adminalfian", "admin123");
  const foreignContextId = contextIdFor(database, 3, 1, 2, 1);

  const foreignCreated = await app.request(`/api/teacher/classes/${foreignContextId}/materials`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: foreignCookie },
    body: JSON.stringify({ title: "Foreign guide", description: "Private", content: "Do not read" }),
  });
  assert.equal(foreignCreated.status, 201);
  const foreignMaterial = await foreignCreated.json();

  const foreignCreate = await app.request(`/api/teacher/classes/${foreignContextId}/materials`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: ownerCookie },
    body: JSON.stringify({ title: "Intrusion" }),
  });
  assert.equal(foreignCreate.status, 404);

  for (const request of [
    app.request(`/api/teacher/classes/${foreignContextId}/materials/${foreignMaterial.id}`, {
      headers: { Cookie: ownerCookie },
    }),
    app.request(`/api/teacher/classes/${foreignContextId}/materials/${foreignMaterial.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Cookie: ownerCookie },
      body: JSON.stringify({ title: "Intrusion" }),
    }),
    app.request(`/api/teacher/classes/${foreignContextId}/materials/${foreignMaterial.id}`, {
      method: "DELETE",
      headers: { Cookie: ownerCookie },
    }),
  ]) {
    assert.equal((await request).status, 404);
  }

  const wrongContext = await app.request(
    `/api/teacher/classes/${contextIdFor(database, 2, 2, 1, 1)}/materials/${1}`,
    { headers: { Cookie: ownerCookie } }
  );
  assert.equal(wrongContext.status, 404);
});

test("validates material IDs and title input", async () => {
  const { app, database } = await setupTeacherApp();
  const { cookie } = await login(app, "adminarsito", "admin123");
  const contextId = contextIdFor(database, 2, 1, 1, 1);

  for (const input of [{}, { title: "   " }, { title: 123 }]) {
    const response = await app.request(`/api/teacher/classes/${contextId}/materials`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookie },
      body: JSON.stringify(input),
    });
    assert.equal(response.status, 400);
    assert.deepEqual(await response.json(), { error: "Title is required" });
  }

  for (const input of [{ title: "Guide", description: 123 }, { title: "Guide", content: 123 }]) {
    const response = await app.request(`/api/teacher/classes/${contextId}/materials`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookie },
      body: JSON.stringify(input),
    });
    assert.equal(response.status, 400);
  }

  const normalized = await app.request(`/api/teacher/classes/${contextId}/materials`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookie },
    body: JSON.stringify({ title: "Guide", description: "  ", content: "  " }),
  });
  assert.equal(normalized.status, 201);
  const normalizedMaterial = await normalized.json();
  assert.equal(normalizedMaterial.title, "Guide");
  assert.equal(normalizedMaterial.description, null);
  assert.equal(normalizedMaterial.content, null);

  const invalidContext = await app.request("/api/teacher/classes/nope/materials", {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookie },
    body: JSON.stringify({ title: "Guide" }),
  });
  assert.equal(invalidContext.status, 400);

  const invalidMaterial = await app.request(`/api/teacher/classes/${contextId}/materials/nope`, {
    headers: { Cookie: cookie },
  });
  assert.equal(invalidMaterial.status, 400);
});
