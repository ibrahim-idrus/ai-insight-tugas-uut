# Authentication + Role Access Design

**Date:** 2026-08-24  
**Status:** Awaiting review after identity-model correction

## Goal

Implement the first LMS vertical slice: one login experience for headmasters, teachers, and students; secure session handling; backend role authorization; frontend route protection; separate role layouts; logout; and refresh-safe authentication state.

This slice intentionally stops before Classes, Assignments, Materials, Grades, Attendance, Schedule, analytics, registration, password reset, email verification, parent accounts, or admin accounts.

## Existing context

The repository currently contains a Hono API backed by `sql.js` and SQLite, plus a React/Vite frontend. The API loads `database/lms.db` at startup. The current database schema is a legacy split-account model: staff credentials live in `users`, while student credentials live in `students`. That does not match the intended identity model and will be corrected as part of this slice.

The target model has one authentication source: `users`. It will contain `headmaster`, `teacher`, and `student` roles. `students` will remain the student-specific academic/profile table and will have a required one-to-one `user_id` foreign key to `users`. Student credentials will be removed from `students`; the existing `username` column is the first implementation’s login identifier because the schema does not currently have an email column.

The seed comments document bcrypt passwords (`admin123` for staff and `student123` for students), but the checked-in seed hash strings are not valid bcrypt lengths. The implementation will update the SQL seed fixtures to valid bcrypt hashes and create matching `users` and `students` records for student accounts. It will not store plaintext passwords.

## Architecture

### Authentication identity

The backend exposes one normalized identity type:

```ts
type Role = "teacher" | "headmaster" | "student";

interface AuthenticatedUser {
  id: number;
  name: string;
  role: Role;
  student_id?: number;
  class_id?: number;
}
```

The login service checks only `users` for the submitted username and validates the role from `users.role`. A `headmaster` or `teacher` row authenticates directly. A `student` row must also have a matching `students.user_id` profile; that profile supplies `student_id` and `class_id`. The frontend receives only this normalized identity and never needs to understand the synchronization tables.

The session subject stores only the `users.id`. Every authenticated request resolves that user and, when applicable, the linked student profile against the database again. The role used for authorization therefore comes from the current server-side `users.role`, not from a cookie payload, local storage value, request body, or URL parameter. If a student user loses its linked `students` profile, the session is no longer considered valid.

### Role-specific synchronization

`users` is the canonical identity and authentication record. `students` is a one-to-one role profile, linked by `students.user_id UNIQUE REFERENCES users(id)`. The existing student `name` field may remain as an academic-profile compatibility field, but authentication and normalized identity use `users.name`; seed data must keep the two names aligned. Student `nis` and `class_id` remain in `students`. Teachers remain `users.role = 'teacher'`; subject-teacher and homeroom responsibilities continue to be represented by `subject_teacher_assignments` and `homeroom_assignments`, not by additional authentication roles.

### Password verification

Use `bcryptjs` because the database seed contract is bcrypt and the current repository has no password verifier. `bcrypt.compare` verifies the submitted password against `password_hash`. Invalid usernames and invalid passwords return the same generic `Invalid username or password` response. Passwords and hashes are never logged or returned in API responses.

### Session

Use an opaque server-side session with a cryptographically random token in an `HttpOnly` cookie named `lms_session`.

- Token value: 32 random bytes encoded as URL-safe text.
- Cookie: `HttpOnly`, `SameSite=Lax`, `Path=/`, and an eight-hour `Max-Age`.
- `Secure` is enabled for production HTTPS and omitted for local HTTP development.
- The server stores the token mapped to an account subject in an in-memory session store.
- Logout deletes the server-side session and expires the cookie.
- The store is behind a small interface so a durable store can be introduced when the backend is moved to a multi-instance Worker runtime.

The current application is a single-process local Hono server, so this provides refresh persistence for the running server and real logout invalidation without adding an authentication table to the LMS schema.

## Backend API

### `POST /api/auth/login`

Request:

```json
{
  "username": "adminarsito",
  "password": "admin123"
}
```

Responses:

- `200`: `{ "user": AuthenticatedUser }` and a new session cookie.
- `400`: `{ "error": "Username and password are required" }` for missing or blank input.
- `401`: `{ "error": "Invalid username or password" }` for every credential failure.

### `GET /api/auth/me`

Responses:

