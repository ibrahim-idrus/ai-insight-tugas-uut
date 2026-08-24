import type { AuthenticatedUser, Role } from "./types";

const DASHBOARDS: Record<Role, string> = {
  teacher: "/teacher/dashboard",
  headmaster: "/headmaster/dashboard",
  student: "/student/dashboard",
};

export function dashboardForRole(role: Role): string {
  return DASHBOARDS[role];
}

export function routeRole(pathname: string): Role | null {
  const firstSegment = pathname.split("/").filter(Boolean)[0];
  return firstSegment === "teacher" || firstSegment === "headmaster" || firstSegment === "student"
    ? firstSegment
    : null;
}

export function guardDestination(pathname: string, user: AuthenticatedUser | null): string | null {
  if (!user) return "/login";

  const requiredRole = routeRole(pathname);
  if (!requiredRole || requiredRole === user.role) return null;

  return dashboardForRole(user.role);
}
