# Teacher Classes, Students, and Materials Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the teacher Classes placeholder with secure teaching-context, student, and material workflows backed by the existing SQLite schema.

**Architecture:** Add a focused API teacher module with prepared SQL queries that always scope through the authenticated teacher, then add React pages and a small teacher API client under a dedicated frontend feature folder. The existing Hono authentication, unified users model, React Router, CSS system, and sql.js database remain in place.

**Tech Stack:** TypeScript, Hono, sql.js, Node test runner, React 18, React Router 6, Vite, react-test-renderer.

**Spec:** docs/superpowers/specs/2026-08-25-teacher-classes-materials-design.md

## Global Constraints

- Use subject_teacher_assignments as the existing teaching-context relationship; do not add or rename tables.
- Derive teacher ownership only from context.get("authUser").id; never trust teacher_id, owner_id, or user_id in request data.
- Reuse requireRole(..., "teacher"), the existing session cookie, { error: string } API errors, and current CORS behavior.
- Return only safe student fields (id, name, nis) and never serialize passwords, tokens, or secrets.
- Show all owned teaching contexts across academic periods, grouped and labeled by period.
- Do not add a sidebar item or a second UI library; preserve the current K-12 portal visual system.
- Do not add a database migration, seed-data change, dependency, or dashboard/assignment/grades/homeroom flow in this slice.
- Material input is limited to title, description, and content; a trimmed non-empty title is required.
- Return 404 for missing or foreign contexts/materials so ownership is not disclosed.
- Run API tests, web tests, both workspace builds, and git diff --check before claiming completion.

## File structure

Create:

- apps/api/src/teacher/types.ts — API-facing context, student, material, and input types.
- apps/api/src/teacher/repository.ts — prepared SQL queries and context/material persistence operations.
- apps/api/src/teacher/routes.ts — teacher route registration, input parsing, response mapping, and status handling.
- apps/api/src/teacher.test.ts — seeded SQLite fixture and teacher authorization/CRUD tests.
- apps/web/src/teacher/types.ts — frontend response and form types.
- apps/web/src/teacher/api.ts — credentialed teacher API client and typed API errors.
- apps/web/src/teacher/pages/TeacherClassesPage.tsx — grouped teaching-context list.
- apps/web/src/teacher/pages/TeacherContextPage.tsx — context summary, students, and materials list.
- apps/web/src/teacher/pages/TeacherMaterialPage.tsx — material view, create, and edit modes.
- apps/web/src/teacher/teacher.test.tsx — focused page rendering and mutation-client tests.

Modify:

- apps/api/src/app.ts — expose a persistence callback and register teacher routes.
- apps/api/src/index.ts — pass the production database persistence callback.
- apps/api/package.json — include the teacher API suite in the test script.
- apps/web/src/App.tsx — replace the teacher Classes placeholder and add context/material routes.
- apps/web/src/styles.css — add styles for context cards, tables, material panels, forms, and state messages.
- apps/web/package.json — include the teacher page suite in the test script.

---

### Task 1: Add failing API tests for teacher context reads

**Files:**
- Create: apps/api/src/teacher.test.ts
- Modify: apps/api/package.json

**Interfaces:**
- Consumes: existing createApp, MemorySessionStore, sql.js, database/migration.sql, and database/seed.sql.
- Produces: reusable setupTeacherApp, login, and contextIdFor test helpers and failing tests for the two context-read endpoints.

- [ ] **Step 1: Create the seeded teacher fixture.**

Implement setupTeacherApp() by loading the current migration and seed SQL into a fresh sql.js database, adding a second-period context with:

~~~sql
INSERT INTO subject_teacher_assignments
  (teacher_id, class_id, subject_id, academic_period_id)
VALUES (2, 1, 1, 2)
~~~

Return { app, database, sessions }. Implement login(app, username, password) by calling /api/auth/login and extracting the first set-cookie segment. Implement contextIdFor(database, teacherId, classId, subjectId, academicPeriodId) with a prepared SELECT id query.

- [ ] **Step 2: Write the context list contract before adding routes.**

Log in as adminarsito/admin123, request /api/teacher/classes, and assert 200, 11 contexts, a period-2 context, numeric IDs/counts, and no Alfian subjects. Assert the public response shape with:

