export const ASSIGNMENT_TYPES = ["quiz", "task", "upload"] as const;
export type AssignmentType = (typeof ASSIGNMENT_TYPES)[number];

export const ASSIGNMENT_STATUSES = ["draft", "published", "closed"] as const;
export type AssignmentStatus = (typeof ASSIGNMENT_STATUSES)[number];

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

export interface AssignmentInput {
  subjectTeacherAssignmentId: number;
  title: string;
  description: string | null;
  assignmentType: AssignmentType;
  startAt: string | null;
  dueAt: string | null;
}
