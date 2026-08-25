import type { Context, Hono } from "hono";
import type { Database } from "sql.js";
import { requireRole, type AuthEnv } from "../auth/middleware.js";
import type { SessionStore } from "../auth/session-store.js";
import {
  createTeacherQuizQuestion,
  deleteTeacherQuizQuestion,
  findTeacherQuiz,
  QUESTION_TYPES,
  reorderTeacherQuizQuestions,
  updateTeacherQuizQuestion,
  type QuizQuestionInput,
  type QuestionType,
} from "./quiz-repository.js";

function parseId(value: string): number | null {
  if (!/^\d+$/.test(value)) return null;
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

function isQuestionType(value: unknown): value is QuestionType {
  return typeof value === "string" && QUESTION_TYPES.includes(value as QuestionType);
}

function parseQuestionInput(raw: unknown, defaults: Partial<QuizQuestionInput> = {}): { input: QuizQuestionInput } | { error: string } {
  if (!raw || Array.isArray(raw) || typeof raw !== "object") return { error: "Invalid question input" };
  const body = raw as Record<string, unknown>;
  const questionText = body.questionText === undefined ? defaults.questionText : body.questionText;
  if (typeof questionText !== "string" || !questionText.trim()) return { error: "Question text is required" };

  const questionType = body.questionType === undefined ? defaults.questionType : body.questionType;
  if (!isQuestionType(questionType)) return { error: "Question type is invalid" };

  const points = body.points === undefined ? defaults.points : body.points;
  if (typeof points !== "number" || !Number.isSafeInteger(points) || points < 0) {
    return { error: "Points must be a non-negative integer" };
  }

  const answerKey = body.answerKey === undefined ? defaults.answerKey ?? null : body.answerKey;
  if (answerKey !== null && typeof answerKey !== "string") return { error: "Answer key is invalid" };

  return {
    input: {
      questionText: questionText.trim(),
      questionType,
      points,
      answerKey: typeof answerKey === "string" && answerKey.trim() ? answerKey.trim() : null,
    },
  };
}

function quizNotFound(context: Context<AuthEnv>) {
  return context.json({ error: "Quiz not found" }, 404);
}

export function registerTeacherQuizRoutes(
  app: Hono<AuthEnv>,
  database: Database,
  sessions: SessionStore,
  persist: () => void
): void {
  const teacher = requireRole(database, sessions, "teacher");

  app.get("/api/teacher/assignments/:assignmentId/quiz", teacher, (context) => {
    const assignmentId = parseId(context.req.param("assignmentId"));
    if (!assignmentId) return context.json({ error: "Invalid assignment ID" }, 400);

    const quiz = findTeacherQuiz(database, context.get("authUser").id, assignmentId);
    return quiz ? context.json(quiz) : quizNotFound(context);
  });

  app.post("/api/teacher/assignments/:assignmentId/quiz/questions", teacher, async (context) => {
    const assignmentId = parseId(context.req.param("assignmentId"));
    if (!assignmentId) return context.json({ error: "Invalid assignment ID" }, 400);

    let raw: unknown;
    try {
      raw = await context.req.json();
    } catch {
      return context.json({ error: "Invalid question input" }, 400);
    }
    const parsed = parseQuestionInput(raw);
    if ("error" in parsed) return context.json({ error: parsed.error }, 400);

    const question = createTeacherQuizQuestion(database, context.get("authUser").id, assignmentId, parsed.input);
    if (!question) return quizNotFound(context);
    persist();
    return context.json(question, 201);
  });

  app.patch("/api/teacher/assignments/:assignmentId/quiz/questions/:questionId", teacher, async (context) => {
    const assignmentId = parseId(context.req.param("assignmentId"));
    const questionId = parseId(context.req.param("questionId"));
    if (!assignmentId) return context.json({ error: "Invalid assignment ID" }, 400);
    if (!questionId) return context.json({ error: "Invalid question ID" }, 400);

    const quiz = findTeacherQuiz(database, context.get("authUser").id, assignmentId);
    const existing = quiz?.questions.find((question) => question.id === questionId);
    if (!existing) return context.json({ error: "Question not found" }, 404);

    let raw: unknown;
    try {
      raw = await context.req.json();
    } catch {
      return context.json({ error: "Invalid question input" }, 400);
    }
    const parsed = parseQuestionInput(raw, existing);
    if ("error" in parsed) return context.json({ error: parsed.error }, 400);

    const question = updateTeacherQuizQuestion(
      database,
      context.get("authUser").id,
      assignmentId,
      questionId,
      parsed.input
    );
    if (!question) return context.json({ error: "Question not found" }, 404);
    persist();
    return context.json(question);
  });

  app.delete("/api/teacher/assignments/:assignmentId/quiz/questions/:questionId", teacher, (context) => {
    const assignmentId = parseId(context.req.param("assignmentId"));
    const questionId = parseId(context.req.param("questionId"));
    if (!assignmentId) return context.json({ error: "Invalid assignment ID" }, 400);
    if (!questionId) return context.json({ error: "Invalid question ID" }, 400);

    const deletion = deleteTeacherQuizQuestion(database, context.get("authUser").id, assignmentId, questionId);
    if (deletion === "not_found") return context.json({ error: "Question not found" }, 404);
    if (deletion === "has_submissions") {
      return context.json({ error: "Question has dependent submissions" }, 409);
    }
    persist();
    return context.body(null, 204);
  });

  app.post("/api/teacher/assignments/:assignmentId/quiz/reorder", teacher, async (context) => {
    const assignmentId = parseId(context.req.param("assignmentId"));
    if (!assignmentId) return context.json({ error: "Invalid assignment ID" }, 400);

    let raw: unknown;
    try {
      raw = await context.req.json();
    } catch {
      return context.json({ error: "Question order is required" }, 400);
    }
    const questionIds = raw && typeof raw === "object" && !Array.isArray(raw)
      ? (raw as Record<string, unknown>).questionIds
      : undefined;
    if (
      !Array.isArray(questionIds) ||
      !questionIds.every((id) => typeof id === "number" && Number.isSafeInteger(id) && id > 0)
    ) {
      return context.json({ error: "Question order is invalid" }, 400);
    }

    const quiz = reorderTeacherQuizQuestions(
      database,
      context.get("authUser").id,
      assignmentId,
      questionIds as number[]
    );
    if (!quiz) return context.json({ error: "Question order is invalid or quiz not found" }, 400);
    persist();
    return context.json(quiz);
  });
}
