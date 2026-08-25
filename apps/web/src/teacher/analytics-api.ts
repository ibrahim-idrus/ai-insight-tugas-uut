import { apiUrl } from "../auth/api";
import { TeacherApiError } from "./api";
import type { TeacherAssignment } from "./assignment-types";
import type { TeacherContextSummary } from "./types";

export interface TeacherDashboard {
  contexts: TeacherContextSummary[];
  assignments: { total: number; draft: number; published: number; closed: number };
  submissions: { total: number; inProgress: number; submitted: number; graded: number };
  recentAssignments: Array<{
    id: number;
    title: string;
    assignmentType: string;
    status: string;
    className: string;
    subjectName: string;
    dueAt: string | null;
  }>;
  performance: { averageScore: number | null; gradedSubmissionCount: number };
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

export interface TeacherGradesResponse {
  contexts: TeacherContextSummary[];
  grades: TeacherGradeRow[];
}

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
  score: "A" | "B" | "C" | "D";
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TeacherHomeroomDetail {
  homeroom: TeacherHomeroomSummary;
  students: Array<{ id: number; name: string; nis: string; attitude: TeacherAttitude | null }>;
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

export async function getTeacherDashboard(): Promise<TeacherDashboard> {
  return (await request<TeacherDashboard>("/api/teacher/dashboard"))!;
}

export async function getTeacherAssignmentResults(assignmentId: number): Promise<TeacherAssignmentResults> {
  return (await request<TeacherAssignmentResults>(`/api/teacher/assignments/${assignmentId}/results`))!;
}

export interface TeacherGradeFilters {
  contextId: number | null;
  assignmentType: string;
  search: string;
}

export async function getTeacherGrades(filters: TeacherGradeFilters = { contextId: null, assignmentType: "", search: "" }): Promise<TeacherGradesResponse> {
  const query = new URLSearchParams();
  if (filters.contextId) query.set("context_id", String(filters.contextId));
  if (filters.assignmentType) query.set("assignment_type", filters.assignmentType);
  if (filters.search.trim()) query.set("search", filters.search.trim());
  const suffix = query.toString() ? `?${query.toString()}` : "";
  return (await request<TeacherGradesResponse>(`/api/teacher/grades${suffix}`))!;
}

export async function listTeacherHomerooms(): Promise<TeacherHomeroomSummary[]> {
  const response = await request<{ homerooms: TeacherHomeroomSummary[] }>("/api/teacher/homeroom");
  return response?.homerooms ?? [];
}

export async function getTeacherHomeroom(homeroomId: number): Promise<TeacherHomeroomDetail> {
  return (await request<TeacherHomeroomDetail>(`/api/teacher/homeroom/${homeroomId}`))!;
}

export async function saveTeacherAttitude(
  homeroomId: number,
  studentId: number,
  score: TeacherAttitude["score"],
  description: string
): Promise<TeacherAttitude> {
  return (await request<TeacherAttitude>(`/api/teacher/homeroom/${homeroomId}/students/${studentId}/attitude`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ score, description: description.trim() || null }),
  }))!;
}
