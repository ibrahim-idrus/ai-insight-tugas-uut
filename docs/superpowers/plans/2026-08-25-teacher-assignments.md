# Teacher Assignment Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add secure teacher assignment CRUD and draft/published/closed workflow backed by the existing SQLite schema.

**Architecture:** Extend the existing Hono teacher module with owner-scoped prepared SQL queries joined through `subject_teacher_assignments`, then add a focused React assignment client and pages under the existing teacher portal. Reuse the current session middleware, teacher context endpoint, React Router, CSS variables, and the reusable `TeacherBreadcrumbs` component from commit `0f12098`.

**Tech Stack:** TypeScript, Hono, sql.js, Node test runner, React 18, React Router 6, Vite, react-test-renderer.

**Spec:** `docs/superpowers/specs/2026-08-25-teacher-assignments-design.md`

## Global Constraints

- Use `subject_teacher_assignments` as the only assignment ownership/context relationship; do not add redundant teacher, class, or subject columns.
- Derive ownership only from `context.get("authUser").id`; ignore forged `teacher_id` or similar request fields.
- Use only assignment columns supported by the current schema: title, description, assignment type, start/due timestamps, and schema statuses.
- Validate submitted context IDs against the authenticated teacher on every create/update.
- Keep the transition order `draft -> published -> closed`; do not accept arbitrary client status changes.
- Reuse `requireRole(..., "teacher")`, the current session cookie, `{ error: string }` responses, current CORS, sidebar, and visual system.
- Do not add migrations, seed changes, dependencies, question builder, submission/results, grades aggregation, homeroom, attitude, or dashboard redesign.
- Run API tests, web tests, both builds, `git diff --check`, and restore `apps/web/tsconfig.tsbuildinfo` if generated changes are unrelated.

## File structure

Create:

- `apps/api/src/teacher/assignment-types.ts` — assignment response, input, status, and type interfaces.
- `apps/api/src/teacher/assignment-repository.ts` — owner-scoped assignment queries and mutations.
- `apps/api/src/teacher/assignment-routes.ts` — protected route registration, parsing, validation, and status handling.
- `apps/web/src/teacher/assignment-types.ts` — frontend assignment and form types.
- `apps/web/src/teacher/assignment-api.ts` — credentialed assignment/context client functions and typed errors.
- `apps/web/src/teacher/pages/TeacherAssignmentsPage.tsx` — assignment list and states.
- `apps/web/src/teacher/pages/TeacherAssignmentPage.tsx` — create, view, and edit modes.

Modify:

- `apps/api/src/app.ts` — register assignment routes.
- `apps/api/src/teacher.test.ts` — API ownership, CRUD, and transition tests.
- `apps/api/package.json` — include the assignment API test file if split out.
- `apps/web/src/App.tsx` — replace the teacher Assignments placeholder and add four assignment routes.
- `apps/web/src/teacher/teacher.test.tsx` — assignment page and client tests.
- `apps/web/src/styles.css` — focused assignment list/form/status styles using existing variables.
- `apps/web/package.json` — include any new focused web test file if created.

---

### Task 1: Define failing API contracts

**Files:**
- Modify: `apps/api/src/teacher.test.ts`
- Create: `apps/api/src/teacher/assignment.test.ts` only if the existing teacher suite becomes unwieldy

- [ ] Write tests for authenticated teacher list/read, foreign assignment 404, unauthenticated 401, student 403, invalid IDs, and create rejection for missing/foreign context.
- [ ] Write tests for create/read/update/delete using `quiz`, `task`, and `upload`, including a forged `teacher_id` that must not affect ownership.
- [ ] Write tests for `draft -> published -> closed`, invalid transitions, and mutation failures for foreign IDs.
- [ ] Run the focused API tests and verify they fail because assignment routes are not registered.

### Task 2: Implement owner-scoped assignment API

**Files:**
- Create: `apps/api/src/teacher/assignment-types.ts`
- Create: `apps/api/src/teacher/assignment-repository.ts`
- Create: `apps/api/src/teacher/assignment-routes.ts`
- Modify: `apps/api/src/app.ts`
- Test: `apps/api/src/teacher.test.ts`

- [ ] Define the exact response shape with assignment fields plus a safe context summary; keep `status` and `assignmentType` as schema values.
- [ ] Implement list/read SQL joins constrained by `sta.teacher_id = ?` and assignment ID where applicable.
- [ ] Implement create/update SQL using only supported columns and validate context ownership in SQL before insert/update.
- [ ] Implement delete and transition updates with owner and current-status predicates so foreign or invalid transitions cannot mutate rows.
- [ ] Parse positive integer IDs, reject malformed JSON and unsupported types/dates with 400, return 404 for missing/foreign resources, and call `persist()` after successful mutations.
- [ ] Run the API tests and API build; refactor only while green.

### Task 3: Define assignment client and list/form pages with failing web tests

**Files:**
- Create: `apps/web/src/teacher/assignment-types.ts`
- Create: `apps/web/src/teacher/assignment-api.ts`
- Create: `apps/web/src/teacher/pages/TeacherAssignmentsPage.tsx`
- Create: `apps/web/src/teacher/pages/TeacherAssignmentPage.tsx`
- Modify: `apps/web/src/teacher/teacher.test.tsx`

- [ ] Add tests for list loading, empty, error, and rendered context/status/type values.
- [ ] Add tests for create/edit/view route behavior, invalid IDs, not-found, loading, validation, successful navigation, transition/delete actions, and failed mutations.
- [ ] Implement typed client functions with `credentials: "include"`, no ownership fields, and assignment/context error mapping.
- [ ] Implement controlled forms using `/api/teacher/classes` for owned context options; map UI labels to `quiz`, `task`, and `upload` without inventing persistence fields.
- [ ] Use `TeacherBreadcrumbs` on all assignment pages and preserve the current portal layout.
- [ ] Run focused web tests and web build; refactor only while green.

### Task 4: Register routes and finish states/styles

**Files:**
- Modify: `apps/web/src/App.tsx`
- Modify: `apps/web/src/styles.css`
- Modify: `apps/web/src/teacher/teacher.test.tsx`

- [ ] Register list, explicit `new`, view, and edit routes under the protected teacher layout, with `new` before numeric parameter routes.
- [ ] Add status badges, action layout, form controls, responsive tables/cards, and visible loading/empty/error/not-found/mutation states using existing CSS variables.
- [ ] Confirm the existing Classes/material routes and breadcrumb tests remain unchanged and green.

### Task 5: Verify, review, and hand off isolated worktree

**Files:**
- Modify only tests or implementation files needed by evidence from prior tasks.

- [ ] Run `npm test --workspace apps/api` and `npm test --workspace apps/web`.
- [ ] Run `npm run build --workspaces --if-present` and `git diff --check`.
- [ ] Restore only generated `apps/web/tsconfig.tsbuildinfo` changes caused by builds.
- [ ] Run a seeded local HTTP check for teacher login, list/create/view/publish/close, and a foreign teacher direct-ID request when the local servers are available.
- [ ] Request a focused code review against base `0f12098`, address all critical/important findings, and re-run verification.
- [ ] Report commits, evidence, review outcome, and the assignment worktree path without merging, pushing, or deploying.
