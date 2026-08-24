# Authentication + Role Access Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the LMS authentication vertical slice with one canonical `users` account table, synchronized student profiles, backend role authorization, refresh-safe frontend sessions, and themed role layouts.

**Architecture:** The API authenticates every account from `users`; a student account must resolve a one-to-one `students.user_id` profile for student-specific data. An opaque server-side session is held in an in-memory store and represented by an HttpOnly cookie. Hono middleware derives the current user from the database for every protected request, while React uses `/api/auth/me` to restore state and route guards to select the correct role layout.

**Tech Stack:** Hono, TypeScript, `sql.js`, `bcryptjs`, Node’s built-in test runner, React 18, React Router, Vite, CSS.

**Spec:** `docs/superpowers/specs/2026-08-24-authentication-role-access-design.md`

## Global Constraints

- `users` is the only authentication table and its roles are exactly `headmaster`, `teacher`, and `student`.
- `students` stores academic/profile data and has a unique `user_id` foreign key; it never stores login credentials.
- Subject-teacher and homeroom responsibilities remain assignment relationships for `users.role = 'teacher'`.
- Passwords are verified with bcrypt and never logged or returned.
- Backend authorization is authoritative; frontend guards are not a security boundary.
- Only the authentication, authorization, layouts, routes, logout, seed/schema alignment, and required tests are in scope.
- Use the supplied Stitch archive only for the Modern Scholastic visual theme; do not add its analytics, attendance, schedule, or School Admin features.
- Keep the pre-existing modified `database/lms.db` in the main checkout untouched.

---

### Task 1: Add failing backend authentication contract tests

**Files:**
- Create: `apps/api/src/auth.test.ts`
- Modify: `apps/api/package.json`

**Interfaces:**
- The tests will consume `createApp(database, sessionStore)`, `MemorySessionStore`, and the normalized `AuthenticatedUser` type.
- The tests will build an isolated in-memory target schema with `users.role IN ('headmaster', 'teacher', 'student')` and `students.user_id UNIQUE`.

- [ ] **Step 1: Add the test command and bcrypt dependency metadata**

Add these scripts/dependencies to `apps/api/package.json`:

```json
{
  "scripts": {
    "test": "node --import tsx --test src/auth.test.ts"
  },
  "dependencies": {
    "bcryptjs": "^2.4.3"
  }
}
```

- [ ] **Step 2: Write the failing authentication tests**

Create a test database with these rows:

```text
users: headmaster/adminbaim/admin123
users: teacher/adminarsito/admin123
users: student/ahmad.rizki/student123
students: user_id for ahmad.rizki, nis 2025001, class_id 1
```

Use `bcrypt.hashSync` only to create test fixtures. Add tests named:

```ts
test("logs in a teacher from users", ...);
test("logs in a headmaster from users", ...);
test("logs in a student from users and returns student profile data", ...);
test("returns the same generic error for unknown username and wrong password", ...);
test("rejects a student user without a synchronized students profile", ...);
test("restores the current user from the session cookie", ...);
test("returns 401 for an unauthenticated protected request", ...);
test("allows only the matching role on protected dashboard endpoints", ...);
test("logout invalidates the session", ...);
```

Each successful response must assert the normalized `role`, student `student_id`/`class_id` where applicable, and absence of `password_hash`. The authorization test must assert `200` for the matching endpoint and `403` for the other two endpoints. The logout test must reuse the original cookie and assert `401` after logout.

- [ ] **Step 3: Run the focused tests and verify the expected RED failure**

Run:

```powershell
npm test -w apps/api
```

Expected result: the test runner fails because `createApp` and the auth modules do not exist yet. Do not implement production code before observing this failure.

---

### Task 2: Implement the backend identity, password, session, and authorization layers

**Files:**
- Create: `apps/api/src/auth/types.ts`
- Create: `apps/api/src/auth/session-store.ts`
- Create: `apps/api/src/auth/service.ts`
- Create: `apps/api/src/auth/middleware.ts`
- Modify: `apps/api/src/app.ts`
- Modify: `apps/api/src/index.ts`
- Test: `apps/api/src/auth.test.ts`

**Interfaces:**
- `AuthenticatedUser`: `{ id: number; name: string; role: Role; student_id?: number; class_id?: number }`.
- `SessionStore`: `create(subject: SessionSubject): string`, `get(token: string): SessionSubject | null`, `delete(token: string): void`.
- `MemorySessionStore`: stores `{ userId, expiresAt }`, uses a 32-byte random token, and expires stale sessions.
- `authenticateUser(db, username, password): Promise<AuthenticatedUser | null>` queries `users` only, verifies bcrypt, and joins `students` by `students.user_id` for student users.
- `loadAuthenticatedUser(db, userId): AuthenticatedUser | null` resolves the current role and linked student profile on every request.
- `createApp(db, sessions): Hono` registers the API routes and middleware.

