import type { MiddlewareHandler } from "hono";
import { getCookie } from "hono/cookie";
import type { Database } from "sql.js";
import { loadAuthenticatedUser } from "./service";
import { SESSION_COOKIE, type SessionStore } from "./session-store";
import type { AuthenticatedUser, Role } from "./types";

export type AuthEnv = {
  Variables: {
    authUser: AuthenticatedUser;
  };
};

export function requireAuth(database: Database, sessions: SessionStore): MiddlewareHandler<AuthEnv> {
  return async (context, next) => {
    const token = getCookie(context, SESSION_COOKIE);
    const subject = token ? sessions.get(token) : null;
    const user = subject ? loadAuthenticatedUser(database, subject.userId) : null;

    if (!user) {
      if (token) sessions.delete(token);
      return context.json({ error: "Authentication required" }, 401);
    }

    context.set("authUser", user);
    await next();
  };
}

export function requireRole(database: Database, sessions: SessionStore, role: Role): MiddlewareHandler<AuthEnv> {
  return async (context, next) => {
    const token = getCookie(context, SESSION_COOKIE);
    const subject = token ? sessions.get(token) : null;
    const user = subject ? loadAuthenticatedUser(database, subject.userId) : null;

    if (!user) {
      if (token) sessions.delete(token);
      return context.json({ error: "Authentication required" }, 401);
    }

    if (user.role !== role) {
      return context.json({ error: "Forbidden" }, 403);
    }

    context.set("authUser", user);
    await next();
  };
}
