import type { Context, Hono } from "hono";
import type { Database } from "sql.js";
import { requireRole, type AuthEnv } from "../auth/middleware.js";
import type { SessionStore } from "../auth/session-store.js";
import {
  closeExpiredAssignments,
  createTeacherAssignment,
  deleteTeacherAssignment,
  ensureAssignmentSubmissionDeadlineGuard,
  findTeacherAssignment,
  listTeacherAssignments,
  transitionTeacherAssignment,
  updateTeacherAssignment,
} from "./assignment-repository.js";
import { ASSIGNMENT_TYPES, type AssignmentInput, type AssignmentType, type TeacherAssignment } from "./assignment-types.js";

function parseId(value: string): number | null {
  if (!/^\d+$/.test(value)) return null;
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

function parsePositiveInteger(value: unknown): number | null {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0 ? value : null;
}

function parseOptionalText(value: unknown, fallback: string | null | undefined): string | null | undefined {
  if (value === undefined) return fallback;
  if (value === null) return null;
  if (typeof value !== "string") return undefined;
  const text = value.trim();
  return text || null;
}

function isValidDateTime(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:\d{2})?$/.test(value)) return false;
  return Number.isFinite(Date.parse(value.replace(" ", "T")));
}

function parseOptionalDateTime(value: unknown, fallback: string | null | undefined): string | null | undefined {
  const parsed = parseOptionalText(value, fallback);
  return parsed === null || parsed === undefined || isValidDateTime(parsed) ? parsed : undefined;
}

function isAssignmentType(value: unknown): value is AssignmentType {
  return typeof value === "string" && ASSIGNMENT_TYPES.includes(value as AssignmentType);
}

interface AssignmentDefaults {
  subjectTeacherAssignmentId?: number;
  title?: string;
  description?: string | null;
  assignmentType?: AssignmentType;
  startAt?: string | null;
  dueAt?: string | null;
}

async function parseAssignmentInput(
  context: Context<AuthEnv>,
  defaults: AssignmentDefaults = {}
): Promise<{ input: AssignmentInput } | { error: string }> {
  let raw: unknown;
  try {
    raw = await context.req.json();
  } catch {
    return { error: "Invalid assignment input" };
  }

  if (!raw || Array.isArray(raw) || typeof raw !== "object") return { error: "Invalid assignment input" };
  const input = raw as Record<string, unknown>;

  const subjectTeacherAssignmentId = input.subjectTeacherAssignmentId === undefined
    ? defaults.subjectTeacherAssignmentId
    : parsePositiveInteger(input.subjectTeacherAssignmentId);
  if (!subjectTeacherAssignmentId) return { error: "Teaching context is required" };

  const title = input.title === undefined ? defaults.title : input.title;
  if (typeof title !== "string" || !title.trim()) return { error: "Title is required" };

  const assignmentType = input.assignmentType === undefined ? defaults.assignmentType : input.assignmentType;
  if (!isAssignmentType(assignmentType)) return { error: "Assignment type is invalid" };

  const description = parseOptionalText(input.description, defaults.description ?? null);
  if (description === undefined) return { error: "Description is invalid" };
  const startAt = parseOptionalDateTime(input.startAt, defaults.startAt ?? null);
  if (startAt === undefined) return { error: "Start date is invalid" };
  const dueAt = parseOptionalDateTime(input.dueAt, defaults.dueAt ?? null);
  if (dueAt === undefined) return { error: "Due date is invalid" };

  return {
    input: {
      subjectTeacherAssignmentId,
      title: title.trim(),
      description,
      assignmentType,
      startAt,
      dueAt,
    },
  };
}

function assignmentNotFound(context: Context<AuthEnv>) {
  return context.json({ error: "Assignment not found" }, 404);
}

function synchronizeExpiredAssignments(database: Database, persist: () => void): void {
  if (closeExpiredAssignments(database) > 0) persist();
}

function assignmentWithStatus(
  database: Database,
  teacherId: number,
  assignmentId: number,
  status: "published" | "closed",
  previousStatus: "draft" | "published"
): TeacherAssignment | null {
  return transitionTeacherAssignment(database, teacherId, assignmentId, previousStatus, status);
}