~~~ts
assert.ok(body.contexts.every((context) => typeof context.id === "number"));
assert.ok(body.contexts.every((context) => typeof context.studentCount === "number"));
assert.ok(body.contexts.some((context) => context.academicPeriod.semester === 2));
assert.equal(body.contexts.some((context) => context.subject.name === "Bahasa Indonesia"), false);
~~~

- [ ] **Step 3: Write authorized and foreign detail tests.**

For Arsito's X-A/Matematika/period-1 context, assert GET /api/teacher/classes/:contextId returns the context summary, five students, and two materials. Assert each student has only id, name, and nis. Request Alfian's X-A/Bahasa Indonesia/period-1 context with Arsito's cookie and assert 404 with { error: "Teaching context not found" }.

- [ ] **Step 4: Register the test file.**

Change apps/api/package.json to:

~~~json
"test": "node --import tsx --test src/auth.test.ts src/teacher.test.ts"
~~~

- [ ] **Step 5: Run the new tests and verify the intended failure.**

Run npm test --workspace apps/api -- --test-name-pattern "teacher|context". The new tests must fail because the routes are not registered, while the existing authentication tests pass.

- [ ] **Step 6: Commit the test contract.**

~~~powershell
git add apps/api/src/teacher.test.ts apps/api/package.json
git commit -m "test: define teacher context access contract"
~~~

### Task 2: Implement teacher-owned context queries and read routes

**Files:**
- Create: apps/api/src/teacher/types.ts
- Create: apps/api/src/teacher/repository.ts
- Create: apps/api/src/teacher/routes.ts
- Modify: apps/api/src/app.ts
- Test: apps/api/src/teacher.test.ts

**Interfaces:**
- Consumes: Task 1 request tests, AuthenticatedUser, AuthEnv, SessionStore, and Database.
- Produces: registerTeacherRoutes(app, database, sessions, persist), listTeacherContexts(database, teacherId), and findTeacherContext(database, teacherId, contextId).

- [ ] **Step 1: Define the API response types.**

Create these exact interfaces in apps/api/src/teacher/types.ts:

~~~ts
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
}

export interface MaterialInput {
  title: string;
  description: string | null;
  content: string | null;
}
~~~

- [ ] **Step 2: Implement prepared context queries.**

Implement listTeacherContexts(database: Database, teacherId: number): TeacherContextSummary[] with joins from subject_teacher_assignments to classes, subjects, and academic_periods, LEFT JOIN counts for students/materials, WHERE sta.teacher_id = ?, GROUP BY sta.id, and ordering by period descending, grade, class name, and subject name.

Implement findTeacherContext(database: Database, teacherId: number, contextId: number): TeacherContextDetails | null by first applying the same owner filter to one context, then selecting students with WHERE s.class_id = ownedContext.class.id and materials with WHERE m.subject_teacher_assignment_id = ownedContext.id. Map snake-case columns to camel-case API fields and never select password columns.

- [ ] **Step 3: Register strict, protected read routes.**

Export:

~~~ts
export function registerTeacherRoutes(
  app: Hono<AuthEnv>,
  database: Database,
  sessions: SessionStore,
  persist: () => void
): void;
~~~

Register GET /api/teacher/classes and GET /api/teacher/classes/:contextId with requireRole(database, sessions, "teacher"). Parse IDs only when /^\\d+$/ matches and the value is greater than zero; otherwise return 400 with { error: "Invalid teaching context ID" }. Derive the owner from context.get("authUser").id; return { contexts } for the list and 404/{ error: "Teaching context not found" } for missing or foreign detail.

- [ ] **Step 4: Register the feature from createApp.**

Import registerTeacherRoutes in apps/api/src/app.ts and call it with the existing database and session store. Keep the existing teacher dashboard route and all other role routes unchanged.

- [ ] **Step 5: Run the context tests and API build.**

Run npm test --workspace apps/api and npm run build -w apps/api. All authentication and context tests must pass.

- [ ] **Step 6: Commit the read API.**

~~~powershell
git add apps/api/src/teacher apps/api/src/app.ts
git commit -m "feat: add teacher context read API"
~~~