- [ ] **Step 1: Implement normalized auth types and session storage**

Define the three-role union and session subject in `types.ts`. In `session-store.ts`, generate session tokens with Node’s cryptographic random byte API, store only the `users.id`, apply an eight-hour server-side expiry, and remove expired entries when read. Do not store passwords, password hashes, roles, or display names in the session token.

- [ ] **Step 2: Implement database-backed authentication service**

Use parameterized `sql.js` statements. Query one `users` row by `username`, select its `password_hash`, and call `bcrypt.compare`. Accept only the three role values. For `role = 'student'`, join `students` by `students.user_id`; return `null` if no linked profile exists. Build the public response from `users.name`, `users.id`, `users.role`, and the linked student `id`/`class_id`. Never include `password_hash` in the return type.

- [ ] **Step 3: Implement `requireAuth` and `requireRole` middleware**

Read the `lms_session` cookie, resolve the session subject through `loadAuthenticatedUser`, and attach the current user to Hono context. Return `{ "error": "Authentication required" }` with status `401` when missing or invalid. `requireRole` must compare the database-derived role and return `{ "error": "Forbidden" }` with status `403` on mismatch.

- [ ] **Step 4: Refactor app construction and add auth routes**

Refactor database initialization so `initDb()` returns the loaded `sql.js` database and `index.ts` constructs the app with `createApp(db)`. Keep health and table routes working. Add:

```text
POST /api/auth/login
GET  /api/auth/me
POST /api/auth/logout
GET  /api/teacher/dashboard
GET  /api/headmaster/dashboard
GET  /api/student/dashboard
```

Login validates non-empty string fields, calls `authenticateUser`, creates a session, and sets an HttpOnly `SameSite=Lax` cookie. Invalid credentials always return the same `401` error. `/me` returns the database-derived user. Logout deletes the session and expires the cookie, including for already-invalid sessions. Protected placeholder endpoints return a small role-specific success payload only after middleware authorization.

- [ ] **Step 5: Run the backend tests and verify GREEN**

Run:

```powershell
npm test -w apps/api
npm run build:api
```

Expected result: all auth contract tests pass and the API TypeScript build exits successfully.

---

### Task 3: Align the database schema and seed data with unified users

**Files:**
- Modify: `database/migration.sql`
- Modify: `database/seed.sql`
- Test: `apps/api/src/auth.test.ts`

**Interfaces:**
- `users.role` accepts exactly `headmaster`, `teacher`, and `student`.
- `students.user_id` is required, unique, and references `users(id)`.
- `students` has no `username` or `password_hash` columns.

- [ ] **Step 1: Add a schema contract assertion**

Extend the backend test setup with an assertion that the target schema exposes the unified role constraint and student link. The assertion must fail against the current legacy SQL if the migration is applied before the migration edit.

- [ ] **Step 2: Update `database/migration.sql`**

Change the `users` role check to include `student`. Add `students.user_id INTEGER NOT NULL UNIQUE REFERENCES users(id)`. Remove `students.username` and `students.password_hash`. Keep `nis`, `name`, `class_id`, timestamps, and student foreign-key/index behavior. Add an index for `students.user_id`.

- [ ] **Step 3: Update `database/seed.sql`**

Insert the headmaster, teachers, and all student login accounts into `users`. Use valid bcrypt hashes for the documented fixture passwords. Insert each student academic record into `students` using a subquery from its username to populate `user_id`; do not insert credentials into `students`. Keep student `users.name` and `students.name` aligned.

- [ ] **Step 4: Verify migration and seed compatibility**

Run the API auth tests and then apply the migration and seed to a temporary SQLite database using the repository’s available `sql.js` runtime. Query the resulting `users` and `students` tables to verify three roles, 30 linked student profiles, zero student credential columns, and successful fixture login.

- [ ] **Step 5: Run the full API checks**

Run:

```powershell
npm test -w apps/api
npm run build:api
```

Expected result: all backend tests remain green after the schema and seed alignment.

---

### Task 4: Add frontend auth state, route guards, and role routing with failing tests first

**Files:**
- Modify: `apps/web/package.json`
- Create: `apps/web/src/auth/routing.ts`
- Create: `apps/web/src/auth/routing.test.ts`
- Create: `apps/web/src/auth/AuthContext.tsx`
- Modify: `apps/web/src/App.tsx`
- Modify: `apps/web/src/main.tsx`

