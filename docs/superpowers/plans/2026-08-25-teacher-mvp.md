# Teacher MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete the remaining secure Teacher-side MVP workflows on top of the existing SQLite schema.

**Architecture:** Add focused Teacher repositories/routes for quiz questions, results/grades/dashboard analytics, and homeroom attitudes. Register them beside the existing Teacher routes and keep every query scoped to the authenticated teacher through existing ownership relationships. Add thin web API helpers and pages that follow current layout, breadcrumbs, and state conventions.

**Tech Stack:** Hono, sql.js/SQLite, TypeScript, React 18, React Router 6, Vite, Node test runner, React test renderer.

**Spec:** `docs/superpowers/specs/2026-08-25-teacher-mvp-design.md`

## Global Constraints

- Use the existing `requireRole`, session cookie, `{ error: string }` responses, and `TeacherBreadcrumbs`.
- Do not trust `teacher_id`, `owner_id`, or equivalent request fields.
- Do not add a migration or duplicate authentication/context columns.
- Do not modify Student or Headmaster behavior.
- Every new API behavior is covered by a failing test before production code.

---

### Task 1: Secure quiz builder API

**Files:**
- Create: `apps/api/src/teacher/quiz-repository.ts`
- Create: `apps/api/src/teacher/quiz-routes.ts`
- Modify: `apps/api/src/app.ts`
- Test: `apps/api/src/teacher.test.ts`

**Interfaces:**
- Produces quiz detail `{ assignment, questions, totalPoints }` and question CRUD/reorder endpoints.

- [ ] Write tests for owned quiz detail, foreign-teacher 404, question validation, CRUD, order changes, and dynamic total points.
- [ ] Run the focused API test and confirm it fails because routes are absent.
- [ ] Implement ownership queries, validation, CRUD, and reorder with `question_order`.
- [ ] Run the focused API test and then the API suite.

### Task 2: Assignment results and teacher grades API

**Files:**
- Create: `apps/api/src/teacher/analytics-repository.ts`
- Create: `apps/api/src/teacher/analytics-routes.ts`
- Modify: `apps/api/src/app.ts`
- Test: `apps/api/src/teacher.test.ts`

**Interfaces:**
- Produces assignment result roster and filtered grade rows with `averageScore`, `gradedCount`, `submissionCount`, and `maxScore`.

- [ ] Write tests for full roster results, not-started students, foreign assignment denial, filtered grades, and dynamic normalized averages.
- [ ] Run them red.
- [ ] Implement left-join result queries and teacher-scoped grade aggregation.
- [ ] Run them green and re-run all API tests.

### Task 3: Homeroom and attitude API

**Files:**
- Create: `apps/api/src/teacher/homeroom-repository.ts`
- Create: `apps/api/src/teacher/homeroom-routes.ts`
- Modify: `apps/api/src/app.ts`
- Test: `apps/api/src/teacher.test.ts`

**Interfaces:**
- Produces homeroom summaries/details and `PUT` attitude upsert restricted to teacher-owned homeroom/class/student.

- [ ] Write tests for owned homeroom roster, foreign homeroom denial, score validation, insert/update, and forged teacher input.
- [ ] Run them red.
- [ ] Implement strict homeroom-to-class-to-student authorization and attitude upsert.
- [ ] Run them green and re-run all API tests.

### Task 4: Teacher web pages and route integration

**Files:**
- Create: `apps/web/src/teacher/analytics-api.ts`
- Create: `apps/web/src/teacher/quiz-api.ts`
- Create: `apps/web/src/teacher/pages/TeacherDashboardPage.tsx`
- Create: `apps/web/src/teacher/pages/TeacherQuizPage.tsx`
- Create: `apps/web/src/teacher/pages/TeacherResultsPage.tsx`
- Create: `apps/web/src/teacher/pages/TeacherGradesPage.tsx`
- Create: `apps/web/src/teacher/pages/TeacherHomeroomPage.tsx`
- Modify: `apps/web/src/App.tsx`
- Modify: `apps/web/src/teacher/pages/TeacherAssignmentPage.tsx`
- Modify: `apps/web/src/styles.css`
- Test: `apps/web/src/teacher/teacher.test.tsx`

- [ ] Write focused web tests for new routes/pages, fetch contracts, dynamic quiz total, and visible loading/empty/error states.
- [ ] Run them red.
- [ ] Implement API helpers, pages, navigation links, and small shared styles.
- [ ] Run them green and re-run the web suite.

### Task 5: Full verification and handoff

- [ ] Run API tests, web tests, API build, web build, and `git diff --check`.
- [ ] Restore generated `apps/web/tsconfig.tsbuildinfo` if a build changes it.
- [ ] Review `git diff`, authorization coverage, and current branch/worktree state.
- [ ] Report routes, relationships, tests/build evidence, blockers, and the isolated branch/worktree without merging or pushing.
