import type { Context, Hono } from "hono";
import type { Database } from "sql.js";
import { requireRole, type AuthEnv } from "../auth/middleware.js";
import type { SessionStore } from "../auth/session-store.js";
import {
  ATTITUDE_SCORES,
  findTeacherHomeroomDetail,
  listTeacherHomerooms,
  upsertTeacherAttitude,
  type AttitudeScore,
} from "./homeroom-repository.js";

function parseId(value: string): number | null {
  if (!/^\d+$/.test(value)) return null;
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

function parseDescription(value: unknown): string | null | undefined {
  if (value === undefined || value === null) return null;
  if (typeof value !== "string") return undefined;
  const text = value.trim();
  return text || null;
}

export function registerTeacherHomeroomRoutes(
  app: Hono<AuthEnv>,
  database: Database,
  sessions: SessionStore,
  persist: () => void
): void {
  const teacher = requireRole(database, sessions, "teacher");

  app.get("/api/teacher/homeroom", teacher, (context) => {
    return context.json({ homerooms: listTeacherHomerooms(database, context.get("authUser").id) });
  });

  app.get("/api/teacher/homeroom/:homeroomId", teacher, (context) => {
    const homeroomId = parseId(context.req.param("homeroomId"));
    if (!homeroomId) return context.json({ error: "Invalid homeroom ID" }, 400);

    const detail = findTeacherHomeroomDetail(database, context.get("authUser").id, homeroomId);
    return detail ? context.json(detail) : context.json({ error: "Homeroom not found" }, 404);
  });

  app.put("/api/teacher/homeroom/:homeroomId/students/:studentId/attitude", teacher, async (context) => {
    const homeroomId = parseId(context.req.param("homeroomId"));
    const studentId = parseId(context.req.param("studentId"));
    if (!homeroomId) return context.json({ error: "Invalid homeroom ID" }, 400);
    if (!studentId) return context.json({ error: "Invalid student ID" }, 400);

    let rawBody: unknown;
    try {
      rawBody = await context.req.json();
    } catch {
      return context.json({ error: "Score is required" }, 400);
    }
    if (!rawBody || Array.isArray(rawBody) || typeof rawBody !== "object") {
      return context.json({ error: "Score is required" }, 400);
    }
    const body = rawBody as Record<string, unknown>;
    const score = body.score;
    if (typeof score !== "string" || !ATTITUDE_SCORES.includes(score as AttitudeScore)) {
      return context.json({ error: "Score must be A, B, C, or D" }, 400);
    }
    const description = parseDescription(body.description);
    if (description === undefined) return context.json({ error: "Description is invalid" }, 400);

    const attitude = upsertTeacherAttitude(
      database,
      context.get("authUser").id,
      homeroomId,
      studentId,
      score as AttitudeScore,
      description
    );
    if (!attitude) return context.json({ error: "Homeroom student not found" }, 404);
    persist();
    return context.json(attitude);
  });
}
