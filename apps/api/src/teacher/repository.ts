import type { Database } from "sql.js";
import type {
  TeacherContextDetails,
  TeacherContextSummary,
  TeacherMaterial,
  TeacherStudent,
} from "./types.js";

interface ContextRow {
  id: number;
  class_id: number;
  class_name: string;
  grade_level: number;
  subject_id: number;
  subject_name: string;
  subject_code: string;
  academic_period_id: number;
  school_year: string;
  semester: number;
  student_count: number;
  material_count: number;
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

function toTeacherContextSummary(row: ContextRow): TeacherContextSummary {
  return {
    id: Number(row.id),
    class: {
      id: Number(row.class_id),
      name: String(row.class_name),
      gradeLevel: Number(row.grade_level),
    },
    subject: {
      id: Number(row.subject_id),
      name: String(row.subject_name),
      code: String(row.subject_code),
    },
    academicPeriod: {
      id: Number(row.academic_period_id),
      schoolYear: String(row.school_year),
      semester: Number(row.semester),
    },
    studentCount: Number(row.student_count),
    materialCount: Number(row.material_count),
  };
}

const contextSelect = `
  SELECT
    sta.id,
    c.id AS class_id,
    c.name AS class_name,
    c.grade_level,
    sub.id AS subject_id,
    sub.name AS subject_name,
    sub.code AS subject_code,
    ap.id AS academic_period_id,
    ap.school_year,
    ap.semester,
    COUNT(DISTINCT s.id) AS student_count,
    COUNT(DISTINCT m.id) AS material_count
  FROM subject_teacher_assignments sta
  JOIN classes c ON c.id = sta.class_id
  JOIN subjects sub ON sub.id = sta.subject_id
  JOIN academic_periods ap ON ap.id = sta.academic_period_id
  LEFT JOIN students s ON s.class_id = c.id
  LEFT JOIN materials m ON m.subject_teacher_assignment_id = sta.id
`;

export function listTeacherContexts(database: Database, teacherId: number): TeacherContextSummary[] {
  const rows = queryRows<ContextRow>(
    database,
    `${contextSelect}
      WHERE sta.teacher_id = ?
      GROUP BY sta.id
      ORDER BY ap.school_year DESC, ap.semester DESC, c.grade_level, c.name, sub.name`,
    [teacherId]
  );
  return rows.map(toTeacherContextSummary);
}

export function findTeacherContext(
  database: Database,
  teacherId: number,
  contextId: number
): TeacherContextDetails | null {
  const contextRow = queryRows<ContextRow>(
    database,
    `${contextSelect}
      WHERE sta.teacher_id = ? AND sta.id = ?
      GROUP BY sta.id`,
    [teacherId, contextId]
  )[0];

  if (!contextRow) return null;

  const context = toTeacherContextSummary(contextRow);
  const students = queryRows<TeacherStudent>(
    database,
    `SELECT s.id, s.name, s.nis FROM students s WHERE s.class_id = ? ORDER BY s.name`,
    [context.class.id]
  ).map((student) => ({
    id: Number(student.id),
    name: String(student.name),
    nis: String(student.nis),
  }));
  const materials = queryRows<TeacherMaterial>(
    database,
    `
      SELECT m.id, m.title, m.description, m.content, m.created_at AS createdAt, m.updated_at AS updatedAt
      FROM materials m
      WHERE m.subject_teacher_assignment_id = ?
      ORDER BY m.id
    `,
    [context.id]
  ).map((material) => ({
    id: Number(material.id),
    title: String(material.title),
    description: material.description === null ? null : String(material.description),
    content: material.content === null ? null : String(material.content),
    createdAt: String(material.createdAt),
    updatedAt: String(material.updatedAt),
  }));

  return { ...context, students, materials };
}