export function registerTeacherAssignmentRoutes(
  app: Hono<AuthEnv>,
  database: Database,
  sessions: SessionStore,
  persist: () => void
): void {
  ensureAssignmentSubmissionDeadlineGuard(database);
  const teacher = requireRole(database, sessions, "teacher");

  app.get("/api/teacher/assignments", teacher, (context) => {
    synchronizeExpiredAssignments(database, persist);
    return context.json({ assignments: listTeacherAssignments(database, context.get("authUser").id) });
  });

  app.post("/api/teacher/assignments", teacher, async (context) => {
    synchronizeExpiredAssignments(database, persist);
    const parsed = await parseAssignmentInput(context);
    if ("error" in parsed) return context.json({ error: parsed.error }, 400);

    const assignment = createTeacherAssignment(database, context.get("authUser").id, parsed.input);
    if (!assignment) return context.json({ error: "Teaching context not found" }, 404);

    persist();
    return context.json(assignment, 201);
  });

  app.get("/api/teacher/assignments/:assignmentId", teacher, (context) => {
    synchronizeExpiredAssignments(database, persist);
    const assignmentId = parseId(context.req.param("assignmentId"));
    if (!assignmentId) return context.json({ error: "Invalid assignment ID" }, 400);

    const assignment = findTeacherAssignment(database, context.get("authUser").id, assignmentId);
    return assignment ? context.json(assignment) : assignmentNotFound(context);
  });

  app.patch("/api/teacher/assignments/:assignmentId", teacher, async (context) => {
    synchronizeExpiredAssignments(database, persist);
    const assignmentId = parseId(context.req.param("assignmentId"));
    if (!assignmentId) return context.json({ error: "Invalid assignment ID" }, 400);

    const existing = findTeacherAssignment(database, context.get("authUser").id, assignmentId);
    if (!existing) return assignmentNotFound(context);

    const parsed = await parseAssignmentInput(context, {
      subjectTeacherAssignmentId: existing.subjectTeacherAssignmentId,
      title: existing.title,
      description: existing.description,
      assignmentType: existing.assignmentType,
      startAt: existing.startAt,
      dueAt: existing.dueAt,
    });
    if ("error" in parsed) return context.json({ error: parsed.error }, 400);

    const assignment = updateTeacherAssignment(database, context.get("authUser").id, assignmentId, parsed.input);
    if (!assignment) return context.json({ error: "Assignment not found" }, 404);

    persist();
    return context.json(assignment);
  });

  app.delete("/api/teacher/assignments/:assignmentId", teacher, (context) => {
    synchronizeExpiredAssignments(database, persist);
    const assignmentId = parseId(context.req.param("assignmentId"));
    if (!assignmentId) return context.json({ error: "Invalid assignment ID" }, 400);

    const deleted = deleteTeacherAssignment(database, context.get("authUser").id, assignmentId);
    if (deleted === "not_found") return assignmentNotFound(context);
    if (deleted === "has_dependents") {
      return context.json({ error: "Assignment has dependent questions or submissions" }, 409);
    }

    persist();
    return context.body(null, 204);
  });

  app.post("/api/teacher/assignments/:assignmentId/publish", teacher, (context) => {
    return transitionAssignment(context, database, persist, "published", "draft");
  });

  app.post("/api/teacher/assignments/:assignmentId/close", teacher, (context) => {
    return transitionAssignment(context, database, persist, "closed", "published");
  });
}

function transitionAssignment(
  context: Context<AuthEnv>,
  database: Database,
  persist: () => void,
  status: "published" | "closed",
  previousStatus: "draft" | "published"
) {
  synchronizeExpiredAssignments(database, persist);
  const assignmentId = parseId(context.req.param("assignmentId"));
  if (!assignmentId) return context.json({ error: "Invalid assignment ID" }, 400);

  const existing = findTeacherAssignment(database, context.get("authUser").id, assignmentId);
  if (!existing) return assignmentNotFound(context);

  const assignment = assignmentWithStatus(database, context.get("authUser").id, assignmentId, status, previousStatus);
  if (!assignment) return context.json({ error: `Assignment cannot be ${status}` }, 409);

  if (status === "published") {
    const closed = closeExpiredAssignments(database);
    if (closed > 0) {
      persist();
      return context.json(findTeacherAssignment(database, context.get("authUser").id, assignmentId) ?? assignment);
    }
  }

  persist();
  return context.json(assignment);
}
