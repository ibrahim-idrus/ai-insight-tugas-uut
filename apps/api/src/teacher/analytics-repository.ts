import type { Database } from "sql.js";
import { listTeacherAssignments } from "./assignment-repository.js";
import { listTeacherContexts } from "./repository.js";
import type { TeacherAssignment } from "./assignment-types.js";
import type { TeacherContextSummary } from "./types.js";

interface OwnedAssignmentRow {
  id: number;
  title: string;
  assignment_type: string;
  status: string;
  start_at: string | null;
  due_at: string | null;
  class_id: number;
  class_name: string;
  subject_id: number;
  subject_name: string;
  subject_code: string;
  academic_period_id: number;
  school_year: string;
  semester: number;
}

interface ResultStudentRow {
  id: number;
  name: string;
  nis: string;
  submission_id: number | null;
  submission_status: string | null;
  submitted_at: string | null;
  started_at: string | null;
  total_score: number | null;
}

export interface TeacherAssignmentResult {
  id: number;
  name: string;
  nis: string;
  status: string;
  submittedAt: string | null;
  startedAt: string | null;
  score: number | null;
  submissionId: number | null;
}

export interface TeacherAssignmentResults {
  assignment: TeacherAssignment;
  students: TeacherAssignmentResult[];
  totalPoints: number;
}

export interface TeacherGradeRow {
  studentId: number;
  studentName: string;
  nis: string;
  classId: number;
  className: string;
  averageScore: number | null;
  assignmentCount: number;
  submittedCount: number;
  gradedCount: number;
  assignmentTitles: string[];
}

export interface TeacherGradesResult {
  contexts: TeacherContextSummary[];
  grades: TeacherGradeRow[];
}

