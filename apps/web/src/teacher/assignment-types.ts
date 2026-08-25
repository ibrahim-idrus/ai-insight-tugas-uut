export type AssignmentType = "quiz" | "task" | "upload";
export type AssignmentStatus = "draft" | "published" | "closed";

export interface TeacherAssignmentContext {
  id: number;
  class: { id: number; name: string; gradeLevel: number };
  subject: { id: number; name: string; code: string };
  academicPeriod: { id: number; schoolYear: string; semester: number };
}

export interface TeacherAssignment {
  id: number;
  subjectTeacherAssignmentId: number;
  title: string;
  description: string | null;
  assignmentType: AssignmentType;
  startAt: string | null;
  dueAt: string | null;
  status: AssignmentStatus;
  createdAt: string;
  updatedAt: string;
  context: TeacherAssignmentContext;
}

export interface AssignmentFormInput {
  subjectTeacherAssignmentId: number | null;
  title: string;
  description: string;
  assignmentType: AssignmentType;
  startAt: string;
  dueAt: string;
}
