import { existsSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import { logger } from "hono/logger";
import initSqlJs, { Database } from "sql.js";
import { requireAuth, requireRole, type AuthEnv } from "./auth/middleware.js";
import { authenticateUser } from "./auth/service.js";
import {
  MemorySessionStore,
  SESSION_COOKIE,
  SESSION_TTL_SECONDS,
  type SessionStore,
} from "./auth/session-store.js";

const DB_PATH = join(import.meta.dirname, "../../../database/lms.db");

let db: Database | undefined;

export async function initDb(): Promise<Database> {
  const SQL = await initSqlJs();
  if (existsSync(DB_PATH)) {
    const buffer = readFileSync(DB_PATH);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
  }
  db.run("PRAGMA foreign_keys = ON");
  return db;
}

export function saveDb() {
  if (!db) throw new Error("Database has not been initialized");
  const data = db.export();
  const buffer = Buffer.from(data);
  writeFileSync(DB_PATH, buffer);
}

export function createApp(database: Database, sessions: SessionStore = new MemorySessionStore()) {
  const app = new Hono<AuthEnv>();

  app.use("*", logger());
  app.use("*", cors({ credentials: true, origin: "http://localhost:5173" }));

  app.get("/", (context) => {
    return context.json({ message: "LMS API is running" });
  });

  app.get("/api/health", (context) => {
    try {
      database.run("SELECT 1");
      return context.json({ status: "ok", database: "connected" });
    } catch {
      return context.json({ status: "error", database: "disconnected" }, 500);
    }
  });

  app.get("/api/tables", (context) => {
    const result = database.exec(
      "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
    );
    const tables = result[0]?.values.map((row) => ({ name: row[0] })) || [];
    return context.json(tables);
  });

  app.post("/api/auth/login", async (context) => {
    let input: { username?: unknown; password?: unknown };
    try {
      input = await context.req.json();
    } catch {
      return context.json({ error: "Username and password are required" }, 400);
    }

    if (
      typeof input.username !== "string" ||
      typeof input.password !== "string" ||
      !input.username.trim() ||
      !input.password
    ) {
      return context.json({ error: "Username and password are required" }, 400);
    }

    const user = await authenticateUser(database, input.username, input.password);
    if (!user) {
      return context.json({ error: "Invalid username or password" }, 401);
    }

    const token = sessions.create({ userId: user.id });
    setCookie(context, SESSION_COOKIE, token, {
      httpOnly: true,
      maxAge: SESSION_TTL_SECONDS,
      path: "/",
      sameSite: "Lax",
      secure: process.env.NODE_ENV === "production",
    });
    return context.json({ user });
  });

  app.get("/api/auth/me", requireAuth(database, sessions), (context) => {
    return context.json({ user: context.get("authUser") });
  });

  app.post("/api/auth/logout", (context) => {
    const token = getCookie(context, SESSION_COOKIE);
    if (token) sessions.delete(token);
    deleteCookie(context, SESSION_COOKIE, { path: "/" });
    return context.body(null, 204);
  });

  app.get("/api/teacher/dashboard", requireRole(database, sessions, "teacher"), (context) => {
    return context.json({ ok: true, role: "teacher" });
  });
  app.get("/api/headmaster/dashboard", requireRole(database, sessions, "headmaster"), (context) => {
    return context.json({ ok: true, role: "headmaster" });
  });
  app.get("/api/student/dashboard", requireRole(database, sessions, "student"), (context) => {
    return context.json({ ok: true, role: "student" });
  });

  return app;
}
