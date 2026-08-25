import type { Context, Hono } from "hono";
import type { Database } from "sql.js";
import { requireRole, type AuthEnv } from "../auth/middleware.js";
import type { SessionStore } from "../auth/session-store.js";
import { closeExpiredAssignments } from "./assignment-repository.js";
import { getTeacherDashboard, listTeacherAssignmentResults, listTeacherGrades } from "./analytics-repository.js";

function parseId(value: string): number | null {
  if (!/^\d+$/.test(value)) return null;
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

function parseQueryId(value: string | undefined): number | undefined | null {
  if (value === undefined || value === "") return undefined;
  return parseId(value) ?? null;
}

function synchronizeExpiredAssignments(database: Database, persist: () => void): void {
  if (closeExpiredAssignments(database) > 0) persist();
}

export function registerTeacherAnalyticsRoutes(
  app: Hono<AuthEnv>,
  database: Database,
  sessions: SessionStore,
  persist: () => void
): void {
  const teacher = requireRole(database, sessions, "teacher");

  app.get("/api/teacher/dashboard", teacher, (context) => {
    synchronizeExpiredAssignments(database, persist);
    return context.json(getTeacherDashboard(database, context.get("authUser").id));
  });

  app.get("/api/teacher/assignments/:assignmentId/results", teacher, (context) => {
    synchronizeExpiredAssignments(database, persist);
    const assignmentId = parseId(context.req.param("assignmentId"));
    if (!assignmentId) return context.json({ error: "Invalid assignment ID" }, 400);

    const results = listTeacherAssignmentResults(database, context.get("authUser").id, assignmentId);
    return results ? context.json(results) : context.json({ error: "Assignment not found" }, 404);
  });

  app.get("/api/teacher/grades", teacher, (context) => {
    synchronizeExpiredAssignments(database, persist);
    const contextId = parseQueryId(context.req.query("context_id"));
    const classId = parseQueryId(context.req.query("class_id"));
    const subjectId = parseQueryId(context.req.query("subject_id"));
    const academicPeriodId = parseQueryId(context.req.query("academic_period_id"));
    if (contextId === null || classId === null || subjectId === null || academicPeriodId === null) {
      return context.json({ error: "Invalid grade filter" }, 400);
    }

    const assignmentType = context.req.query("assignment_type");
    if (assignmentType && !["quiz", "task", "upload"].includes(assignmentType)) {
      return context.json({ error: "Assignment type is invalid" }, 400);
    }

    const grades = listTeacherGrades(database, context.get("authUser").id, {
      contextId: contextId ?? undefined,
      classId: classId ?? undefined,
      subjectId: subjectId ?? undefined,
      academicPeriodId: academicPeriodId ?? undefined,
      assignmentType,
      search: context.req.query("search"),
    });
    return grades ? context.json(grades) : context.json({ error: "Teaching context not found" }, 404);
  });
}
