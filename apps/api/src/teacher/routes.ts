import type { Hono } from "hono";
import type { Database } from "sql.js";
import { requireRole, type AuthEnv } from "../auth/middleware.js";
import type { SessionStore } from "../auth/session-store.js";
import { findTeacherContext, listTeacherContexts } from "./repository.js";

export function registerTeacherRoutes(
  app: Hono<AuthEnv>,
  database: Database,
  sessions: SessionStore,
  persist: () => void
): void {
  void persist;

  app.get("/api/teacher/classes", requireRole(database, sessions, "teacher"), (context) => {
    const contexts = listTeacherContexts(database, context.get("authUser").id);
    return context.json({ contexts });
  });

  app.get("/api/teacher/classes/:contextId", requireRole(database, sessions, "teacher"), (context) => {
    const contextId = context.req.param("contextId");
    if (!/^\d+$/.test(contextId) || Number(contextId) <= 0) {
      return context.json({ error: "Invalid teaching context ID" }, 400);
    }

    const teachingContext = findTeacherContext(
      database,
      context.get("authUser").id,
      Number(contextId)
    );
    if (!teachingContext) {
      return context.json({ error: "Teaching context not found" }, 404);
    }

    return context.json(teachingContext);
  });
}
