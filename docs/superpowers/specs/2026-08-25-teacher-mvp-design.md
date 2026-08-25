# Teacher MVP Design

**Goal:** Complete the remaining Teacher workflows without changing the existing Student or Headmaster behavior.

## Scope

The Teacher workspace will gain five secure, data-backed workflows:

1. Quiz builder for teacher-owned quiz assignments, including question CRUD, question order, points, answer keys, and a dynamic total.
2. Assignment results for every student in the assignment's class, including students without a submission.
3. Teacher grades with context/type/search filters and dynamically calculated normalized averages.
4. Homeroom roster and attitude score/description upsert, authorized only through the current `homeroom_assignments` relationship.
5. Teacher dashboard with owned contexts, assignment/submission counts, recent assignments, and basic performance.

## Architecture and authorization

The existing `requireRole(database, sessions, "teacher")` middleware remains the only authentication boundary. New repositories use SQL ownership joins rather than request-body ownership fields:

- assignment features join `assignments -> subject_teacher_assignments` and require `sta.teacher_id = authUser.id`;
- results and grades derive the class from the owned assignment/context;
- homeroom features join `homeroom_assignments -> classes -> students` and require `ha.teacher_id = authUser.id`;
- attitude writes additionally require the target student to belong to the authorized homeroom class and period.

No schema change is required. `assignment_questions.question_order`, `points`, and `answer_key` support the quiz builder. `assignment_submissions` and `submission_answers` support results and grade aggregation. `attitudes` supports homeroom upsert through its existing student/class/period/teacher columns.

## API shape

- `GET /api/teacher/dashboard`
- `GET /api/teacher/assignments/:assignmentId/quiz`
- `POST /api/teacher/assignments/:assignmentId/quiz/questions`
- `PATCH /api/teacher/assignments/:assignmentId/quiz/questions/:questionId`
- `DELETE /api/teacher/assignments/:assignmentId/quiz/questions/:questionId`
- `POST /api/teacher/assignments/:assignmentId/quiz/reorder`
- `GET /api/teacher/assignments/:assignmentId/results`
- `GET /api/teacher/grades?context_id=&assignment_type=&search=`
- `GET /api/teacher/homeroom`
- `GET /api/teacher/homeroom/:homeroomId`
- `PUT /api/teacher/homeroom/:homeroomId/students/:studentId/attitude`

Responses use the existing `{ error: string }` error shape. Teacher-owned resources return 404 when a foreign teacher attempts access, avoiding disclosure.

## UI shape

The existing Teacher layout and `TeacherBreadcrumbs` are reused. New pages are:

- `/teacher/dashboard`
- `/teacher/assignments/:assignmentId/quiz`
- `/teacher/assignments/:assignmentId/results`
- `/teacher/grades`
- `/teacher/homeroom`
- `/teacher/homeroom/:homeroomId`

Each page has explicit loading, empty, error, and not-found states. Existing Student routes, Headmaster routes, assignment CRUD, and material/class behavior remain untouched except for links to the new Teacher tools.

## Testing and verification

API tests use the existing seeded in-memory sql.js database and real session cookies. Each new resource has Teacher A versus Teacher B authorization coverage, including forged ownership fields where relevant. Web tests use the existing React test renderer and fetch boundary. Verification runs the API test script, web test script, both workspace builds, and `git diff --check`.
