import { apiUrl } from "../auth/api";
import { TeacherApiError } from "./api";
import type { TeacherAssignment } from "./assignment-types";

export type QuizQuestionType = "multiple_choice" | "true_false" | "short_answer" | "essay";

export interface TeacherQuizQuestion {
  id: number;
  questionText: string;
  questionType: QuizQuestionType;
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
  questionType: QuizQuestionType;
  points: number;
  answerKey: string | null;
}

async function request<T>(path: string, init?: RequestInit): Promise<T | undefined> {
  const response = await fetch(apiUrl(path), { credentials: "include", ...init });
  if (response.status === 204) return undefined;
  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { error?: unknown };
    throw new TeacherApiError(response.status, typeof body.error === "string" ? body.error : "Request failed");
  }
  return (await response.json()) as T;
}

function questionBody(input: QuizQuestionInput): string {
  return JSON.stringify({
    questionText: input.questionText,
    questionType: input.questionType,
    points: input.points,
    answerKey: input.answerKey || null,
  });
}

export async function getTeacherQuiz(assignmentId: number): Promise<TeacherQuiz> {
  return (await request<TeacherQuiz>(`/api/teacher/assignments/${assignmentId}/quiz`))!;
}

export async function createTeacherQuizQuestion(assignmentId: number, input: QuizQuestionInput): Promise<TeacherQuizQuestion> {
  return (await request<TeacherQuizQuestion>(`/api/teacher/assignments/${assignmentId}/quiz/questions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: questionBody(input),
  }))!;
}

export async function updateTeacherQuizQuestion(
  assignmentId: number,
  questionId: number,
  input: QuizQuestionInput
): Promise<TeacherQuizQuestion> {
  return (await request<TeacherQuizQuestion>(`/api/teacher/assignments/${assignmentId}/quiz/questions/${questionId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: questionBody(input),
  }))!;
}

export async function deleteTeacherQuizQuestion(assignmentId: number, questionId: number): Promise<void> {
  await request<void>(`/api/teacher/assignments/${assignmentId}/quiz/questions/${questionId}`, { method: "DELETE" });
}

export async function reorderTeacherQuizQuestions(assignmentId: number, questionIds: number[]): Promise<TeacherQuiz> {
  return (await request<TeacherQuiz>(`/api/teacher/assignments/${assignmentId}/quiz/reorder`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ questionIds }),
  }))!;
}
