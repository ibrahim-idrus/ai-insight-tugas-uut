import type { TeacherAssignment } from "./assignment-types.js";

export interface TeacherContextSummary {
  id: number;
  class: { id: number; name: string; gradeLevel: number };
  subject: { id: number; name: string; code: string };
  academicPeriod: { id: number; schoolYear: string; semester: number };
  studentCount: number;
  materialCount: number;
}

export interface TeacherStudent { id: number; name: string; nis: string; }

export interface TeacherMaterial {
  id: number;
  title: string;
  description: string | null;
  content: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TeacherContextDetails extends TeacherContextSummary {
  students: TeacherStudent[];
  materials: TeacherMaterial[];
  assignments: TeacherAssignment[];
}

export interface MaterialInput {
  title: string;
  description: string | null;
  content: string | null;
}
