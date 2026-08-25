import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import initSqlJs, { Database } from "sql.js";
import { createApp } from "./app";
import { MemorySessionStore } from "./auth/session-store";
import { closeExpiredAssignments, isAssignmentOpenForSubmission } from "./teacher/assignment-repository";

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

function assignmentIdFor(database: Database, contextId: number, title?: string): number {
  const statement = database.prepare(`
    SELECT id
    FROM assignments
    WHERE subject_teacher_assignment_id = ?
      ${title ? "AND title = ?" : ""}
    ORDER BY id
    LIMIT 1
  `);
  statement.bind(title ? [contextId, title] : [contextId]);
  assert.equal(statement.step(), true);
  const assignmentId = statement.getAsObject().id;
  statement.free();
  return assignmentId as number;
}

test("lists only the authenticated teacher's assignments with safe context details", async () => {
  const { app } = await setupTeacherApp();
  const { cookie } = await login(app, "adminarsito", "admin123");

  const response = await app.request("/api/teacher/assignments", { headers: { Cookie: cookie } });

  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.assignments.length, 5);
  assert.ok(body.assignments.every((assignment: any) => typeof assignment.id === "number"));
  assert.ok(body.assignments.every((assignment: any) => ["quiz", "task", "upload"].includes(assignment.assignmentType)));
  assert.ok(body.assignments.every((assignment: any) => ["draft", "published", "closed"].includes(assignment.status)));
  assert.equal(body.assignments.some((assignment: any) => assignment.title === "Tugas Menulis Esai"), false);
  assert.deepEqual(body.assignments[0].context, {
    id: 1,
    class: { id: 1, name: "X-A", gradeLevel: 10 },
    subject: { id: 1, name: "Matematika", code: "MTK" },
    academicPeriod: { id: 1, schoolYear: "2025/2026", semester: 1 },
  });
});

test("requires a teacher session for assignment routes and forbids students", async () => {
  const { app } = await setupTeacherApp();

  const anonymous = await app.request("/api/teacher/assignments");
  assert.equal(anonymous.status, 401);

  const { cookie } = await login(app, "ahmad.rizki", "student123");
  const student = await app.request("/api/teacher/assignments", { headers: { Cookie: cookie } });
  assert.equal(student.status, 403);
});

test("reads an owned assignment and hides foreign assignments", async () => {
  const { app, database } = await setupTeacherApp();
  const { cookie } = await login(app, "adminarsito", "admin123");
  const ownAssignmentId = assignmentIdFor(database, contextIdFor(database, 2, 1, 1, 1), "Quiz Aljabar Dasar");
  const foreignAssignmentId = assignmentIdFor(database, contextIdFor(database, 3, 1, 2, 1), "Tugas Menulis Esai");

  const own = await app.request(`/api/teacher/assignments/${ownAssignmentId}`, { headers: { Cookie: cookie } });
  assert.equal(own.status, 200);
  const body = await own.json();
  assert.equal(body.title, "Quiz Aljabar Dasar");
  assert.equal(body.assignmentType, "quiz");
  assert.equal(body.status, "closed");
  assert.equal(body.context.id, 1);

  const foreign = await app.request(`/api/teacher/assignments/${foreignAssignmentId}`, { headers: { Cookie: cookie } });
  assert.equal(foreign.status, 404);
  assert.deepEqual(await foreign.json(), { error: "Assignment not found" });
});