export interface TeacherDashboardResult {
  contexts: TeacherContextSummary[];
  assignments: {
    total: number;
    draft: number;
    published: number;
    closed: number;
  };
  submissions: {
    total: number;
    inProgress: number;
    submitted: number;
    graded: number;
  };
  recentAssignments: Array<{
    id: number;
    title: string;
    assignmentType: string;
    status: string;
    className: string;
    subjectName: string;
    dueAt: string | null;
  }>;
  performance: {
    averageScore: number | null;
    gradedSubmissionCount: number;
  };
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

function queryOne<T extends object>(database: Database, sql: string, parameters: unknown[]): T | null {
  return queryRows<T>(database, sql, parameters)[0] ?? null;
}

export function listTeacherAssignmentResults(
  database: Database,
  teacherId: number,
  assignmentId: number
): TeacherAssignmentResults | null {
  const assignment = listTeacherAssignments(database, teacherId).find((item) => item.id === assignmentId);
  if (!assignment) return null;

  const totalPoints = Number(
    queryOne<{ total_points: number | null }>(
      database,
      "SELECT COALESCE(SUM(points), 0) AS total_points FROM assignment_questions WHERE assignment_id = ?",
      [assignmentId]
    )?.total_points ?? 0
  );
  const students = queryRows<ResultStudentRow>(
    database,
    `
      SELECT
        s.id, s.name, s.nis,
        asub.id AS submission_id,
        asub.status AS submission_status,
        asub.submitted_at,
        asub.started_at,
        asub.total_score
      FROM students s
      LEFT JOIN assignment_submissions asub
        ON asub.assignment_id = ? AND asub.student_id = s.id
      WHERE s.class_id = ?
      ORDER BY s.name
    `,
    [assignmentId, assignment.context.class.id]
  ).map((student) => ({
    id: Number(student.id),
    name: String(student.name),
    nis: String(student.nis),
    status: student.submission_status === null ? "not_started" : String(student.submission_status),
    submittedAt: student.submitted_at === null ? null : String(student.submitted_at),
    startedAt: student.started_at === null ? null : String(student.started_at),
    score: student.total_score === null ? null : Number(student.total_score),
    submissionId: student.submission_id === null ? null : Number(student.submission_id),
  }));

  return { assignment, students, totalPoints };
}

export function listTeacherGrades(
  database: Database,
  teacherId: number,
  filters: {
    contextId?: number;
    classId?: number;
    subjectId?: number;
    academicPeriodId?: number;
    assignmentType?: string;
    search?: string;
  }
): TeacherGradesResult | null {
  if (filters.contextId !== undefined) {
    const context = queryOne<{ id: number }>(
      database,
      "SELECT id FROM subject_teacher_assignments WHERE id = ? AND teacher_id = ?",
      [filters.contextId, teacherId]
    );
    if (!context) return null;
  }

  const assignmentConditions = ["sta.teacher_id = ?", "a.status IN ('published', 'closed')"];
  const parameters: unknown[] = [teacherId];
  if (filters.contextId !== undefined) {
    assignmentConditions.push("sta.id = ?");
    parameters.push(filters.contextId);
  }
  if (filters.classId !== undefined) {
    assignmentConditions.push("sta.class_id = ?");
    parameters.push(filters.classId);
  }
  if (filters.subjectId !== undefined) {
    assignmentConditions.push("sta.subject_id = ?");
    parameters.push(filters.subjectId);
  }
  if (filters.academicPeriodId !== undefined) {
    assignmentConditions.push("sta.academic_period_id = ?");
    parameters.push(filters.academicPeriodId);
  }
  if (filters.assignmentType !== undefined) {
    assignmentConditions.push("a.assignment_type = ?");
    parameters.push(filters.assignmentType);
  }

  const search = filters.search?.trim() ?? "";
  const studentCondition = search ? "WHERE (os.name LIKE ? OR os.nis LIKE ?)" : "";
  if (search) {
    const term = `%${search}%`;
    parameters.push(term, term);
  }

  const rows = queryRows<{
    student_id: number;
    student_name: string;
    nis: string;
    class_id: number;
    class_name: string;
    average_score: number | null;
    assignment_count: number;
    submitted_count: number;
    graded_count: number;
    assignment_titles: string | null;
  }>(
    database,
    `
      WITH owned_assignments AS (
        SELECT
          a.id,
          a.title,
          sta.class_id,
          COALESCE(SUM(aq.points), 0) AS max_score
        FROM assignments a
        JOIN subject_teacher_assignments sta ON sta.id = a.subject_teacher_assignment_id
        LEFT JOIN assignment_questions aq ON aq.assignment_id = a.id
        WHERE ${assignmentConditions.join(" AND ")}
        GROUP BY a.id
      ),
      owned_students AS (
        SELECT DISTINCT s.id, s.name, s.nis, c.id AS class_id, c.name AS class_name
        FROM students s
        JOIN classes c ON c.id = s.class_id
        JOIN owned_assignments oa ON oa.class_id = s.class_id
      )
      SELECT
        os.id AS student_id,
        os.name AS student_name,
        os.nis,
        os.class_id,
        os.class_name,
        AVG(CASE
          WHEN asub.status = 'graded' AND asub.total_score IS NOT NULL AND oa.max_score > 0
          THEN asub.total_score * 100.0 / oa.max_score
        END) AS average_score,
        COUNT(DISTINCT oa.id) AS assignment_count,
        COUNT(DISTINCT CASE WHEN asub.status IN ('submitted', 'graded') THEN oa.id END) AS submitted_count,
        COUNT(DISTINCT CASE WHEN asub.status = 'graded' AND asub.total_score IS NOT NULL THEN oa.id END) AS graded_count,
        GROUP_CONCAT(DISTINCT oa.title) AS assignment_titles
      FROM owned_students os
      JOIN owned_assignments oa ON oa.class_id = os.class_id
      LEFT JOIN assignment_submissions asub
        ON asub.assignment_id = oa.id AND asub.student_id = os.id
      ${studentCondition}
      GROUP BY os.id
      ORDER BY os.class_name, os.name
    `,
    parameters
  ).map((row) => ({
    studentId: Number(row.student_id),
    studentName: String(row.student_name),
    nis: String(row.nis),
    classId: Number(row.class_id),
    className: String(row.class_name),
    averageScore: row.average_score === null ? null : Number(row.average_score),
    assignmentCount: Number(row.assignment_count),
    submittedCount: Number(row.submitted_count),
    gradedCount: Number(row.graded_count),
    assignmentTitles: row.assignment_titles ? String(row.assignment_titles).split(",") : [],
  }));

  return { contexts: listTeacherContexts(database, teacherId), grades: rows };
}

export function getTeacherDashboard(database: Database, teacherId: number): TeacherDashboardResult {
  const contexts = listTeacherContexts(database, teacherId);
  const assignmentSummary = queryOne<{
    total: number;
    draft: number;
    published: number;
    closed: number;
  }>(
    database,
    `
      SELECT
        COUNT(*) AS total,
        SUM(CASE WHEN a.status = 'draft' THEN 1 ELSE 0 END) AS draft,
        SUM(CASE WHEN a.status = 'published' THEN 1 ELSE 0 END) AS published,
        SUM(CASE WHEN a.status = 'closed' THEN 1 ELSE 0 END) AS closed
      FROM assignments a
      JOIN subject_teacher_assignments sta ON sta.id = a.subject_teacher_assignment_id
      WHERE sta.teacher_id = ?
    `,
    [teacherId]
  );
  const submissionSummary = queryOne<{
    total: number;
    in_progress: number;
    submitted: number;
    graded: number;
  }>(
    database,
    `
      SELECT
        COUNT(asub.id) AS total,
        SUM(CASE WHEN asub.status = 'in_progress' THEN 1 ELSE 0 END) AS in_progress,
        SUM(CASE WHEN asub.status = 'submitted' THEN 1 ELSE 0 END) AS submitted,
        SUM(CASE WHEN asub.status = 'graded' THEN 1 ELSE 0 END) AS graded
      FROM assignment_submissions asub
      JOIN assignments a ON a.id = asub.assignment_id
      JOIN subject_teacher_assignments sta ON sta.id = a.subject_teacher_assignment_id
      WHERE sta.teacher_id = ?
    `,
    [teacherId]
  );
  const recentAssignments = queryRows<OwnedAssignmentRow>(
    database,
    `
      SELECT
        a.id, a.title, a.assignment_type, a.status, a.start_at, a.due_at,
        c.id AS class_id, c.name AS class_name,
        sub.id AS subject_id, sub.name AS subject_name, sub.code AS subject_code,
        ap.id AS academic_period_id, ap.school_year, ap.semester
      FROM assignments a
      JOIN subject_teacher_assignments sta ON sta.id = a.subject_teacher_assignment_id
      JOIN classes c ON c.id = sta.class_id
      JOIN subjects sub ON sub.id = sta.subject_id
      JOIN academic_periods ap ON ap.id = sta.academic_period_id
      WHERE sta.teacher_id = ?
      ORDER BY a.created_at DESC, a.id DESC
      LIMIT 6
    `,
    [teacherId]
  ).map((row) => ({
    id: Number(row.id),
    title: String(row.title),
    assignmentType: String(row.assignment_type),
    status: String(row.status),
    className: String(row.class_name),
    subjectName: String(row.subject_name),
    dueAt: row.due_at === null ? null : String(row.due_at),
  }));
  const performance = queryOne<{ average_score: number | null; graded_submission_count: number }>(
    database,
    `
      SELECT
        AVG(CASE
          WHEN asub.status = 'graded' AND asub.total_score IS NOT NULL AND totals.max_score > 0
          THEN asub.total_score * 100.0 / totals.max_score
        END) AS average_score,
        COUNT(CASE WHEN asub.status = 'graded' AND asub.total_score IS NOT NULL THEN 1 END) AS graded_submission_count
      FROM assignment_submissions asub
      JOIN assignments a ON a.id = asub.assignment_id
      JOIN subject_teacher_assignments sta ON sta.id = a.subject_teacher_assignment_id
      LEFT JOIN (
        SELECT assignment_id, SUM(points) AS max_score
        FROM assignment_questions
        GROUP BY assignment_id
      ) totals ON totals.assignment_id = a.id
      WHERE sta.teacher_id = ?
    `,
    [teacherId]
  );

  return {
    contexts,
    assignments: {
      total: Number(assignmentSummary?.total ?? 0),
      draft: Number(assignmentSummary?.draft ?? 0),
      published: Number(assignmentSummary?.published ?? 0),
      closed: Number(assignmentSummary?.closed ?? 0),
    },
    submissions: {
      total: Number(submissionSummary?.total ?? 0),
      inProgress: Number(submissionSummary?.in_progress ?? 0),
      submitted: Number(submissionSummary?.submitted ?? 0),
      graded: Number(submissionSummary?.graded ?? 0),
    },
    recentAssignments,
    performance: {
      averageScore: performance?.average_score === null || performance?.average_score === undefined
        ? null
        : Number(performance.average_score),
      gradedSubmissionCount: Number(performance?.graded_submission_count ?? 0),
    },
  };
}