**Interfaces:**
- `Role = "teacher" | "headmaster" | "student"`.
- `dashboardForRole(role): string` maps to `/teacher/dashboard`, `/headmaster/dashboard`, or `/student/dashboard`.
- `routeRole(pathname): Role | null` identifies the protected namespace.
- `guardDestination(pathname, user): string | null` returns `/login`, the user’s own dashboard, or `null` when allowed.
- `AuthProvider` exposes `{ user, isLoading, login, logout }` and always uses `credentials: "include"`.

- [ ] **Step 1: Add frontend test tooling and write route-guard tests**

Add `react-router-dom` to dependencies, `tsx` to dev dependencies, and this script:

```json
"test": "node --import tsx --test src/auth/routing.test.ts"
```

Write tests proving:

```ts
assert.equal(guardDestination("/teacher/dashboard", null), "/login");
assert.equal(guardDestination("/teacher/classes", teacher), null);
assert.equal(guardDestination("/student/classes", teacher), "/teacher/dashboard");
assert.equal(guardDestination("/teacher/classes", student), "/student/dashboard");
assert.equal(guardDestination("/headmaster/classes", headmaster), null);
```

- [ ] **Step 2: Run the focused frontend test and verify RED**

Run:

```powershell
npm test -w apps/web
```

Expected result: the test fails because the routing module does not exist yet.

- [ ] **Step 3: Implement pure route helpers and auth context**

Implement the role-to-dashboard mapping and guard decision functions. Implement `AuthProvider` so it loads `/api/auth/me` once on mount, keeps `isLoading` true until the request settles, stores only the normalized user in React state, posts credentials to `/api/auth/login`, and clears state through `/api/auth/logout`.

- [ ] **Step 4: Implement React Router routes and protected layouts**

Replace the existing health/table screen with `/login`, the three role namespaces, placeholder pages, and a root redirect. Use a `ProtectedRoute` that waits for auth loading, redirects unauthenticated users to `/login`, and redirects wrong-role users to their own dashboard. Ensure `/login` redirects already-authenticated users using the same mapping.

- [ ] **Step 5: Run frontend tests and build**

Run:

```powershell
npm test -w apps/web
npm run build:web
```

Expected result: route-helper tests pass and the production web build succeeds.

---

### Task 5: Apply the reference theme to the auth shell and role layouts

**Files:**
- Create: `apps/web/src/styles.css`
- Modify: `apps/web/src/main.tsx`
- Modify: `apps/web/src/App.tsx`

**Interfaces:**
- The styling must expose no additional LMS functionality.
- Required navigation remains exactly role-specific: Teacher `Dashboard/Classes/Assignments/Grades`; Headmaster `Dashboard/Classes/Students/Teachers/Subjects`; Student `Dashboard/Classes/Assignments/Grades`.

- [ ] **Step 1: Define the Modern Scholastic tokens**

Use CSS variables for `#0F172A`, `#6366F1`, `#F8FAFC`, `#E2E8F0`, white surfaces, 8px spacing units, rounded controls/cards, and ambient shadows. Use Geist/Inter-style system fallbacks without adding a remote font dependency.

- [ ] **Step 2: Style login and layouts**

Create a responsive sidebar/content shell inspired by the supplied reference screenshot. Include the authenticated name, role label, active navigation state, logout action, loading state, error state, and placeholder content cards. Do not copy reference analytics, attendance, Schedule, School Admin, or other out-of-scope modules.

- [ ] **Step 3: Run the web build**

Run:

```powershell
npm run build:web
```

Expected result: the themed app type-checks and bundles successfully.

---

### Task 6: Full verification and review checkpoint

**Files:**
- Modify only files required by failing verification tests.

- [ ] **Step 1: Run all tests and builds**

Run:

```powershell
npm test -w apps/api
npm test -w apps/web
npm run build:api
npm run build:web
git diff --check
```

- [ ] **Step 2: Exercise the local API session flow**

Start the API locally and verify one login for each role, `/api/auth/me`, each role’s allowed dashboard endpoint, wrong-role `403`, unauthenticated `401`, and logout invalidation. Do not log passwords or cookie values.

- [ ] **Step 3: Review the requirement checklist**

Confirm that every requirement in the spec is covered, including unified `users` authentication, linked student profiles, role redirects, loading state, logout, no password-hash responses, and no out-of-scope LMS functionality.

- [ ] **Step 4: Request code review**

Use the requesting-code-review skill against the feature branch’s base and head commits. Fix Critical and Important findings, rerun the full verification commands, and report the exact results without integrating into `main`.