test("closes expired assignments and blocks submission before and after the schedule", async () => {
  const { app, database } = await setupTeacherApp();
  const { cookie } = await login(app, "adminarsito", "admin123");
  const ownContextId = contextIdFor(database, 2, 1, 1, 1);
  const expiredAssignmentId = assignmentIdFor(database, ownContextId, "Quiz Aljabar Dasar");

  assert.equal(isAssignmentOpenForSubmission(database, expiredAssignmentId, new Date("2026-08-25T12:00:00.000Z")), false);
  const expired = await app.request(`/api/teacher/assignments/${expiredAssignmentId}`, { headers: { Cookie: cookie } });
  assert.equal(expired.status, 200);
  assert.equal((await expired.json()).status, "closed");
  assert.throws(
    () => database.run(`
      INSERT INTO assignment_submissions (assignment_id, student_id, status)
      VALUES (?, 11, 'submitted')
    `, [expiredAssignmentId]),
    /Assignment is not open for submissions/
  );

  const overdueDraftResponse = await app.request("/api/teacher/assignments", {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookie },
    body: JSON.stringify({
      subjectTeacherAssignmentId: ownContextId,
      title: "Overdue draft",
      assignmentType: "task",
      dueAt: "2020-08-25T16:00:00+00:00",
    }),
  });
  assert.equal(overdueDraftResponse.status, 201);
  const overdueDraft = await overdueDraftResponse.json();
  assert.equal(overdueDraft.status, "draft");
  const overdueDraftView = await app.request(`/api/teacher/assignments/${overdueDraft.id}`, { headers: { Cookie: cookie } });
  assert.equal((await overdueDraftView.json()).status, "draft");
  const overduePublishedResponse = await app.request("/api/teacher/assignments", {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookie },
    body: JSON.stringify({
      subjectTeacherAssignmentId: ownContextId,
      title: "Overdue publish",
      assignmentType: "task",
      dueAt: "2020-08-25T16:00:00+00:00",
    }),
  });
  const overduePublished = await overduePublishedResponse.json();
  const overduePublish = await app.request(`/api/teacher/assignments/${overduePublished.id}/publish`, {
    method: "POST",
    headers: { Cookie: cookie },
  });
  assert.equal(overduePublish.status, 200);
  assert.equal((await overduePublish.json()).status, "closed");

  const future = await app.request("/api/teacher/assignments", {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookie },
    body: JSON.stringify({
      subjectTeacherAssignmentId: ownContextId,
      title: "Scheduled task",
      assignmentType: "task",
      startAt: "2030-08-25T14:00:00+00:00",
      dueAt: "2030-08-25T16:00:00+00:00",
    }),
  });
  assert.equal(future.status, 201);
  const futureAssignment = await future.json();
  const published = await app.request(`/api/teacher/assignments/${futureAssignment.id}/publish`, {
    method: "POST",
    headers: { Cookie: cookie },
  });
  assert.equal(published.status, 200);

  assert.equal(isAssignmentOpenForSubmission(database, futureAssignment.id, new Date("2030-08-25T13:59:00.000Z")), false);
  assert.equal(isAssignmentOpenForSubmission(database, futureAssignment.id, new Date("2030-08-25T15:00:00.000Z")), true);
  assert.equal(isAssignmentOpenForSubmission(database, futureAssignment.id, new Date("2030-08-25T16:00:00.000Z")), false);
  assert.equal(closeExpiredAssignments(database, new Date("2030-08-25T16:00:00.000Z")), 1);
  const closed = await app.request(`/api/teacher/assignments/${futureAssignment.id}`, { headers: { Cookie: cookie } });
  assert.equal((await closed.json()).status, "closed");

  const inProgressResponse = await app.request("/api/teacher/assignments", {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookie },
    body: JSON.stringify({
      subjectTeacherAssignmentId: ownContextId,
      title: "In-progress task",
      assignmentType: "task",
      startAt: "2020-08-25T08:00:00+00:00",
      dueAt: "2030-08-25T16:00:00+00:00",
    }),
  });
  const inProgressAssignment = await inProgressResponse.json();
  await app.request(`/api/teacher/assignments/${inProgressAssignment.id}/publish`, {
    method: "POST",
    headers: { Cookie: cookie },
  });
  database.run(`
    INSERT INTO assignment_submissions (assignment_id, student_id, status)
    VALUES (?, 11, 'in_progress')
  `, [inProgressAssignment.id]);
  assert.equal(closeExpiredAssignments(database, new Date("2030-08-25T16:00:00.000Z")), 1);
  assert.throws(
    () => database.run(`
      UPDATE assignment_submissions
      SET status = 'submitted', submitted_at = '2030-08-25T16:00:01+00:00'
      WHERE assignment_id = ? AND student_id = 11
    `, [inProgressAssignment.id]),
    /Assignment is not open for submissions/
  );
});

