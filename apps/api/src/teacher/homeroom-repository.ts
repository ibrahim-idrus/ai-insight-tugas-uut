import type { Database } from "sql.js";

export const ATTITUDE_SCORES = ["A", "B", "C", "D"] as const;
export type AttitudeScore = (typeof ATTITUDE_SCORES)[number];

export interface TeacherHomeroomSummary {
  id: number;
  class: { id: number; name: string; gradeLevel: number };
  academicPeriod: { id: number; schoolYear: string; semester: number };
  studentCount: number;
  scoredCount: number;
}

export interface TeacherAttitude {
  id: number;
  studentId: number;
  classId: number;
  academicPeriodId: number;
  teacherId: number;
  score: AttitudeScore;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TeacherHomeroomDetail {
  homeroom: TeacherHomeroomSummary;
  students: Array<{
    id: number;
    name: string;
    nis: string;
    attitude: TeacherAttitude | null;
  }>;
}

interface HomeroomRow {
  id: number;
  class_id: number;
  class_name: string;
  grade_level: number;
  academic_period_id: number;
  school_year: string;
  semester: number;
  student_count?: number;
  scored_count?: number;
}

interface AttitudeRow {
  id: number;
  student_id: number;
  class_id: number;
  academic_period_id: number;
  teacher_id: number;
  score: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

function queryRows<T extends object>(database: Database, sql: string, parameters: unknown[]): T[] {
  const statement = database.prepare(sql);
  statement.bind(parameters);
  const rows: T[] = [];

  try {
    while (statement.step()) rows.push(statement.getAsObject() as T);
    return rows;
  } finally {
    statement.free();
  }
}

function toSummary(row: HomeroomRow): TeacherHomeroomSummary {
  return {
    id: Number(row.id),
    class: { id: Number(row.class_id), name: String(row.class_name), gradeLevel: Number(row.grade_level) },
    academicPeriod: {
      id: Number(row.academic_period_id),
      schoolYear: String(row.school_year),
      semester: Number(row.semester),
    },
    studentCount: Number(row.student_count ?? 0),
    scoredCount: Number(row.scored_count ?? 0),
  };
}

function toAttitude(row: AttitudeRow): TeacherAttitude {
  return {
    id: Number(row.id),
    studentId: Number(row.student_id),
    classId: Number(row.class_id),
    academicPeriodId: Number(row.academic_period_id),
    teacherId: Number(row.teacher_id),
    score: row.score as AttitudeScore,
    description: row.description === null ? null : String(row.description),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function findHomeroom(database: Database, teacherId: number, homeroomId: number): TeacherHomeroomSummary | null {
  const row = queryRows<HomeroomRow>(
    database,
    `
      SELECT
        ha.id,
        c.id AS class_id, c.name AS class_name, c.grade_level,
        ap.id AS academic_period_id, ap.school_year, ap.semester,
        COUNT(DISTINCT s.id) AS student_count,
        COUNT(DISTINCT att.id) AS scored_count
      FROM homeroom_assignments ha
      JOIN classes c ON c.id = ha.class_id
      JOIN academic_periods ap ON ap.id = ha.academic_period_id
      LEFT JOIN students s ON s.class_id = c.id
      LEFT JOIN attitudes att
        ON att.student_id = s.id
        AND att.class_id = c.id
        AND att.academic_period_id = ha.academic_period_id
        AND att.teacher_id = ha.teacher_id
      WHERE ha.id = ? AND ha.teacher_id = ?
      GROUP BY ha.id
    `,
    [homeroomId, teacherId]
  )[0];
  return row ? toSummary(row) : null;
}

export function listTeacherHomerooms(database: Database, teacherId: number): TeacherHomeroomSummary[] {
  return queryRows<HomeroomRow>(
    database,
    `
      SELECT
        ha.id,
        c.id AS class_id, c.name AS class_name, c.grade_level,
        ap.id AS academic_period_id, ap.school_year, ap.semester,
        COUNT(DISTINCT s.id) AS student_count,
        COUNT(DISTINCT att.id) AS scored_count
      FROM homeroom_assignments ha
      JOIN classes c ON c.id = ha.class_id
      JOIN academic_periods ap ON ap.id = ha.academic_period_id
      LEFT JOIN students s ON s.class_id = c.id
      LEFT JOIN attitudes att
        ON att.student_id = s.id
        AND att.class_id = c.id
        AND att.academic_period_id = ha.academic_period_id
        AND att.teacher_id = ha.teacher_id
      WHERE ha.teacher_id = ?
      GROUP BY ha.id
      ORDER BY ap.school_year DESC, ap.semester DESC, c.grade_level, c.name
    `,
    [teacherId]
  ).map(toSummary);
}

export function findTeacherHomeroomDetail(
  database: Database,
  teacherId: number,
  homeroomId: number
): TeacherHomeroomDetail | null {
  const homeroom = findHomeroom(database, teacherId, homeroomId);
  if (!homeroom) return null;

  const students = queryRows<{
    id: number;
    name: string;
    nis: string;
    attitude_id: number | null;
    student_id: number | null;
    attitude_class_id: number | null;
    attitude_period_id: number | null;
    attitude_teacher_id: number | null;
    attitude_score: string | null;
    attitude_description: string | null;
    attitude_created_at: string | null;
    attitude_updated_at: string | null;
  }>(
    database,
    `
      SELECT
        s.id, s.name, s.nis,
        att.id AS attitude_id,
        att.student_id,
        att.class_id AS attitude_class_id,
        att.academic_period_id AS attitude_period_id,
        att.teacher_id AS attitude_teacher_id,
        att.score AS attitude_score,
        att.description AS attitude_description,
        att.created_at AS attitude_created_at,
        att.updated_at AS attitude_updated_at
      FROM students s
      LEFT JOIN attitudes att
        ON att.student_id = s.id
        AND att.class_id = ?
        AND att.academic_period_id = ?
        AND att.teacher_id = ?
      WHERE s.class_id = ?
      ORDER BY s.name
    `,
    [homeroom.class.id, homeroom.academicPeriod.id, teacherId, homeroom.class.id]
  ).map((student) => ({
    id: Number(student.id),
    name: String(student.name),
    nis: String(student.nis),
    attitude: student.attitude_id === null
      ? null
      : toAttitude({
        id: student.attitude_id,
        student_id: student.student_id!,
        class_id: student.attitude_class_id!,
        academic_period_id: student.attitude_period_id!,
        teacher_id: student.attitude_teacher_id!,
        score: student.attitude_score!,
        description: student.attitude_description,
        created_at: student.attitude_created_at!,
        updated_at: student.attitude_updated_at!,
      }),
  }));

  return { homeroom, students };
}

export function upsertTeacherAttitude(
  database: Database,
  teacherId: number,
  homeroomId: number,
  studentId: number,
  score: AttitudeScore,
  description: string | null
): TeacherAttitude | null {
  const homeroom = findHomeroom(database, teacherId, homeroomId);
  if (!homeroom) return null;

  const student = queryRows<{ id: number }>(
    database,
    "SELECT id FROM students WHERE id = ? AND class_id = ?",
    [studentId, homeroom.class.id]
  )[0];
  if (!student) return null;

  const existing = queryRows<{ id: number }>(
    database,
    `
      SELECT id
      FROM attitudes
      WHERE student_id = ? AND class_id = ? AND academic_period_id = ? AND teacher_id = ?
      ORDER BY id
      LIMIT 1
    `,
    [studentId, homeroom.class.id, homeroom.academicPeriod.id, teacherId]
  )[0];

  if (existing) {
    database.run(
      `UPDATE attitudes SET score = ?, description = ?, updated_at = datetime('now') WHERE id = ?`,
      [score, description, existing.id]
    );
  } else {
    database.run(
      `
        INSERT INTO attitudes (student_id, class_id, academic_period_id, teacher_id, score, description)
        VALUES (?, ?, ?, ?, ?, ?)
      `,
      [studentId, homeroom.class.id, homeroom.academicPeriod.id, teacherId, score, description]
    );
  }

  const row = queryRows<AttitudeRow>(
    database,
    `
      SELECT id, student_id, class_id, academic_period_id, teacher_id, score, description, created_at, updated_at
      FROM attitudes
      WHERE student_id = ? AND class_id = ? AND academic_period_id = ? AND teacher_id = ?
      ORDER BY id
      LIMIT 1
    `,
    [studentId, homeroom.class.id, homeroom.academicPeriod.id, teacherId]
  )[0];
  return row ? toAttitude(row) : null;
}
