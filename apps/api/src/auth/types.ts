export const ROLES = ["headmaster", "teacher", "student"] as const;

export type Role = (typeof ROLES)[number];

export interface AuthenticatedUser {
  id: number;
  name: string;
  role: Role;
  student_id?: number;
  class_id?: number;
}

export interface SessionSubject {
  userId: number;
}
