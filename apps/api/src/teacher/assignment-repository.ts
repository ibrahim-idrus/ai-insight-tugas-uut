import type { Database } from "sql.js";
import type {
  AssignmentInput,
  AssignmentStatus,
  TeacherAssignment,
  TeacherAssignmentContext,
} from "./assignment-types.js";

interface AssignmentRow {
  id: number;
  subject_teacher_assignment_id: number;
  title: string;
  description: string | null;
  assignment_type: string;
  start_at: string | null;
  due_at: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  class_id: number;
  class_name: string;
  grade_level: number;
  subject_id: number;
  subject_name: string;
  subject_code: string;
  academic_period_id: number;
  school_year: string;
  semester: number;
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

const assignmentSelect = `
  SELECT
    a.id,
    a.subject_teacher_assignment_id,
    a.title,
    a.description,
    a.assignment_type,
    a.start_at,
    a.due_at,
    a.status,
    a.created_at,
    a.updated_at,
    c.id AS class_id,
    c.name AS class_name,
    c.grade_level,
    sub.id AS subject_id,
    sub.name AS subject_name,
    sub.code AS subject_code,
    ap.id AS academic_period_id,
    ap.school_year,
    ap.semester
  FROM assignments a
  JOIN subject_teacher_assignments sta ON sta.id = a.subject_teacher_assignment_id
  JOIN classes c ON c.id = sta.class_id
  JOIN subjects sub ON sub.id = sta.subject_id
  JOIN academic_periods ap ON ap.id = sta.academic_period_id
`;

function toTeacherAssignment(row: AssignmentRow): TeacherAssignment {
  return {
    id: Number(row.id),
    subjectTeacherAssignmentId: Number(row.subject_teacher_assignment_id),
    title: String(row.title),
    description: row.description === null ? null : String(row.description),
    assignmentType: row.assignment_type as TeacherAssignment["assignmentType"],
    startAt: row.start_at === null ? null : String(row.start_at),
    dueAt: row.due_at === null ? null : String(row.due_at),
    status: row.status as AssignmentStatus,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
    context: {
      id: Number(row.subject_teacher_assignment_id),
      class: { id: Number(row.class_id), name: String(row.class_name), gradeLevel: Number(row.grade_level) },
      subject: { id: Number(row.subject_id), name: String(row.subject_name), code: String(row.subject_code) },
      academicPeriod: {
        id: Number(row.academic_period_id),
        schoolYear: String(row.school_year),
        semester: Number(row.semester),
      },
    },
  };
}

function selectTeacherAssignment(database: Database, teacherId: number, assignmentId: number): TeacherAssignment | null {
  const row = queryRows<AssignmentRow>(
    database,
    `${assignmentSelect}
      WHERE a.id = ? AND sta.teacher_id = ?`,
    [assignmentId, teacherId]
  )[0];
  return row ? toTeacherAssignment(row) : null;
}

function teacherOwnsContext(database: Database, teacherId: number, contextId: number): boolean {
  return queryRows<{ id: number }>(
    database,
    "SELECT id FROM subject_teacher_assignments WHERE id = ? AND teacher_id = ?",
    [contextId, teacherId]
  ).length === 1;
}

export function listTeacherAssignments(database: Database, teacherId: number): TeacherAssignment[] {
  return queryRows<AssignmentRow>(
    database,
    `${assignmentSelect}
      WHERE sta.teacher_id = ?
      ORDER BY a.id`,
    [teacherId]
  ).map(toTeacherAssignment);
}

export function findTeacherAssignment(
  database: Database,
  teacherId: number,
  assignmentId: number
): TeacherAssignment | null {
  return selectTeacherAssignment(database, teacherId, assignmentId);
}

export function createTeacherAssignment(
  database: Database,
  teacherId: number,
  input: AssignmentInput
): TeacherAssignment | null {
  if (!teacherOwnsContext(database, teacherId, input.subjectTeacherAssignmentId)) return null;

  database.run(
    `
      INSERT INTO assignments
        (subject_teacher_assignment_id, title, description, assignment_type, start_at, due_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `,
    [input.subjectTeacherAssignmentId, input.title, input.description, input.assignmentType, input.startAt, input.dueAt]
  );
  const assignmentId = queryRows<{ id: number }>(database, "SELECT last_insert_rowid() AS id", [])[0]?.id;
  return assignmentId === undefined ? null : selectTeacherAssignment(database, teacherId, Number(assignmentId));
}

export function updateTeacherAssignment(
  database: Database,
  teacherId: number,
  assignmentId: number,
  input: AssignmentInput
): TeacherAssignment | null {
  if (!teacherOwnsContext(database, teacherId, input.subjectTeacherAssignmentId)) return null;

  database.run(
    `
      UPDATE assignments AS a
      SET subject_teacher_assignment_id = ?,
          title = ?,
          description = ?,
          assignment_type = ?,
          start_at = ?,
          due_at = ?,
          updated_at = datetime('now')
      WHERE a.id = ?
        AND EXISTS (
          SELECT 1
          FROM subject_teacher_assignments sta
          WHERE sta.id = a.subject_teacher_assignment_id
            AND sta.teacher_id = ?
        )
    `,
    [
      input.subjectTeacherAssignmentId,
      input.title,
      input.description,
      input.assignmentType,
      input.startAt,
      input.dueAt,
      assignmentId,
      teacherId,
    ]
  );
  return database.getRowsModified() === 1 ? selectTeacherAssignment(database, teacherId, assignmentId) : null;
}

export type DeleteTeacherAssignmentResult = "deleted" | "not_found" | "has_dependents";

export function deleteTeacherAssignment(
  database: Database,
  teacherId: number,
  assignmentId: number
): DeleteTeacherAssignmentResult {
  const owned = queryRows<{ id: number }>(
    database,
    `
      SELECT a.id
      FROM assignments a
      JOIN subject_teacher_assignments sta ON sta.id = a.subject_teacher_assignment_id
      WHERE a.id = ? AND sta.teacher_id = ?
    `,
    [assignmentId, teacherId]
  );
  if (owned.length === 0) return "not_found";

  const dependents = queryRows<{ id: number }>(
    database,
    `
      SELECT id FROM assignment_questions WHERE assignment_id = ?
      UNION ALL
      SELECT id FROM assignment_submissions WHERE assignment_id = ?
      LIMIT 1
    `,
    [assignmentId, assignmentId]
  );
  if (dependents.length > 0) return "has_dependents";

  database.run(
    `
      DELETE FROM assignments AS a
      WHERE a.id = ?
        AND EXISTS (
          SELECT 1
          FROM subject_teacher_assignments sta
          WHERE sta.id = a.subject_teacher_assignment_id
            AND sta.teacher_id = ?
        )
    `,
    [assignmentId, teacherId]
  );
  return database.getRowsModified() === 1 ? "deleted" : "not_found";
}

export function transitionTeacherAssignment(
  database: Database,
  teacherId: number,
  assignmentId: number,
  fromStatus: AssignmentStatus,
  toStatus: AssignmentStatus
): TeacherAssignment | null {
  database.run(
    `
      UPDATE assignments AS a
      SET status = ?, updated_at = datetime('now')
      WHERE a.id = ?
        AND a.status = ?
        AND EXISTS (
          SELECT 1
          FROM subject_teacher_assignments sta
          WHERE sta.id = a.subject_teacher_assignment_id
            AND sta.teacher_id = ?
        )
    `,
    [toStatus, assignmentId, fromStatus, teacherId]
  );
  return database.getRowsModified() === 1 ? selectTeacherAssignment(database, teacherId, assignmentId) : null;
}