### Task 3: Add secure material CRUD and production persistence

**Files:**
- Modify: apps/api/src/teacher/types.ts
- Modify: apps/api/src/teacher/repository.ts
- Modify: apps/api/src/teacher/routes.ts
- Modify: apps/api/src/app.ts
- Modify: apps/api/src/index.ts
- Modify: apps/api/src/teacher.test.ts

**Interfaces:**
- Consumes: findTeacherContext, the teacher role middleware, and the existing saveDb() function.
- Produces: findTeacherMaterial, createTeacherMaterial, updateTeacherMaterial, and deleteTeacherMaterial with owner-scoped queries.

- [ ] **Step 1: Write failing material CRUD and isolation tests.**

Test the full own-material flow:

~~~text
POST /api/teacher/classes/:ownContextId/materials          -> 201
GET /api/teacher/classes/:ownContextId/materials/:id       -> 200
PATCH /api/teacher/classes/:ownContextId/materials/:id     -> 200
DELETE /api/teacher/classes/:ownContextId/materials/:id    -> 204, then GET -> 404
~~~

Use { title: "New guide", description: "Intro", content: "Read this" }, then update with { title: "Updated guide", description: null, content: "Updated" }. Assert another teacher cannot create under a foreign context or view/edit/delete a foreign material. Assert { teacher_id: 3, title: "forged" } cannot change ownership. Assert missing/blank titles return 400/{ error: "Title is required" }, invalid IDs return 400, and a material paired with the wrong context returns 404.

- [ ] **Step 2: Run the focused material tests and verify they fail.**

Run npm test --workspace apps/api -- --test-name-pattern "material|ownership|title". The new tests must fail because material routes are not implemented.

- [ ] **Step 3: Implement owner-scoped repository functions.**

Use these signatures:

~~~ts
findTeacherMaterial(database: Database, teacherId: number, contextId: number, materialId: number): TeacherMaterial | null;
createTeacherMaterial(database: Database, teacherId: number, contextId: number, input: MaterialInput): TeacherMaterial | null;
updateTeacherMaterial(database: Database, teacherId: number, contextId: number, materialId: number, input: MaterialInput): TeacherMaterial | null;
deleteTeacherMaterial(database: Database, teacherId: number, contextId: number, materialId: number): boolean;
~~~

Every SQL statement must join materials m to subject_teacher_assignments sta and constrain both sta.id = ? and sta.teacher_id = ?. Creation first verifies the owned context, inserts only the four allowed material columns, and selects the inserted row through the same ownership join. Update/delete use affected-row counts to distinguish success from 404.

- [ ] **Step 4: Implement input parsing and mutation routes.**

Parse JSON objects only. Trim and require title; normalize omitted/blank description and content to null; reject non-string values; ignore unknown fields. Register POST, GET, PATCH, and DELETE under /api/teacher/classes/:contextId/materials. Use the session teacher ID for every repository call, return 201/200/204, and call persist() only after a successful insert/update/delete.

- [ ] **Step 5: Make persistence injectable.**

Change createApp to accept persist: () => void = () => {} as a third argument and pass it to registerTeacherRoutes. In apps/api/src/index.ts, use:

~~~ts
const app = createApp(database, undefined, () => saveDb());
~~~

Tests keep the no-op default and never write the repository database file.

- [ ] **Step 6: Run the complete API suite and commit.**

Run npm test --workspace apps/api and npm run build -w apps/api, then commit:

~~~powershell
git add apps/api/src/teacher apps/api/src/app.ts apps/api/src/index.ts apps/api/src/teacher.test.ts
git commit -m "feat: add teacher material management API"
~~~

### Task 4: Add the teacher API client and Classes page

**Files:**
- Create: apps/web/src/teacher/types.ts
- Create: apps/web/src/teacher/api.ts
- Create: apps/web/src/teacher/pages/TeacherClassesPage.tsx
- Create: apps/web/src/teacher/teacher.test.tsx
- Modify: apps/web/src/App.tsx
- Modify: apps/web/package.json

**Interfaces:**
- Consumes: context read endpoints, existing apiUrl, React Router, and current CSS classes.
- Produces: typed listTeacherClasses(), getTeacherClass(), material client functions, and TeacherClassesPage.

