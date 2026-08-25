import { apiUrl } from "../auth/api";
import { listTeacherClasses, TeacherApiError } from "./api";
import type { TeacherContextSummary } from "./types";
import type { AssignmentFormInput, TeacherAssignment, TeacherAssignmentContext } from "./assignment-types";

async function request<T>(path: string, init?: RequestInit): Promise<T | undefined> {
  const response = await fetch(apiUrl(path), { credentials: "include", ...init });
  if (response.status === 204) return undefined;

  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { error?: unknown };
    throw new TeacherApiError(response.status, typeof body.error === "string" ? body.error : "Request failed");
  }

  return (await response.json()) as T;
}

function assignmentBody(input: AssignmentFormInput): string {
  return JSON.stringify({
    subjectTeacherAssignmentId: input.subjectTeacherAssignmentId,
    title: input.title,
    description: input.description || null,
    assignmentType: input.assignmentType,
    startAt: input.startAt || null,
    dueAt: input.dueAt || null,
  });
}

function toAssignmentContext(context: TeacherContextSummary): TeacherAssignmentContext {
  return {
    id: context.id,
    class: context.class,
    subject: context.subject,
    academicPeriod: context.academicPeriod,
  };
}

export async function listTeacherAssignments(): Promise<TeacherAssignment[]> {
  const response = await request<{ assignments: TeacherAssignment[] }>("/api/teacher/assignments");
  return response?.assignments ?? [];
}

export async function listTeacherAssignmentContexts(): Promise<TeacherAssignmentContext[]> {
  const contexts = await listTeacherClasses();
  return contexts.map(toAssignmentContext);
}

export async function getTeacherAssignment(assignmentId: number): Promise<TeacherAssignment> {
  return (await request<TeacherAssignment>(`/api/teacher/assignments/${assignmentId}`))!;
}

export async function createTeacherAssignment(input: AssignmentFormInput): Promise<TeacherAssignment> {
  return (await request<TeacherAssignment>("/api/teacher/assignments", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: assignmentBody(input),
  }))!;
}

export async function updateTeacherAssignment(assignmentId: number, input: AssignmentFormInput): Promise<TeacherAssignment> {
  return (await request<TeacherAssignment>(`/api/teacher/assignments/${assignmentId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: assignmentBody(input),
  }))!;
}

export async function deleteTeacherAssignment(assignmentId: number): Promise<void> {
  await request<void>(`/api/teacher/assignments/${assignmentId}`, { method: "DELETE" });
}

export async function publishTeacherAssignment(assignmentId: number): Promise<TeacherAssignment> {
  return (await request<TeacherAssignment>(`/api/teacher/assignments/${assignmentId}/publish`, { method: "POST" }))!;
}

export async function closeTeacherAssignment(assignmentId: number): Promise<TeacherAssignment> {
  return (await request<TeacherAssignment>(`/api/teacher/assignments/${assignmentId}/close`, { method: "POST" }))!;
}
