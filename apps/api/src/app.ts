import { existsSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import { logger } from "hono/logger";
import initSqlJs, { Database } from "sql.js";
import { requireAuth, requireRole, type AuthEnv } from "./auth/middleware.js";
import { authenticateUser } from "./auth/service.js";
import { createStudentRoutes } from "./student/routes.js";
import { registerTeacherRoutes } from "./teacher/routes.js";
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

export function createApp(
  database: Database,
  sessions: SessionStore = new MemorySessionStore(),
  persist: () => void = () => {}
) {
  const app = new Hono<AuthEnv>();
  const allowedOrigins = new Set(
    (process.env.CORS_ORIGINS ?? "http://localhost:5173")
      .split(",")
      .map((origin) => origin.trim())
      .filter(Boolean)
  );
  const sameSite: "Lax" | "None" = process.env.AUTH_COOKIE_SAME_SITE === "None" ? "None" : "Lax";

  app.use("*", logger());
  app.use(
    "*",
    cors({
      credentials: true,
      origin: (origin) => (allowedOrigins.has(origin) ? origin : undefined),
    })
  );

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
    let input: { username?: unknown; password?: unknown } | null;
    try {
      input = await context.req.json();
    } catch {
      return context.json({ error: "Username and password are required" }, 400);
    }

    if (
      !input ||
      typeof input.username !== "string" ||
      typeof input.password !== "string" ||
      !input.username.trim() ||
      !input.password.trim()
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
      sameSite,
      secure: sameSite === "None" || process.env.NODE_ENV === "production",
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
  registerTeacherRoutes(app, database, sessions, persist);
  app.get("/api/headmaster/dashboard", requireRole(database, sessions, "headmaster"), (context) => {
    const periodId = context.req.query("academic_period_id");

    const periodFilter = periodId ? "AND ap.id = ?" : "";
    const periodParams = periodId ? [Number(periodId)] : [];

    const latestPeriod = database.exec(
      `SELECT id FROM academic_periods ORDER BY start_date DESC LIMIT 1`
    );
    const activePeriodId = periodId ? Number(periodId) : (latestPeriod[0]?.values[0]?.[0] as number) ?? null;

    const kpiStudents = database.exec(`SELECT COUNT(*) FROM students`);
    const kpiTeachers = database.exec(`SELECT COUNT(*) FROM users WHERE role = 'teacher'`);
    const kpiClasses = database.exec(`SELECT COUNT(*) FROM classes`);
    const kpiSubjects = database.exec(`SELECT COUNT(*) FROM subjects`);
    const kpiAssignments = database.exec(
      `SELECT COUNT(*) FROM assignments a
       JOIN subject_teacher_assignments sta ON sta.id = a.subject_teacher_assignment_id
       WHERE a.status = 'published' ${periodId ? "AND sta.academic_period_id = ?" : ""}`,
      periodParams
    );
    const kpiAvgAttitude = database.exec(
      `SELECT AVG(CASE score WHEN 'A' THEN 4 WHEN 'B' THEN 3 WHEN 'C' THEN 2 WHEN 'D' THEN 1 END)
       FROM attitudes WHERE academic_period_id = ?`,
      [activePeriodId]
    );

    const studentsPerClass = database.exec(
      `SELECT c.id, c.name, c.grade_level, COUNT(s.id) as student_count
       FROM classes c
       LEFT JOIN students s ON s.class_id = c.id
       GROUP BY c.id
       ORDER BY c.grade_level, c.name`
    );

    const assignmentsByType = database.exec(
      `SELECT a.assignment_type, COUNT(*) as count
       FROM assignments a
       JOIN subject_teacher_assignments sta ON sta.id = a.subject_teacher_assignment_id
       WHERE a.status = 'published' ${periodId ? "AND sta.academic_period_id = ?" : ""}
       GROUP BY a.assignment_type`,
      periodParams
    );

    const assignmentsPerSubject = database.exec(
      `SELECT sub.id, sub.name, sub.code, COUNT(a.id) as count
       FROM subjects sub
       LEFT JOIN subject_teacher_assignments sta ON sta.subject_id = sub.id ${periodId ? "AND sta.academic_period_id = ?" : ""}
       LEFT JOIN assignments a ON a.subject_teacher_assignment_id = sta.id AND a.status = 'published'
       GROUP BY sub.id
       ORDER BY count DESC`,
      periodParams
    );

    const attitudePerClass = database.exec(
      `SELECT c.id, c.name, c.grade_level,
              AVG(CASE att.score WHEN 'A' THEN 4 WHEN 'B' THEN 3 WHEN 'C' THEN 2 WHEN 'D' THEN 1 END) as avg_score,
              COUNT(att.id) as record_count
       FROM classes c
       LEFT JOIN attitudes att ON att.class_id = c.id AND att.academic_period_id = ?
       GROUP BY c.id
       ORDER BY c.grade_level, c.name`,
      [activePeriodId]
    );

    const classOverview = database.exec(
      `SELECT c.id, c.name, c.grade_level,
              u.name as homeroom_teacher,
              COUNT(s.id) as student_count,
              AVG(CASE att.score WHEN 'A' THEN 4 WHEN 'B' THEN 3 WHEN 'C' THEN 2 WHEN 'D' THEN 1 END) as avg_attitude,
              COUNT(att.id) as attitude_records
       FROM classes c
       LEFT JOIN homeroom_assignments ha ON ha.class_id = c.id AND ha.academic_period_id = ?
       LEFT JOIN users u ON u.id = ha.teacher_id
       LEFT JOIN students s ON s.class_id = c.id
       LEFT JOIN attitudes att ON att.class_id = c.id AND att.academic_period_id = ?
       GROUP BY c.id
       ORDER BY c.grade_level, c.name`,
      [activePeriodId, activePeriodId]
    );

    const teacherAssignments = database.exec(
      `SELECT u.name as teacher_name, sub.name as subject_name, c.name as class_name,
              ap.school_year, ap.semester
       FROM subject_teacher_assignments sta
       JOIN users u ON u.id = sta.teacher_id
       JOIN subjects sub ON sub.id = sta.subject_id
       JOIN classes c ON c.id = sta.class_id
       JOIN academic_periods ap ON ap.id = sta.academic_period_id
       ${periodId ? "WHERE sta.academic_period_id = ?" : ""}
       ORDER BY u.name, sub.name, c.name`,
      periodParams
    );

    const homeroomOverview = database.exec(
      `SELECT c.name as class_name, c.grade_level, u.name as teacher_name
       FROM homeroom_assignments ha
       JOIN classes c ON c.id = ha.class_id
       JOIN users u ON u.id = ha.teacher_id
       ${periodId ? "WHERE ha.academic_period_id = ?" : ""}
       ORDER BY c.grade_level, c.name`,
      periodParams
    );

    const academicPeriods = database.exec(
      `SELECT id, school_year, semester, start_date, end_date FROM academic_periods ORDER BY start_date DESC`
    );

    function firstRow(result: { columns: string[]; values: unknown[][] }[]) {
      return result[0]?.values[0] ?? null;
    }

    function toRows(result: { columns: string[]; values: unknown[][] }[]) {
      if (!result[0]) return [];
      return result[0].values.map((row) => {
        const obj: Record<string, unknown> = {};
        result[0].columns.forEach((col, i) => { obj[col] = row[i]; });
        return obj;
      });
    }

    return context.json({
      active_period_id: activePeriodId,
      kpi: {
        total_students: firstRow(kpiStudents)?.[0] ?? 0,
        total_teachers: firstRow(kpiTeachers)?.[0] ?? 0,
        total_classes: firstRow(kpiClasses)?.[0] ?? 0,
        total_subjects: firstRow(kpiSubjects)?.[0] ?? 0,
        published_assignments: firstRow(kpiAssignments)?.[0] ?? 0,
        avg_attitude_score: firstRow(kpiAvgAttitude)?.[0] ?? null,
      },
      students_per_class: toRows(studentsPerClass),
      assignments_by_type: toRows(assignmentsByType),
      assignments_per_subject: toRows(assignmentsPerSubject),
      attitude_per_class: toRows(attitudePerClass),
      class_overview: toRows(classOverview),
      teacher_assignments: toRows(teacherAssignments),
      homeroom_overview: toRows(homeroomOverview),
      academic_periods: toRows(academicPeriods),
    });
  });

  // --- Headmaster detail endpoints ---

  app.get("/api/headmaster/students", requireRole(database, sessions, "headmaster"), (context) => {
    const search = context.req.query("search") ?? "";
    const classId = context.req.query("class_id");

    let query = `
      SELECT s.id, s.name, s.nis, u.username, c.name as class_name, c.grade_level
      FROM students s
      JOIN users u ON u.id = s.user_id
      JOIN classes c ON c.id = s.class_id
    `;
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (search) {
      conditions.push("(s.name LIKE ? OR u.username LIKE ? OR s.nis LIKE ?)");
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }
    if (classId) {
      conditions.push("s.class_id = ?");
      params.push(Number(classId));
    }

    if (conditions.length > 0) {
      query += " WHERE " + conditions.join(" AND ");
    }
    query += " ORDER BY c.grade_level, c.name, s.name";

    const result = database.exec(query, params);
    const toRows = (r: { columns: string[]; values: unknown[][] }[]) => {
      if (!r[0]) return [];
      return r[0].values.map((row) => {
        const obj: Record<string, unknown> = {};
        r[0].columns.forEach((col, i) => { obj[col] = row[i]; });
        return obj;
      });
    };
    return context.json({ students: toRows(result) });
  });

  app.get("/api/headmaster/teachers", requireRole(database, sessions, "headmaster"), (context) => {
    const result = database.exec(`
      SELECT u.id, u.name, u.username,
             GROUP_CONCAT(DISTINCT sub.name) as subjects,
             GROUP_CONCAT(DISTINCT c.name) as classes
      FROM users u
      LEFT JOIN subject_teacher_assignments sta ON sta.teacher_id = u.id
      LEFT JOIN subjects sub ON sub.id = sta.subject_id
      LEFT JOIN classes c ON c.id = sta.class_id
      WHERE u.role = 'teacher'
      GROUP BY u.id
      ORDER BY u.name
    `);
    const toRows = (r: { columns: string[]; values: unknown[][] }[]) => {
      if (!r[0]) return [];
      return r[0].values.map((row) => {
        const obj: Record<string, unknown> = {};
        r[0].columns.forEach((col, i) => { obj[col] = row[i]; });
        return obj;
      });
    };
    return context.json({ teachers: toRows(result) });
  });

  app.get("/api/headmaster/classes", requireRole(database, sessions, "headmaster"), (context) => {
    const periodId = context.req.query("academic_period_id");
    const activePeriod = periodId ? Number(periodId) : null;

    const result = database.exec(`
      SELECT c.id, c.name, c.grade_level,
             u.name as homeroom_teacher,
             COUNT(s.id) as student_count
      FROM classes c
      LEFT JOIN homeroom_assignments ha ON ha.class_id = c.id ${activePeriod ? "AND ha.academic_period_id = ?" : ""}
      LEFT JOIN users u ON u.id = ha.teacher_id
      LEFT JOIN students s ON s.class_id = c.id
      GROUP BY c.id
      ORDER BY c.grade_level, c.name
    `, activePeriod ? [activePeriod] : []);

    const toRows = (r: { columns: string[]; values: unknown[][] }[]) => {
      if (!r[0]) return [];
      return r[0].values.map((row) => {
        const obj: Record<string, unknown> = {};
        r[0].columns.forEach((col, i) => { obj[col] = row[i]; });
        return obj;
      });
    };
    return context.json({ classes: toRows(result) });
  });

  app.get("/api/headmaster/subjects", requireRole(database, sessions, "headmaster"), (context) => {
    const periodId = context.req.query("academic_period_id");
    const activePeriod = periodId ? Number(periodId) : null;

    const result = database.exec(`
      SELECT sub.id, sub.name, sub.code,
             GROUP_CONCAT(DISTINCT u.name) as teachers
      FROM subjects sub
      LEFT JOIN subject_teacher_assignments sta ON sta.subject_id = sub.id ${activePeriod ? "AND sta.academic_period_id = ?" : ""}
      LEFT JOIN users u ON u.id = sta.teacher_id
      GROUP BY sub.id
      ORDER BY sub.name
    `, activePeriod ? [activePeriod] : []);

    const toRows = (r: { columns: string[]; values: unknown[][] }[]) => {
      if (!r[0]) return [];
      return r[0].values.map((row) => {
        const obj: Record<string, unknown> = {};
        r[0].columns.forEach((col, i) => { obj[col] = row[i]; });
        return obj;
      });
    };
    return context.json({ subjects: toRows(result) });
  });

  app.get("/api/headmaster/assignments", requireRole(database, sessions, "headmaster"), (context) => {
    const periodId = context.req.query("academic_period_id");
    const type = context.req.query("type");
    const classId = context.req.query("class_id");

    let query = `
      SELECT a.id, a.title, a.assignment_type, a.status, a.start_at, a.due_at,
             sub.name as subject_name, c.name as class_name, c.id as class_id,
             u.name as teacher_name,
             (SELECT COUNT(*) FROM assignment_submissions asub WHERE asub.assignment_id = a.id) as submission_count
      FROM assignments a
      JOIN subject_teacher_assignments sta ON sta.id = a.subject_teacher_assignment_id
      JOIN subjects sub ON sub.id = sta.subject_id
      JOIN classes c ON c.id = sta.class_id
      JOIN users u ON u.id = sta.teacher_id
      WHERE a.status = 'published'
    `;
    const params: unknown[] = [];

    if (periodId) {
      query += " AND sta.academic_period_id = ?";
      params.push(Number(periodId));
    }
    if (type) {
      query += " AND a.assignment_type = ?";
      params.push(type);
    }
    if (classId) {
      query += " AND sta.class_id = ?";
      params.push(Number(classId));
    }

    query += " ORDER BY a.due_at DESC";

    const result = database.exec(query, params);
    const toRows = (r: { columns: string[]; values: unknown[][] }[]) => {
      if (!r[0]) return [];
      return r[0].values.map((row) => {
        const obj: Record<string, unknown> = {};
        r[0].columns.forEach((col, i) => { obj[col] = row[i]; });
        return obj;
      });
    };
    return context.json({ assignments: toRows(result) });
  });

  app.get("/api/headmaster/attitudes", requireRole(database, sessions, "headmaster"), (context) => {
    const periodId = context.req.query("academic_period_id");
    const classId = context.req.query("class_id");
    const activePeriod = periodId ? Number(periodId) : null;

    let query = `
      SELECT att.id, s.name as student_name, s.nis, c.name as class_name, c.id as class_id,
             att.score, att.description, u.name as teacher_name
      FROM attitudes att
      JOIN students s ON s.id = att.student_id
      JOIN classes c ON c.id = att.class_id
      JOIN users u ON u.id = att.teacher_id
    `;
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (activePeriod) {
      conditions.push("att.academic_period_id = ?");
      params.push(activePeriod);
    }
    if (classId) {
      conditions.push("att.class_id = ?");
      params.push(Number(classId));
    }

    if (conditions.length > 0) {
      query += " WHERE " + conditions.join(" AND ");
    }
    query += " ORDER BY c.grade_level, c.name, s.name";

    const result = database.exec(query, params);
    const toRows = (r: { columns: string[]; values: unknown[][] }[]) => {
      if (!r[0]) return [];
      return r[0].values.map((row) => {
        const obj: Record<string, unknown> = {};
        r[0].columns.forEach((col, i) => { obj[col] = row[i]; });
        return obj;
      });
    };

    // Calculate summary
    const summaryQuery = `
      SELECT c.id as class_id, c.name as class_name,
             AVG(CASE att.score WHEN 'A' THEN 4 WHEN 'B' THEN 3 WHEN 'C' THEN 2 WHEN 'D' THEN 1 END) as avg_score,
             COUNT(att.id) as record_count,
             SUM(CASE WHEN att.score = 'A' THEN 1 ELSE 0 END) as count_a,
             SUM(CASE WHEN att.score = 'B' THEN 1 ELSE 0 END) as count_b,
             SUM(CASE WHEN att.score = 'C' THEN 1 ELSE 0 END) as count_c,
             SUM(CASE WHEN att.score = 'D' THEN 1 ELSE 0 END) as count_d
      FROM attitudes att
      JOIN classes c ON c.id = att.class_id
      ${activePeriod ? "WHERE att.academic_period_id = ?" : ""}
      GROUP BY c.id
      ORDER BY c.grade_level, c.name
    `;
    const summaryResult = database.exec(summaryQuery, activePeriod ? [activePeriod] : []);

    return context.json({
      attitudes: toRows(result),
      summary: toRows(summaryResult),
    });
  });

  app.get("/api/headmaster/assignments-by-type-per-class", requireRole(database, sessions, "headmaster"), (context) => {
    const periodId = context.req.query("academic_period_id");
    const periodParams = periodId ? [Number(periodId)] : [];

    const result = database.exec(`
      SELECT c.id as class_id, c.name as class_name, c.grade_level,
             a.assignment_type, COUNT(*) as count
      FROM assignments a
      JOIN subject_teacher_assignments sta ON sta.id = a.subject_teacher_assignment_id
      JOIN classes c ON c.id = sta.class_id
      WHERE a.status = 'published' ${periodId ? "AND sta.academic_period_id = ?" : ""}
      GROUP BY c.id, a.assignment_type
      ORDER BY c.grade_level, c.name, a.assignment_type
    `, periodParams);

    const toRows = (r: { columns: string[]; values: unknown[][] }[]) => {
      if (!r[0]) return [];
      return r[0].values.map((row) => {
        const obj: Record<string, unknown> = {};
        r[0].columns.forEach((col, i) => { obj[col] = row[i]; });
        return obj;
      });
    };
    return context.json({ assignments_by_type_per_class: toRows(result) });
  });

  const studentRoutes = createStudentRoutes(database, sessions);
  app.route("/api/student", studentRoutes);

  return app;
}