- [ ] **Step 1: Write a failing Classes page test.**

Mock /api/teacher/classes with one X-A/Matematika context and render TeacherClassesPage inside MemoryRouter. Await React act as in AuthContext.test.tsx, then assert the output contains X-A, Matematika, 2025/2026, 5 students, and 2 materials. Add an empty response test for No classes are assigned to you yet.

- [ ] **Step 2: Register the page test and verify failure.**

Add src/teacher/teacher.test.tsx to the apps/web test script and run npm test --workspace apps/web -- --test-name-pattern "Classes page|classes are assigned". The new test must fail because the feature files do not exist.

- [ ] **Step 3: Define types and the credentialed API client.**

Mirror the API contract in types.ts. In api.ts, define:

~~~ts
export class TeacherApiError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
    this.name = "TeacherApiError";
  }
}

export function listTeacherClasses(): Promise<TeacherContextSummary[]>;
export function getTeacherClass(contextId: number): Promise<TeacherContextDetails>;
export function getTeacherMaterial(contextId: number, materialId: number): Promise<TeacherMaterial>;
export function createTeacherMaterial(contextId: number, input: MaterialFormInput): Promise<TeacherMaterial>;
export function updateTeacherMaterial(contextId: number, materialId: number, input: MaterialFormInput): Promise<TeacherMaterial>;
export function deleteTeacherMaterial(contextId: number, materialId: number): Promise<void>;
~~~

Use fetch(apiUrl(path), { credentials: "include" }), parse { error } for non-2xx responses, return undefined for 204, and send only the three material fields for mutations.

- [ ] **Step 4: Implement the grouped Classes page.**

Load listTeacherClasses() in useEffect, track loading/error/data, group by academicPeriod.id, and render period headings with links to /teacher/classes/:contextId. Each card shows class, subject/code, student count, and material count. Include explicit loading, error, and empty states.

- [ ] **Step 5: Replace only the teacher Classes placeholder route.**

Import TeacherClassesPage in App.tsx and replace the teacher path="classes" placeholder. Leave all non-Classes placeholders unchanged.

- [ ] **Step 6: Run web tests/build and commit.**

Run npm test --workspace apps/web and npm run build -w apps/web, then commit:

~~~powershell
git add apps/web/src/teacher apps/web/src/App.tsx apps/web/package.json
git commit -m "feat: add teacher classes page"
~~~

### Task 5: Add context detail, students, and material list

**Files:**
- Create: apps/web/src/teacher/pages/TeacherContextPage.tsx
- Modify: apps/web/src/teacher/teacher.test.tsx
- Modify: apps/web/src/App.tsx

**Interfaces:**
- Consumes: getTeacherClass(contextId) and TeacherContextDetails.
- Produces: /teacher/classes/:contextId with student/material data and links to material routes.

- [ ] **Step 1: Add a failing detail-page test.**

Mock /api/teacher/classes/1 with a context summary, two students, and one material. Render at /teacher/classes/1 and assert the header, student names/NIS, and material title. Add a 404 response test that asserts a not-found/error message and a Classes link.

- [ ] **Step 2: Implement TeacherContextPage.**

Use useParams<{ contextId: string }>(), reject non-positive IDs before fetching, and load getTeacherClass(Number(contextId)). Render context metadata, a students table with only name/NIS, and a materials table with title, updated date, and view/edit actions. Link creation to /teacher/classes/:contextId/materials/new. Render No students are assigned to this class yet. and No materials have been created for this class yet. for empty arrays.

- [ ] **Step 3: Add the nested context route.**

Add TeacherContextPage under the existing teacher RoleLayout at path="classes/:contextId", inside ProtectedRoute role="teacher".

- [ ] **Step 4: Run web tests/build and commit.**

Run npm test --workspace apps/web and npm run build -w apps/web, then commit:

~~~powershell
git add apps/web/src/teacher/pages/TeacherContextPage.tsx apps/web/src/teacher/teacher.test.tsx apps/web/src/App.tsx
git commit -m "feat: add teacher context students view"
~~~

### Task 6: Add material view, create, edit, and delete screens

