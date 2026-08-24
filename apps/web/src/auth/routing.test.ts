import assert from "node:assert/strict";
import test from "node:test";
import { guardDestination } from "./routing";
import type { AuthenticatedUser } from "./types";

const teacher: AuthenticatedUser = { id: 2, name: "Arsito Guru", role: "teacher" };
const headmaster: AuthenticatedUser = { id: 1, name: "Baim Kepala Sekolah", role: "headmaster" };
const student: AuthenticatedUser = {
  id: 3,
  name: "Ahmad Rizki Pratama",
  role: "student",
  student_id: 1,
  class_id: 1,
};

test("redirects unauthenticated visitors to login", () => {
  assert.equal(guardDestination("/teacher/dashboard", null), "/login");
});

test("allows a user to access their own role namespace", () => {
  assert.equal(guardDestination("/teacher/classes", teacher), null);
  assert.equal(guardDestination("/headmaster/classes", headmaster), null);
  assert.equal(guardDestination("/student/classes", student), null);
});

test("redirects a user away from another role namespace", () => {
  assert.equal(guardDestination("/student/classes", teacher), "/teacher/dashboard");
  assert.equal(guardDestination("/teacher/classes", student), "/student/dashboard");
  assert.equal(guardDestination("/teacher/classes", headmaster), "/headmaster/dashboard");
});