- `200`: `{ "user": AuthenticatedUser }` for a valid session.
- `401`: `{ "error": "Authentication required" }` when the cookie is absent, unknown, expired, or points to an unavailable account.

### `POST /api/auth/logout`

Always expires the session cookie. A valid session is removed from the session store before returning `204`; an already-logged-out request also returns `204` so logout is idempotent.

### Protected placeholder API routes

These endpoints provide concrete backend authorization boundaries for the first slice while their response bodies remain placeholders:

- `GET /api/teacher/dashboard` — teacher only
- `GET /api/headmaster/dashboard` — headmaster only
- `GET /api/student/dashboard` — student only

The authorization middleware is reusable for future routes under each namespace. Missing authentication returns `401`; an authenticated user with the wrong role returns `403`.

## Frontend routing and state

The web app will use `react-router-dom` with these routes:

- `/login`
- `/teacher/dashboard`, `/teacher/classes`, `/teacher/assignments`, `/teacher/grades`
- `/headmaster/dashboard`, `/headmaster/classes`, `/headmaster/students`, `/headmaster/teachers`, `/headmaster/subjects`
- `/student/dashboard`, `/student/classes`, `/student/assignments`, `/student/grades`

An `AuthProvider` loads `/api/auth/me` once on startup and exposes `user`, `isLoading`, `login`, and `logout`. Protected routes render a loading state while `/me` is pending, preventing an authenticated browser refresh from flashing or redirecting to `/login` prematurely.

`ProtectedRoute` waits for loading to finish, redirects unauthenticated visitors to `/login`, and redirects authenticated users with the wrong role to their own dashboard. The redirect behavior is consistent across all three role namespaces. The backend remains the final authorization authority.

The login page redirects authenticated users away from `/login` to the dashboard determined by the normalized role. Successful login uses the same role-to-dashboard mapping.

## Reference theme

The supplied Stitch archive is a visual reference only. Its `DESIGN.md` and screenshot do not expand the product scope or override the authentication requirements. The implementation will carry its “Modern Scholastic” visual language into the login and role-layout shells:

- Midnight navy (`#0F172A`) for the primary navigation and high-contrast actions.
- Indigo (`#6366F1`) for active navigation, focus states, and small accents.
- Off-white (`#F8FAFC`) page surfaces with white cards and subtle slate borders (`#E2E8F0`).
- Geist-like geometric headings and Inter-like readable body text, using local/system fallbacks rather than adding an external font dependency.
- Eight-pixel spacing rhythm, generous layout gutters, rounded cards and controls, and soft ambient shadows.
- Responsive sidebar/content composition inspired by the reference screenshot, without copying its analytics widgets or adding out-of-scope navigation.

The theme is deliberately applied to the authentication shell and placeholder pages only. The three role layouts keep their required role-specific navigation, so the reference’s `Schedule`, `School Admin`, attendance, analytics, and other extra modules are not added.

## Role layouts

Each layout shares basic visual primitives but has independent navigation:

- Teacher: Dashboard, Classes, Assignments, Grades
- Headmaster: Dashboard, Classes, Students, Teachers, Subjects
- Student: Dashboard, Classes, Assignments, Grades

Each layout includes a sidebar, content area, authenticated user name, and logout action. Linked pages are placeholders only. No business logic for any LMS feature is added.

## Testing strategy

Backend tests use Node’s built-in test runner against an in-memory `sql.js` database and an isolated session store. They cover:

- Valid teacher, headmaster, and student login.
- Normalized roles, the student `user_id` link, and student `class_id`.
- Student users without a synchronized `students` profile are rejected.
- Invalid usernames and passwords returning the same generic error.
- `/auth/me` restoring the session identity.
- Teacher, headmaster, and student namespace authorization.
- Unauthenticated protected requests returning `401`.
- Logout invalidating the session and making protected access fail.

Frontend tests cover the pure role-to-dashboard and route-guard decisions for unauthenticated, allowed-role, and wrong-role cases. The production web build verifies the React route and layout integration.

## Security boundaries

1. Password hashes never leave the backend.
2. Passwords are never logged.
3. Roles are derived from the database-backed session subject.
4. The client cannot change its role by editing state, storage, cookies, payloads, or URLs.
5. Every account, including students, authenticates through `users`; `students` contains synchronized academic data linked by `user_id`.
6. `students` never stores login credentials.
7. Every protected backend route applies authentication and role middleware.
8. Frontend visibility and redirects are convenience controls, not the security boundary.
