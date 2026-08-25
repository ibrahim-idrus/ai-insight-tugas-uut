# Teacher Classes, Students, and Materials

## Context

This is the first vertical slice of the Teacher Side MVP. It replaces the current teacher Classes placeholder with secure teaching-context and material workflows. The slice includes:

- all teaching contexts owned by the authenticated teacher, across academic periods;
- students belonging to each authorized context's class;
- material listing, viewing, creation, editing, and deletion.

Dashboard, assignments, grades, homeroom, and attitude workflows remain outside this slice.

The current repository is the source of truth. No schema redesign or migration is planned.

## Current schema mapping

`subject_teacher_assignments` is the existing teaching context. It connects a teacher, class, subject, and academic period:

```text
subject_teacher_assignments
├── teacher_id → users.id
├── class_id → classes.id
├── subject_id → subjects.id
└── academic_period_id → academic_periods.id
```

Students are academic profiles in `students`, linked to unified authentication accounts through `students.user_id` and to a class through `students.class_id`. Materials belong to a teaching context through `materials.subject_teacher_assignment_id`.

The API will never treat a client-supplied teacher ID as ownership evidence. Ownership is derived from the authenticated session's `users.id` and the context's `teacher_id`.

## Backend architecture

Add a teacher feature module with a small repository/service boundary for:

1. finding teacher-owned contexts;
2. loading one owned context with its class, subject, period, students, and materials;
3. finding a material only through an owned context;
4. validating and executing material mutations.

Register the feature routes from the existing Hono application and reuse `requireRole(..., "teacher")`. SQL will use prepared statements and the current `sql.js` database connection. The existing `{ error: string }` response shape will be preserved.

## API contract

### Teaching contexts

`GET /api/teacher/classes` returns:

```json
{
  "contexts": [
    {
      "id": 1,
      "class": { "id": 1, "name": "X-A", "gradeLevel": 10 },
      "subject": { "id": 1, "name": "Matematika", "code": "MTK" },
      "academicPeriod": { "id": 1, "schoolYear": "2025/2026", "semester": 1 },
      "studentCount": 5,
      "materialCount": 2
    }
  ]
}
```

`GET /api/teacher/classes/:contextId` returns the same context summary plus:

```json
{
  "students": [{ "id": 1, "name": "Ahmad Rizki Pratama", "nis": "2025001" }],
  "materials": [{
    "id": 1,
    "title": "Materi Aljabar Dasar",
    "description": "...",
    "content": "...",
    "createdAt": "...",
    "updatedAt": "..."
  }]
}
```

### Materials

The context is part of every material route so ownership is checked through the complete relationship:

- `POST /api/teacher/classes/:contextId/materials`
- `GET /api/teacher/classes/:contextId/materials/:materialId`
- `PATCH /api/teacher/classes/:contextId/materials/:materialId`
- `DELETE /api/teacher/classes/:contextId/materials/:materialId`

Material input accepts only the existing `title`, `description`, and `content` fields. `title` is required after trimming; the optional fields are normalized consistently. Unknown ownership fields are ignored and never used for authorization.

Responses use these conventions:

- `401` when there is no valid session;
- `403` when the authenticated account is not a teacher;
- `404` for missing or foreign contexts/materials, without revealing ownership;
- `400` for invalid identifiers or material input;
- `201` for successful creation, `200` for reads/updates, and `204` for deletion.

## Frontend architecture and routes

Keep the existing teacher sidebar unchanged. Add a teacher feature folder containing API helpers, response types, and focused pages:

- `/teacher/classes` — contexts grouped by academic period;
- `/teacher/classes/:contextId` — context summary, students table, and materials list;
- `/teacher/classes/:contextId/materials/new` — create form;
- `/teacher/classes/:contextId/materials/:materialId` — read-only material view;
- `/teacher/classes/:contextId/materials/:materialId/edit` — edit form.

The classes page will show class, subject, academic period, student count, and material count. The context page will show student name/NIS only and expose material view, edit, delete, and create actions. Existing cards, forms, buttons, tables, typography, spacing, and colors will be reused; no second UI library will be introduced.

Each page will represent loading, empty, successful, and failed requests. Mutations will show a pending state, refresh the relevant context after success, and provide a clear error without losing the current route. A missing/foreign resource will show an authorized empty/error state and offer navigation back to Classes.

## Authorization and data isolation

Every teacher endpoint will run the existing role middleware and then apply ownership in its SQL query or service lookup. The implementation must cover:

- list queries filtered by `subject_teacher_assignments.teacher_id = authUser.id`;
- context details filtered by the same teacher ownership;
- students loaded only through the authorized context's `class_id`;
- material reads/mutations joined through the authorized context;
- no teacher, user, password, token, or secret fields serialized to the frontend.

Changing a context ID or material ID must never expose another teacher's data or permit a mutation.

## Testing and acceptance

Add API tests using the repository's Node test runner, Hono request helper, `sql.js`, and `MemorySessionStore`. The fixture will contain two teachers with separate contexts and materials. Tests will verify:

1. a teacher sees all and only their contexts across academic periods;
2. an authorized context returns only students from its class;
3. another teacher's context returns `404`;
4. own-context material creation, viewing, editing, and deletion work;
5. material creation under another teacher's context returns `404`;
6. another teacher's material cannot be viewed, edited, or deleted;
7. missing titles and invalid IDs return `400`;
8. client-supplied ownership fields cannot change authorization.

Run the existing API and web tests plus both workspace builds. Verify the seeded local flow manually with the two teacher accounts where practical. No migration or seed-data change is required.