test("creates, updates, publishes, closes, and deletes an owned assignment", async () => {
  const { app, database } = await setupTeacherApp();
  const { cookie } = await login(app, "adminarsito", "admin123");
  const contextId = contextIdFor(database, 2, 1, 1, 1);

  const created = await app.request("/api/teacher/assignments", {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookie },
    body: JSON.stringify({
      teacher_id: 3,
      subjectTeacherAssignmentId: contextId,
      title: "  New assignment  ",
      description: "  Read the chapter  ",
      assignmentType: "task",
      startAt: "2026-08-25T08:00",
      dueAt: "2026-09-01T23:59",
    }),
  });
  assert.equal(created.status, 201);
  const assignment = await created.json();
  assert.equal(assignment.title, "New assignment");
  assert.equal(assignment.description, "Read the chapter");
  assert.equal(assignment.assignmentType, "task");
  assert.equal(assignment.status, "draft");
  assert.equal(assignment.context.id, contextId);

  const updated = await app.request(`/api/teacher/assignments/${assignment.id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Cookie: cookie },
    body: JSON.stringify({ teacher_id: 3, title: "Updated assignment", description: null, assignmentType: "upload", startAt: null, dueAt: null }),
  });
  assert.equal(updated.status, 200);
  const updatedAssignment = await updated.json();
  assert.equal(updatedAssignment.title, "Updated assignment");
  assert.equal(updatedAssignment.assignmentType, "upload");
  assert.equal(updatedAssignment.status, "draft");

  const published = await app.request(`/api/teacher/assignments/${assignment.id}/publish`, {
    method: "POST",
    headers: { Cookie: cookie },
  });
  assert.equal(published.status, 200);
  assert.equal((await published.json()).status, "published");

  const closed = await app.request(`/api/teacher/assignments/${assignment.id}/close`, {
    method: "POST",
    headers: { Cookie: cookie },
  });
  assert.equal(closed.status, 200);
  assert.equal((await closed.json()).status, "closed");

  const deleted = await app.request(`/api/teacher/assignments/${assignment.id}`, {
    method: "DELETE",
    headers: { Cookie: cookie },
  });
  assert.equal(deleted.status, 204);

  const missing = await app.request(`/api/teacher/assignments/${assignment.id}`, { headers: { Cookie: cookie } });
  assert.equal(missing.status, 404);
});

test("validates assignment input, context ownership, IDs, and transitions", async () => {
  const { app, database } = await setupTeacherApp();
  const { cookie } = await login(app, "adminarsito", "admin123");
  const ownContextId = contextIdFor(database, 2, 1, 1, 1);
  const foreignContextId = contextIdFor(database, 3, 1, 2, 1);

  for (const input of [
    {},
    { subjectTeacherAssignmentId: ownContextId, title: "  ", assignmentType: "task" },
    { subjectTeacherAssignmentId: ownContextId, title: "Task", assignmentType: "essay" },
    { subjectTeacherAssignmentId: ownContextId, title: "Task", assignmentType: "task", startAt: 123 },
    { subjectTeacherAssignmentId: ownContextId, title: "Task", assignmentType: "task", startAt: "not-a-date" },
  ]) {
    const response = await app.request("/api/teacher/assignments", {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookie },
      body: JSON.stringify(input),
    });
    assert.equal(response.status, 400);
  }

  const foreignContext = await app.request("/api/teacher/assignments", {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookie },
    body: JSON.stringify({ subjectTeacherAssignmentId: foreignContextId, title: "Intrusion", assignmentType: "task" }),
  });
  assert.equal(foreignContext.status, 404);

  for (const path of ["nope", "0", "-1", "1e0"]) {
    const response = await app.request(`/api/teacher/assignments/${path}`, { headers: { Cookie: cookie } });
    assert.equal(response.status, 400);
  }

  const draft = await app.request("/api/teacher/assignments", {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookie },
    body: JSON.stringify({ subjectTeacherAssignmentId: ownContextId, title: "Transition task", assignmentType: "task" }),
  });
  const draftAssignment = await draft.json();
  const closedBeforePublish = await app.request(`/api/teacher/assignments/${draftAssignment.id}/close`, {
    method: "POST",
    headers: { Cookie: cookie },
  });
  assert.equal(closedBeforePublish.status, 409);

  await app.request(`/api/teacher/assignments/${draftAssignment.id}/publish`, { method: "POST", headers: { Cookie: cookie } });
  const publishedAgain = await app.request(`/api/teacher/assignments/${draftAssignment.id}/publish`, {
    method: "POST",
    headers: { Cookie: cookie },
  });
  assert.equal(publishedAgain.status, 409);
});

test("does not allow a teacher to mutate another teacher's assignment", async () => {
  const { app, database } = await setupTeacherApp();
  const { cookie } = await login(app, "adminarsito", "admin123");
  const foreignAssignmentId = assignmentIdFor(database, contextIdFor(database, 3, 1, 2, 1), "Tugas Menulis Esai");

  for (const request of [
    app.request(`/api/teacher/assignments/${foreignAssignmentId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Cookie: cookie },
      body: JSON.stringify({ title: "Intrusion", assignmentType: "task" }),
    }),
    app.request(`/api/teacher/assignments/${foreignAssignmentId}`, { method: "DELETE", headers: { Cookie: cookie } }),
    app.request(`/api/teacher/assignments/${foreignAssignmentId}/publish`, { method: "POST", headers: { Cookie: cookie } }),
    app.request(`/api/teacher/assignments/${foreignAssignmentId}/close`, { method: "POST", headers: { Cookie: cookie } }),
  ]) {
    assert.equal((await request).status, 404);
  }
});

test("reports a safe mutation failure when an assignment has dependent submissions", async () => {
  const { app, database } = await setupTeacherApp();
  const { cookie } = await login(app, "adminarsito", "admin123");
  const assignmentId = assignmentIdFor(database, contextIdFor(database, 2, 1, 1, 1), "Quiz Aljabar Dasar");

  const response = await app.request(`/api/teacher/assignments/${assignmentId}`, {
    method: "DELETE",
    headers: { Cookie: cookie },
  });

  assert.equal(response.status, 409);
  assert.deepEqual(await response.json(), { error: "Assignment has dependent questions or submissions" });
  const stillThere = await app.request(`/api/teacher/assignments/${assignmentId}`, { headers: { Cookie: cookie } });
  assert.equal(stillThere.status, 200);
});
