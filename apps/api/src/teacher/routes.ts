import type { Context, Hono } from "hono";
import type { Database } from "sql.js";
import { requireRole, type AuthEnv } from "../auth/middleware.js";
import type { SessionStore } from "../auth/session-store.js";
import {
  createTeacherMaterial,
  deleteTeacherMaterial,
  findTeacherContext,
  findTeacherMaterial,
  listTeacherContexts,
  updateTeacherMaterial,
} from "./repository.js";
import type { MaterialInput } from "./types.js";

function parseId(value: string): number | null {
  return /^\d+$/.test(value) && Number(value) > 0 ? Number(value) : null;
}

function parseOptionalText(value: unknown): string | null | undefined {
  if (value === undefined || value === null) return null;
  if (typeof value !== "string") return undefined;
  const text = value.trim();
  return text || null;
}

async function parseMaterialInput(context: Context<AuthEnv>): Promise<MaterialInput | null> {
  let input: unknown;
  try {
    input = await context.req.json();
  } catch {
    return null;
  }

  if (!input || Array.isArray(input) || typeof input !== "object") return null;
  const { title, description, content } = input as Record<string, unknown>;
  if (typeof title !== "string" || !title.trim()) return null;

  const parsedDescription = parseOptionalText(description);
  const parsedContent = parseOptionalText(content);
  if (parsedDescription === undefined || parsedContent === undefined) return null;

  return { title: title.trim(), description: parsedDescription, content: parsedContent };
}

export function registerTeacherRoutes(
  app: Hono<AuthEnv>,
  database: Database,
  sessions: SessionStore,
  persist: () => void
): void {
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

  app.post("/api/teacher/classes/:contextId/materials", requireRole(database, sessions, "teacher"), async (context) => {
    const contextId = parseId(context.req.param("contextId"));
    if (!contextId) return context.json({ error: "Invalid teaching context ID" }, 400);

    const input = await parseMaterialInput(context);
    if (!input) return context.json({ error: "Title is required" }, 400);

    const material = createTeacherMaterial(database, context.get("authUser").id, contextId, input);
    if (!material) return context.json({ error: "Teaching context not found" }, 404);

    persist();
    return context.json(material, 201);
  });

  app.get("/api/teacher/classes/:contextId/materials/:materialId", requireRole(database, sessions, "teacher"), (context) => {
    const contextId = parseId(context.req.param("contextId"));
    if (!contextId) return context.json({ error: "Invalid teaching context ID" }, 400);
    const materialId = parseId(context.req.param("materialId"));
    if (!materialId) return context.json({ error: "Invalid material ID" }, 400);

    const material = findTeacherMaterial(database, context.get("authUser").id, contextId, materialId);
    return material ? context.json(material) : context.json({ error: "Material not found" }, 404);
  });

  app.patch("/api/teacher/classes/:contextId/materials/:materialId", requireRole(database, sessions, "teacher"), async (context) => {
    const contextId = parseId(context.req.param("contextId"));
    if (!contextId) return context.json({ error: "Invalid teaching context ID" }, 400);
    const materialId = parseId(context.req.param("materialId"));
    if (!materialId) return context.json({ error: "Invalid material ID" }, 400);
    const input = await parseMaterialInput(context);
    if (!input) return context.json({ error: "Title is required" }, 400);

    const material = updateTeacherMaterial(database, context.get("authUser").id, contextId, materialId, input);
    if (!material) return context.json({ error: "Material not found" }, 404);

    persist();
    return context.json(material);
  });

  app.delete("/api/teacher/classes/:contextId/materials/:materialId", requireRole(database, sessions, "teacher"), (context) => {
    const contextId = parseId(context.req.param("contextId"));
    if (!contextId) return context.json({ error: "Invalid teaching context ID" }, 400);
    const materialId = parseId(context.req.param("materialId"));
    if (!materialId) return context.json({ error: "Invalid material ID" }, 400);

    const deleted = deleteTeacherMaterial(database, context.get("authUser").id, contextId, materialId);
    if (!deleted) return context.json({ error: "Material not found" }, 404);

    persist();
    return context.body(null, 204);
  });
}
