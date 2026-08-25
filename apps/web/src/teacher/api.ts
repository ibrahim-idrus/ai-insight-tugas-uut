import { apiUrl } from "../auth/api";
import type { MaterialFormInput, TeacherContextDetails, TeacherContextSummary, TeacherMaterial } from "./types";

export class TeacherApiError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
    this.name = "TeacherApiError";
  }
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

function materialBody(input: MaterialFormInput): string {
  return JSON.stringify({
    title: input.title,
    description: input.description,
    content: input.content,
  });
}

export async function listTeacherClasses(): Promise<TeacherContextSummary[]> {
  const response = await request<{ contexts: TeacherContextSummary[] }>("/api/teacher/classes");
  return response?.contexts ?? [];
}

export async function getTeacherClass(contextId: number): Promise<TeacherContextDetails> {
  return (await request<TeacherContextDetails>(`/api/teacher/classes/${contextId}`))!;
}

export async function getTeacherMaterial(contextId: number, materialId: number): Promise<TeacherMaterial> {
  return (await request<TeacherMaterial>(`/api/teacher/classes/${contextId}/materials/${materialId}`))!;
}

export async function createTeacherMaterial(
  contextId: number,
  input: MaterialFormInput
): Promise<TeacherMaterial> {
  return (await request<TeacherMaterial>(`/api/teacher/classes/${contextId}/materials`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: materialBody(input),
  }))!;
}

export async function updateTeacherMaterial(
  contextId: number,
  materialId: number,
  input: MaterialFormInput
): Promise<TeacherMaterial> {
  return (await request<TeacherMaterial>(`/api/teacher/classes/${contextId}/materials/${materialId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: materialBody(input),
  }))!;
}

export async function deleteTeacherMaterial(contextId: number, materialId: number): Promise<void> {
  await request<void>(`/api/teacher/classes/${contextId}/materials/${materialId}`, { method: "DELETE" });
}
