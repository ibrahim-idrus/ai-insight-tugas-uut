import type { Database } from "sql.js";
import { findTeacherAssignment } from "./assignment-repository.js";
import type { TeacherAssignment } from "./assignment-types.js";

export const QUESTION_TYPES = ["multiple_choice", "true_false", "short_answer", "essay"] as const;
export type QuestionType = (typeof QUESTION_TYPES)[number];

export interface TeacherQuizQuestion {
  id: number;
  questionText: string;
  questionType: QuestionType;
  points: number;
  questionOrder: number;
  answerKey: string | null;
}

export interface TeacherQuiz {
  assignment: TeacherAssignment;
  questions: TeacherQuizQuestion[];
  totalPoints: number;
}

export interface QuizQuestionInput {
  questionText: string;
  questionType: QuestionType;
  points: number;
  answerKey: string | null;
}

export type DeleteTeacherQuizQuestionResult = "deleted" | "not_found" | "has_submissions";

interface QuestionRow {
  id: number;
  question_text: string;
  question_type: string;
  points: number;
  question_order: number;
  answer_key: string | null;
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

function toQuestion(row: QuestionRow): TeacherQuizQuestion {
  return {
    id: Number(row.id),
    questionText: String(row.question_text),
    questionType: row.question_type as QuestionType,
    points: Number(row.points),
    questionOrder: Number(row.question_order),
    answerKey: row.answer_key === null ? null : String(row.answer_key),
  };
}

function selectQuestion(database: Database, teacherId: number, assignmentId: number, questionId: number): TeacherQuizQuestion | null {
  const row = queryRows<QuestionRow>(
    database,
    `
      SELECT aq.id, aq.question_text, aq.question_type, aq.points, aq.question_order, aq.answer_key
      FROM assignment_questions aq
      JOIN assignments a ON a.id = aq.assignment_id
      JOIN subject_teacher_assignments sta ON sta.id = a.subject_teacher_assignment_id
      WHERE aq.id = ? AND aq.assignment_id = ? AND sta.teacher_id = ? AND a.assignment_type = 'quiz'
    `,
    [questionId, assignmentId, teacherId]
  )[0];
  return row ? toQuestion(row) : null;
}

export function findTeacherQuiz(database: Database, teacherId: number, assignmentId: number): TeacherQuiz | null {
  const assignment = findTeacherAssignment(database, teacherId, assignmentId);
  if (!assignment || assignment.assignmentType !== "quiz") return null;

  const questions = queryRows<QuestionRow>(
    database,
    `
      SELECT id, question_text, question_type, points, question_order, answer_key
      FROM assignment_questions
      WHERE assignment_id = ?
      ORDER BY question_order ASC, id ASC
    `,
    [assignmentId]
  ).map(toQuestion);

  return {
    assignment,
    questions,
    totalPoints: questions.reduce((total, question) => total + question.points, 0),
  };
}

export function createTeacherQuizQuestion(
  database: Database,
  teacherId: number,
  assignmentId: number,
  input: QuizQuestionInput
): TeacherQuizQuestion | null {
  if (!findTeacherQuiz(database, teacherId, assignmentId)) return null;

  database.run(
    `
      INSERT INTO assignment_questions
        (assignment_id, question_text, question_type, points, question_order, answer_key)
      VALUES (?, ?, ?, ?, COALESCE((SELECT MAX(question_order) + 1 FROM assignment_questions WHERE assignment_id = ?), 1), ?)
    `,
    [assignmentId, input.questionText, input.questionType, input.points, assignmentId, input.answerKey]
  );

  const id = queryRows<{ id: number }>(database, "SELECT last_insert_rowid() AS id", [])[0]?.id;
  return id === undefined ? null : selectQuestion(database, teacherId, assignmentId, Number(id));
}

export function updateTeacherQuizQuestion(
  database: Database,
  teacherId: number,
  assignmentId: number,
  questionId: number,
  input: QuizQuestionInput
): TeacherQuizQuestion | null {
  database.run(
    `
      UPDATE assignment_questions AS aq
      SET question_text = ?, question_type = ?, points = ?, answer_key = ?, updated_at = datetime('now')
      WHERE aq.id = ? AND aq.assignment_id = ?
        AND EXISTS (
          SELECT 1
          FROM assignments a
          JOIN subject_teacher_assignments sta ON sta.id = a.subject_teacher_assignment_id
          WHERE a.id = aq.assignment_id AND a.assignment_type = 'quiz' AND sta.teacher_id = ?
        )
    `,
    [input.questionText, input.questionType, input.points, input.answerKey, questionId, assignmentId, teacherId]
  );

  return database.getRowsModified() === 1
    ? selectQuestion(database, teacherId, assignmentId, questionId)
    : null;
}

export function deleteTeacherQuizQuestion(
  database: Database,
  teacherId: number,
  assignmentId: number,
  questionId: number
): DeleteTeacherQuizQuestionResult {
  if (!selectQuestion(database, teacherId, assignmentId, questionId)) return "not_found";

  const hasSubmissions = queryRows<{ id: number }>(
    database,
    "SELECT id FROM submission_answers WHERE question_id = ? LIMIT 1",
    [questionId]
  )[0];
  if (hasSubmissions) return "has_submissions";

  database.run(
    `
      DELETE FROM assignment_questions AS aq
      WHERE aq.id = ? AND aq.assignment_id = ?
        AND EXISTS (
          SELECT 1
          FROM assignments a
          JOIN subject_teacher_assignments sta ON sta.id = a.subject_teacher_assignment_id
          WHERE a.id = aq.assignment_id AND a.assignment_type = 'quiz' AND sta.teacher_id = ?
        )
    `,
      [questionId, assignmentId, teacherId]
  );
  return database.getRowsModified() === 1 ? "deleted" : "not_found";
}

export function reorderTeacherQuizQuestions(
  database: Database,
  teacherId: number,
  assignmentId: number,
  questionIds: number[]
): TeacherQuiz | null {
  const quiz = findTeacherQuiz(database, teacherId, assignmentId);
  if (!quiz) return null;

  const currentIds = quiz.questions.map((question) => question.id);
  if (
    currentIds.length !== questionIds.length ||
    new Set(currentIds).size !== new Set(questionIds).size ||
    currentIds.some((id) => !questionIds.includes(id))
  ) {
    return null;
  }

  questionIds.forEach((questionId, index) => {
    database.run(
      `
        UPDATE assignment_questions AS aq
        SET question_order = ?, updated_at = datetime('now')
        WHERE aq.id = ? AND aq.assignment_id = ?
          AND EXISTS (
            SELECT 1
            FROM assignments a
            JOIN subject_teacher_assignments sta ON sta.id = a.subject_teacher_assignment_id
            WHERE a.id = aq.assignment_id AND a.assignment_type = 'quiz' AND sta.teacher_id = ?
          )
      `,
      [index + 1, questionId, assignmentId, teacherId]
    );
  });

  return findTeacherQuiz(database, teacherId, assignmentId);
}