**Files:**
- Create: apps/web/src/teacher/pages/TeacherMaterialPage.tsx
- Modify: apps/web/src/teacher/api.ts
- Modify: apps/web/src/teacher/teacher.test.tsx
- Modify: apps/web/src/App.tsx

**Interfaces:**
- Consumes: all material client functions from Task 4.
- Produces: TeacherMaterialPage({ mode: "create" | "view" | "edit" }) and nested material routes.

- [ ] **Step 1: Add failing view/form tests.**

Test mode="view" with a mocked material response and assert title, description, content, and Edit link. Test mode="create" at /teacher/classes/1/materials/new and assert title/description/content fields and Save material.

- [ ] **Step 2: Implement the three material modes.**

In create mode initialize empty form state and skip GET. In view/edit mode load both route IDs with getTeacherMaterial. Use controlled fields, trim title on submission, disable pending actions, and show validation/API errors. View is read-only with an Edit link. Edit calls updateTeacherMaterial and navigates to the material view. Create calls createTeacherMaterial and navigates to the created material view. Delete requires window.confirm("Delete this material?"), calls deleteTeacherMaterial, and navigates to the context. A 404 shows a not-found message and a link to Classes.

- [ ] **Step 3: Register the protected material routes.**

Add:

~~~tsx
<Route element={<TeacherMaterialPage mode="create" />} path="classes/:contextId/materials/new" />
<Route element={<TeacherMaterialPage mode="edit" />} path="classes/:contextId/materials/:materialId/edit" />
<Route element={<TeacherMaterialPage mode="view" />} path="classes/:contextId/materials/:materialId" />
~~~

Keep explicit new and edit entries so they are not treated as numeric IDs.

- [ ] **Step 4: Add mutation-client assertions.**

Mock POST/PATCH/DELETE requests and assert credentials: "include", the expected JSON fields, and absence of teacher_id. Assert successful saves navigate to the material view and deletion navigates to the context.

- [ ] **Step 5: Run web tests/build and commit.**

Run npm test --workspace apps/web and npm run build -w apps/web, then commit:

~~~powershell
git add apps/web/src/teacher apps/web/src/App.tsx
git commit -m "feat: add teacher material screens"
~~~

### Task 7: Finish visual states and integration verification

**Files:**
- Modify: apps/web/src/styles.css
- Modify: apps/api/src/teacher.test.ts
- Modify: apps/web/src/teacher/teacher.test.tsx

**Interfaces:**
- Consumes: all endpoints and pages from Tasks 2–6.
- Produces: responsive styling and final evidence for the secure Classes/students/materials flow.

- [ ] **Step 1: Add styles using the existing design variables.**

Add styles for period groups, context cards, metadata rows, student/material tables, material forms, action links, empty states, error banners, and responsive stacking. Use --surface, --border, --indigo, --muted, and --shadow; do not alter the sidebar/navigation structure.

- [ ] **Step 2: Add missing state and role assertions.**

Extend API tests for unauthenticated requests returning 401 and student sessions returning 403. Extend page tests for loading and empty students/materials states.

- [ ] **Step 3: Run the complete verification suite.**

Run:

~~~powershell
npm test --workspace apps/api
npm test --workspace apps/web
npm run build --workspaces --if-present
git diff --check
~~~

All API and web tests must pass, both builds must succeed, and git diff --check must report no whitespace errors.

- [ ] **Step 4: Verify the seeded local flow manually.**

Run npm run dev:api and npm run dev:web. Log in as adminarsito/admin123, verify Arsito's contexts across periods, open X-A/Matematika, confirm only X-A students, and create/edit/view/delete a material. Log in as adminalfian/admin123, verify only Alfian contexts, and confirm a direct Arsito context/material URL does not expose data.

- [ ] **Step 5: Keep generated metadata out of the feature diff and inspect status.**

If apps/web/tsconfig.tsbuildinfo changes only because of a build, restore that exact generated file to its branch version. Review git status --short, git diff --stat HEAD~6..HEAD, and git log --oneline -8.

- [ ] **Step 6: Commit final styles and verification updates.**

~~~powershell
git add apps/web/src/styles.css apps/api/src/teacher.test.ts apps/web/src/teacher/teacher.test.tsx
git commit -m "test: verify teacher classes isolation flow"
~~~
