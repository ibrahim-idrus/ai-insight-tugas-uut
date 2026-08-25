# Teacher Assignment Management Design

## Goal

Add a teacher-only assignment management workflow using the existing `assignments` table and its `subject_teacher_assignment_id` relationship. Teachers can list, create, view, edit, delete, publish, and close assignments belonging to their authenticated teaching contexts.

## API contract

The API registers these protected routes under `/api/teacher/assignments`:

- `GET /api/teacher/assignments` lists only assignments whose teaching context belongs to the authenticated teacher.
- `POST /api/teacher/assignments` creates a draft after validating an owned `subject_teacher_assignment_id`.
- `GET /api/teacher/assignments/:assignmentId` reads one owned assignment.
- `PATCH /api/teacher/assignments/:assignmentId` updates only supported assignment fields and validates any submitted context ID against the authenticated teacher.
- `DELETE /api/teacher/assignments/:assignmentId` deletes one owned assignment.
- `POST /api/teacher/assignments/:assignmentId/publish` changes `draft` to `published`.
- `POST /api/teacher/assignments/:assignmentId/close` changes `published` to `closed`.

Assignment input is limited to `subjectTeacherAssignmentId`, `title`, `description`, `assignmentType`, `startAt`, and `dueAt`. Supported types are `quiz`, `task`, and `upload`; supported statuses are `draft`, `published`, and `closed`. Status is controlled by the transition endpoints, never by a client-provided teacher or ownership field. Missing or foreign resources return 404, unauthenticated requests return 401, and non-teacher sessions return 403.

## Web flow

The teacher portal keeps its existing sidebar and navigation and replaces the Assignments placeholder with:

- `/teacher/assignments` — owned assignments grouped by status/context, with loading, empty, error, and create states.
- `/teacher/assignments/new` — a form whose context selector is populated from `/api/teacher/classes`, so it can only display contexts already returned for the signed-in teacher.
- `/teacher/assignments/:id` — read-only assignment details with publish/close/delete actions when valid.
- `/teacher/assignments/:id/edit` — controlled edit form for supported fields, with mutation failure handling.

Pages use the existing visual system and `TeacherBreadcrumbs`, validate numeric route IDs before fetching, and show explicit not-found and mutation states. No quiz builder, question editing, file storage, submission results, grades aggregation, or schema changes are included.

## Testing and verification

API tests cover ownership, forged client fields, CRUD, transitions, invalid IDs/input, 401, and 403. Web tests cover route parsing, list/create/view/edit rendering, loading/empty/error/not-found states, transition/delete failures, and credentialed request bodies. The final checks are the API and web suites, both builds, `git diff --check`, and a seeded local HTTP smoke check where available.
