import bcrypt from "bcryptjs";
import type { Database } from "sql.js";
import { ROLES, type AuthenticatedUser, type Role } from "./types.js";

interface UserRow {
  id: number;
  name: string;
  password_hash?: string;
  role: string;
  student_id: number | null;
  class_id: number | null;
}

function queryOne<T extends object>(
  database: Database,
  sql: string,
  parameters: unknown[]
): T | null {
  const statement = database.prepare(sql);
  statement.bind(parameters);

  try {
    return statement.step() ? (statement.getAsObject() as T) : null;
  } finally {
    statement.free();
  }
}

function parseRole(role: string): Role | null {
  return ROLES.includes(role as Role) ? (role as Role) : null;
}

function toAuthenticatedUser(row: UserRow): AuthenticatedUser | null {
  const role = parseRole(row.role);
  if (!role) return null;

  const user: AuthenticatedUser = {
    id: Number(row.id),
    name: String(row.name),
    role,
  };

  if (role === "student") {
    if (
      row.student_id === null ||
      row.student_id === undefined ||
      row.class_id === null ||
      row.class_id === undefined
    ) {
      return null;
    }
    user.student_id = Number(row.student_id);
    user.class_id = Number(row.class_id);
  }

  return user;
}

function findUser(database: Database, userId: number, includePassword: boolean): UserRow | null {
  const passwordColumn = includePassword ? ", u.password_hash" : "";
  return queryOne<UserRow>(
    database,
    `
      SELECT
        u.id,
        u.name,
        u.role,
        s.id AS student_id,
        s.class_id${passwordColumn}
      FROM users u
      LEFT JOIN students s ON s.user_id = u.id
      WHERE u.id = ?
    `,
    [userId]
  );
}

function findUserByUsername(database: Database, username: string): UserRow | null {
  return queryOne<UserRow>(
    database,
    `
      SELECT
        u.id,
        u.name,
        u.password_hash,
        u.role,
        s.id AS student_id,
        s.class_id
      FROM users u
      LEFT JOIN students s ON s.user_id = u.id
      WHERE u.username = ?
    `,
    [username]
  );
}

export async function authenticateUser(
  database: Database,
  username: string,
  password: string
): Promise<AuthenticatedUser | null> {
  const row = findUserByUsername(database, username.trim());
  if (!row || typeof row.password_hash !== "string") return null;

  const passwordMatches = await bcrypt.compare(password, row.password_hash);
  if (!passwordMatches) return null;

  return toAuthenticatedUser(row);
}

export function loadAuthenticatedUser(database: Database, userId: number): AuthenticatedUser | null {
  const row = findUser(database, userId, false);
  return row ? toAuthenticatedUser(row) : null;
}
