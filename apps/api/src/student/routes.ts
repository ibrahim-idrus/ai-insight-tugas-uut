import { Hono } from "hono";
import type { Database } from "sql.js";
import { requireRole, type AuthEnv } from "../auth/middleware.js";
import type { SessionStore } from "../auth/session-store.js";
import type { AuthenticatedUser } from "../auth/types.js";

type Ctx = { Variables: { authUser: AuthenticatedUser } };

function queryOne<T extends object>(database: Database, sql: string, params: unknown[]): T | null {
  const stmt = database.prepare(sql);
  stmt.bind(params);
  try {
    return stmt.step() ? (stmt.getAsObject() as T) : null;
  } finally {
    stmt.free();
  }
}

function queryAll<T extends object>(database: Database, sql: string, params: unknown[]): T[] {
  const stmt = database.prepare(sql);
  stmt.bind(params);
  const results: T[] = [];
  try {
    while (stmt.step()) {
      results.push(stmt.getAsObject() as T);
    }
    return results;
  } finally {
    stmt.free();
  }
}

function getActivePeriodId(database: Database): number | null {
  const row = queryOne<{ id: number }>(database, "SELECT id FROM academic_periods WHERE is_active = 1 LIMIT 1", []);
  return row?.id ?? null;
}

export function createStudentRoutes(database: Database, sessions: SessionStore) {
  const student = new Hono<Ctx>();
  student.use("*", requireRole(database, sessions, "student"));

  // ──────────────────────────────────────────────
  // GET /api/student/dashboard
  // ──────────────────────────────────────────────
  student.get("/dashboard", (c) => {
    const user = c.get("authUser");
    const studentId = user.student_id!;
    const classId = user.class_id!;
    const periodId = getActivePeriodId(database);

    const profile = queryOne<{
      student_name: string;
      nis: string;
      class_name: string;
      grade_level: number;
      school_year: string;
      semester: number;
    }>(
      database,
      `SELECT
        s.name AS student_name, s.nis,
        c.name AS class_name, c.grade_level,
        ap.school_year, ap.semester
       FROM students s
       JOIN classes c ON c.id = s.class_id
       LEFT JOIN academic_periods ap ON ap.id = ?
       WHERE s.id = ?`,
      [periodId, studentId]
    );

    const avgRow = queryOne<{ average_score: number | null }>(
      database,
      `SELECT AVG(total_score) AS average_score
       FROM assignment_submissions
       WHERE student_id = ? AND status = 'graded'`,
      [studentId]
    );

    const gradedRow = queryOne<{ count: number }>(
      database,
      `SELECT COUNT(*) AS count
       FROM assignment_submissions
       WHERE student_id = ? AND status = 'graded'`,
      [studentId]
    );

    const notDoneRow = queryOne<{ count: number }>(
      database,
      `SELECT COUNT(*) AS count
       FROM assignments a
       JOIN subject_teacher_assignments sta ON sta.id = a.subject_teacher_assignment_id
       WHERE sta.class_id = ? AND a.status = 'published'
         AND a.id NOT IN (
           SELECT assignment_id FROM assignment_submissions
           WHERE student_id = ? AND status = 'graded'
         )`,
      [classId, studentId]
    );

    const upcoming = queryAll<{
      id: number;
      title: string;
      assignment_type: string;
      start_at: string | null;
      due_at: string | null;
      subject_name: string;
      teacher_name: string;
      submission_status: string | null;
    }>(
      database,
      `SELECT
        a.id, a.title, a.assignment_type, a.start_at, a.due_at,
        s.name AS subject_name,
        u.name AS teacher_name,
        asub.status AS submission_status
       FROM assignments a
       JOIN subject_teacher_assignments sta ON sta.id = a.subject_teacher_assignment_id
       JOIN subjects s ON s.id = sta.subject_id
       JOIN users u ON u.id = sta.teacher_id
       LEFT JOIN assignment_submissions asub ON asub.assignment_id = a.id AND asub.student_id = ?
       WHERE sta.class_id = ? AND a.status = 'published'
         AND (asub.id IS NULL OR asub.status != 'graded')
       ORDER BY a.due_at ASC
       LIMIT 5`,
      [studentId, classId]
    );

    return c.json({
      profile,
      averageScore: avgRow?.average_score ?? null,
      gradedCount: gradedRow?.count ?? 0,
      notDoneCount: notDoneRow?.count ?? 0,
      upcoming,
    });
  });

  // ──────────────────────────────────────────────
  // GET /api/student/profile
  // ──────────────────────────────────────────────
  student.get("/profile", (c) => {
    const user = c.get("authUser");
    const studentId = user.student_id!;
    const periodId = getActivePeriodId(database);

    const profile = queryOne<{
      student_name: string;
      nis: string;
      username: string;
      class_name: string;
      grade_level: number;
      homeroom_teacher_name: string | null;
      school_year: string;
      semester: number;
    }>(
      database,
      `SELECT
        s.name AS student_name, s.nis,
        u.username,
        c.name AS class_name, c.grade_level,
        ht.name AS homeroom_teacher_name,
        ap.school_year, ap.semester
       FROM students s
       JOIN users u ON u.id = s.user_id
       JOIN classes c ON c.id = s.class_id
       LEFT JOIN academic_periods ap ON ap.id = ?
       LEFT JOIN homeroom_assignments ha ON ha.class_id = s.class_id AND ha.academic_period_id = ap.id
       LEFT JOIN users ht ON ht.id = ha.teacher_id
       WHERE s.id = ?`,
      [periodId, studentId]
    );

    if (!profile) return c.json({ error: "Profile not found" }, 404);
    return c.json({ profile });
  });

  // ──────────────────────────────────────────────
  // GET /api/student/materials
  // ──────────────────────────────────────────────
  student.get("/materials", (c) => {
    const user = c.get("authUser");
    const classId = user.class_id!;

    const materials = queryAll<{
      id: number;
      title: string;
      description: string | null;
      created_at: string;
      subject_name: string;
      teacher_name: string;
    }>(
      database,
      `SELECT
        m.id, m.title, m.description, m.created_at,
        s.name AS subject_name,
        u.name AS teacher_name
       FROM materials m
       JOIN subject_teacher_assignments sta ON sta.id = m.subject_teacher_assignment_id
       JOIN subjects s ON s.id = sta.subject_id
       JOIN users u ON u.id = sta.teacher_id
       WHERE sta.class_id = ?
       ORDER BY m.created_at DESC`,
      [classId]
    );

    return c.json({ materials });
  });

  // ──────────────────────────────────────────────
  // GET /api/student/materials/:id
  // ──────────────────────────────────────────────
  student.get("/materials/:id", (c) => {
    const user = c.get("authUser");
    const classId = user.class_id!;
    const materialId = Number(c.req.param("id"));

    if (!materialId) return c.json({ error: "Invalid material ID" }, 400);

    const material = queryOne<{
      id: number;
      title: string;
      description: string | null;
      content: string | null;
      created_at: string;
      subject_name: string;
      teacher_name: string;
    }>(
      database,
      `SELECT
        m.id, m.title, m.description, m.content, m.created_at,
        s.name AS subject_name,
        u.name AS teacher_name
       FROM materials m
       JOIN subject_teacher_assignments sta ON sta.id = m.subject_teacher_assignment_id
       JOIN subjects s ON s.id = sta.subject_id
       JOIN users u ON u.id = sta.teacher_id
       WHERE m.id = ? AND sta.class_id = ?`,
      [materialId, classId]
    );

    if (!material) return c.json({ error: "Material not found" }, 404);
    return c.json({ material });
  });

  // ──────────────────────────────────────────────
  // GET /api/student/assignments
  // ──────────────────────────────────────────────
  student.get("/assignments", (c) => {
    const user = c.get("authUser");
    const studentId = user.student_id!;
    const classId = user.class_id!;

    const assignments = queryAll<{
      id: number;
      title: string;
      assignment_type: string;
      start_at: string | null;
      due_at: string | null;
      subject_name: string;
      teacher_name: string;
      submission_status: string | null;
      total_score: number | null;
    }>(
      database,
      `SELECT
        a.id, a.title, a.assignment_type, a.start_at, a.due_at,
        s.name AS subject_name,
        u.name AS teacher_name,
        asub.status AS submission_status,
        asub.total_score
       FROM assignments a
       JOIN subject_teacher_assignments sta ON sta.id = a.subject_teacher_assignment_id
       JOIN subjects s ON s.id = sta.subject_id
       JOIN users u ON u.id = sta.teacher_id
       LEFT JOIN assignment_submissions asub ON asub.assignment_id = a.id AND asub.student_id = ?
       WHERE sta.class_id = ? AND a.status = 'published'
       ORDER BY a.due_at DESC`,
      [studentId, classId]
    );

    const result = assignments.map((a) => {
      let status = "not_yet_done";
      if (a.submission_status === "graded") {
        status = "graded";
      }
      return { ...a, status };
    });

    return c.json({ assignments: result });
  });

  // ──────────────────────────────────────────────
  // GET /api/student/assignments/:id
  // ──────────────────────────────────────────────
  student.get("/assignments/:id", (c) => {
    const user = c.get("authUser");
    const studentId = user.student_id!;
    const classId = user.class_id!;
    const assignmentId = Number(c.req.param("id"));

    if (!assignmentId) return c.json({ error: "Invalid assignment ID" }, 400);

    const assignment = queryOne<{
      id: number;
      title: string;
      description: string | null;
      assignment_type: string;
      start_at: string | null;
      due_at: string | null;
      assignment_status: string;
      subject_name: string;
      teacher_name: string;
      submission_id: number | null;
      submission_status: string | null;
      total_score: number | null;
      submitted_at: string | null;
    }>(
      database,
      `SELECT
        a.id, a.title, a.description, a.assignment_type, a.start_at, a.due_at,
        a.status AS assignment_status,
        s.name AS subject_name,
        u.name AS teacher_name,
        asub.id AS submission_id,
        asub.status AS submission_status,
        asub.total_score,
        asub.submitted_at
       FROM assignments a
       JOIN subject_teacher_assignments sta ON sta.id = a.subject_teacher_assignment_id
       JOIN subjects s ON s.id = sta.subject_id
       JOIN users u ON u.id = sta.teacher_id
       LEFT JOIN assignment_submissions asub ON asub.assignment_id = a.id AND asub.student_id = ?
       WHERE a.id = ? AND sta.class_id = ?`,
      [studentId, assignmentId, classId]
    );

    if (!assignment) return c.json({ error: "Assignment not found" }, 404);

    let status = "not_yet_done";
    if (assignment.submission_status === "graded") {
      status = "graded";
    }

    return c.json({ assignment: { ...assignment, status } });
  });

  // ──────────────────────────────────────────────
  // POST /api/student/assignments/:id/start
  // ──────────────────────────────────────────────
  student.post("/assignments/:id/start", async (c) => {
    const user = c.get("authUser");
    const studentId = user.student_id!;
    const classId = user.class_id!;
    const assignmentId = Number(c.req.param("id"));

    if (!assignmentId) return c.json({ error: "Invalid assignment ID" }, 400);

    // Validate assignment exists, is published, belongs to student's class
    const assignment = queryOne<{
      id: number;
      assignment_type: string;
      start_at: string | null;
      due_at: string | null;
      assignment_status: string;
    }>(
      database,
      `SELECT a.id, a.assignment_type, a.start_at, a.due_at, a.status AS assignment_status
       FROM assignments a
       JOIN subject_teacher_assignments sta ON sta.id = a.subject_teacher_assignment_id
       WHERE a.id = ? AND sta.class_id = ?`,
      [assignmentId, classId]
    );

    if (!assignment) return c.json({ error: "Assignment not found" }, 404);
    if (assignment.assignment_status !== "published") return c.json({ error: "Assignment is not available" }, 403);

    // Check time availability: must have started
    const now = new Date().toISOString();
    if (assignment.start_at && now < assignment.start_at) {
      return c.json({ error: "Assignment has not started yet" }, 403);
    }

    // Check for existing submission
    const existing = queryOne<{
      id: number;
      status: string;
    }>(
      database,
      `SELECT id, status FROM assignment_submissions
       WHERE assignment_id = ? AND student_id = ?`,
      [assignmentId, studentId]
    );

    if (existing && (existing.status === "submitted" || existing.status === "graded")) {
      return c.json({ error: "You have already completed this assignment" }, 403);
    }

    let submissionId: number;

    if (existing && existing.status === "in_progress") {
      // Resume existing in_progress submission
      submissionId = existing.id;
    } else {
      // Create new submission
      database.run(
        `INSERT INTO assignment_submissions (assignment_id, student_id, started_at, status)
         VALUES (?, ?, datetime('now'), 'in_progress')`,
        [assignmentId, studentId]
      );
      const newSub = queryOne<{ id: number }>(
        database,
        `SELECT id FROM assignment_submissions
         WHERE assignment_id = ? AND student_id = ?`,
        [assignmentId, studentId]
      );
      if (!newSub) return c.json({ error: "Failed to create submission" }, 500);
      submissionId = newSub.id;
    }

    // Load questions (without answer_key)
    const questions = queryAll<{
      id: number;
      question_text: string;
      question_type: string;
      points: number;
      question_order: number;
    }>(
      database,
      `SELECT id, question_text, question_type, points, question_order
       FROM assignment_questions
       WHERE assignment_id = ?
       ORDER BY question_order ASC`,
      [assignmentId]
    );

    // Load existing answers (for resume)
    const existingAnswers = queryAll<{
      question_id: number;
      answer: string | null;
    }>(
      database,
      `SELECT question_id, answer
       FROM submission_answers
       WHERE submission_id = ?`,
      [submissionId]
    );

    const answersMap: Record<number, string | null> = {};
    for (const ans of existingAnswers) {
      answersMap[ans.question_id] = ans.answer;
    }

    const enrichedQuestions = questions.map((q) => ({
      ...q,
      savedAnswer: answersMap[q.id] ?? null,
      // Parse options from answer_key for multiple_choice
      options: q.question_type === "multiple_choice"
        ? parseOptionsFromAnswerKey(database, q.id)
        : undefined,
    }));

    return c.json({
      submissionId,
      assignmentType: assignment.assignment_type,
      questions: enrichedQuestions,
    });
  });

  // ──────────────────────────────────────────────
  // POST /api/student/assignments/:id/submit (quiz)
  // ──────────────────────────────────────────────
  student.post("/assignments/:id/submit", async (c) => {
    const user = c.get("authUser");
    const studentId = user.student_id!;
    const classId = user.class_id!;
    const assignmentId = Number(c.req.param("id"));

    if (!assignmentId) return c.json({ error: "Invalid assignment ID" }, 400);

    // Get submission
    const submission = queryOne<{ id: number; status: string }>(
      database,
      `SELECT id, status FROM assignment_submissions
       WHERE assignment_id = ? AND student_id = ?`,
      [assignmentId, studentId]
    );

    if (!submission) return c.json({ error: "No submission found" }, 404);
    if (submission.status !== "in_progress") {
      return c.json({ error: "Submission is not in progress" }, 403);
    }

    // Validate assignment still allows submission (time check for in-progress attempts)
    const assignment = queryOne<{
      due_at: string | null;
      start_at: string | null;
    }>(
      database,
      `SELECT due_at, start_at FROM assignments WHERE id = ?`,
      [assignmentId]
    );

    if (assignment?.due_at) {
      const sub = queryOne<{ started_at: string | null }>(
        database,
        `SELECT started_at FROM assignment_submissions WHERE id = ?`,
        [submission.id]
      );
      // If started before due_at, allow submission regardless of current time
      // If no started_at, reject
      if (sub?.started_at && sub.started_at > assignment.due_at) {
        return c.json({ error: "Assignment deadline has passed" }, 403);
      }
    }

    // Parse request body
    const body = await c.req.json();
    const answers: { questionId: number; answer: string }[] = body.answers ?? [];

    if (!Array.isArray(answers) || answers.length === 0) {
      return c.json({ error: "No answers provided" }, 400);
    }

    // Delete any existing answers (in case of re-submit)
    database.run("DELETE FROM submission_answers WHERE submission_id = ?", [submission.id]);

    // Process each answer
    let totalScore = 0;
    let hasEssay = false;

    for (const ans of answers) {
      const question = queryOne<{
        id: number;
        question_type: string;
        points: number;
        answer_key: string | null;
      }>(
        database,
        `SELECT id, question_type, points, answer_key
         FROM assignment_questions
         WHERE id = ? AND assignment_id = ?`,
        [ans.questionId, assignmentId]
      );

      if (!question) continue;

      let score: number | null = null;
      let isCorrect: number | null = null;

      if (question.question_type === "essay") {
        // Essay: save answer but do not auto-grade
        score = null;
        isCorrect = null;
        hasEssay = true;
      } else if (question.answer_key !== null) {
        // Auto-grade: compare answer to answer_key
        const normalize = (s: string) => s.trim().toLowerCase();
        const isMatch = normalize(String(ans.answer)) === normalize(question.answer_key);
        score = isMatch ? question.points : 0;
        isCorrect = isMatch ? 1 : 0;
        totalScore += score;
      }

      database.run(
        `INSERT INTO submission_answers (submission_id, question_id, answer, score, is_correct, graded_at)
         VALUES (?, ?, ?, ?, ?, datetime('now'))`,
        [submission.id, question.id, ans.answer, score, isCorrect]
      );
    }

    // Update submission
    database.run(
      `UPDATE assignment_submissions
       SET status = 'graded', total_score = ?, submitted_at = datetime('now'), updated_at = datetime('now')
       WHERE id = ?`,
      [hasEssay ? null : totalScore, submission.id]
    );

    return c.json({
      success: true,
      totalScore: hasEssay ? null : totalScore,
      hasEssay,
      message: hasEssay
        ? "Submission received. Some questions are pending teacher review."
        : "Quiz submitted successfully.",
    });
  });

  // ──────────────────────────────────────────────
  // POST /api/student/assignments/:id/upload
  // ──────────────────────────────────────────────
  student.post("/assignments/:id/upload", async (c) => {
    const user = c.get("authUser");
    const studentId = user.student_id!;
    const classId = user.class_id!;
    const assignmentId = Number(c.req.param("id"));

    if (!assignmentId) return c.json({ error: "Invalid assignment ID" }, 400);

    // Validate assignment
    const assignment = queryOne<{
      id: number;
      assignment_type: string;
    }>(
      database,
      `SELECT a.id, a.assignment_type
       FROM assignments a
       JOIN subject_teacher_assignments sta ON sta.id = a.subject_teacher_assignment_id
       WHERE a.id = ? AND sta.class_id = ?`,
      [assignmentId, classId]
    );

    if (!assignment) return c.json({ error: "Assignment not found" }, 404);
    if (assignment.assignment_type !== "upload") {
      return c.json({ error: "This is not an upload assignment" }, 403);
    }

    // Get or create submission
    const existing = queryOne<{ id: number; status: string }>(
      database,
      `SELECT id, status FROM assignment_submissions
       WHERE assignment_id = ? AND student_id = ?`,
      [assignmentId, studentId]
    );

    if (existing && (existing.status === "submitted" || existing.status === "graded")) {
      return c.json({ error: "You have already submitted this assignment" }, 403);
    }

    let submissionId: number;
    if (existing && existing.status === "in_progress") {
      submissionId = existing.id;
    } else {
      database.run(
        `INSERT INTO assignment_submissions (assignment_id, student_id, started_at, status)
         VALUES (?, ?, datetime('now'), 'in_progress')`,
        [assignmentId, studentId]
      );
      const newSub = queryOne<{ id: number }>(
        database,
        `SELECT id FROM assignment_submissions
         WHERE assignment_id = ? AND student_id = ?`,
        [assignmentId, studentId]
      );
      if (!newSub) return c.json({ error: "Failed to create submission" }, 500);
      submissionId = newSub.id;
    }

    // Parse body: expect { fileName, fileType, fileContent (base64), description }
    const body = await c.req.json();
    const { fileName, fileType, fileContent, description } = body;

    if (!fileName || !fileContent) {
      return c.json({ error: "No file provided" }, 400);
    }

    // Validate file size (5MB limit)
    const sizeInBytes = Math.ceil((fileContent.length * 3) / 4);
    if (sizeInBytes > 5 * 1024 * 1024) {
      return c.json({ error: "File exceeds 5MB limit" }, 400);
    }

    // Validate file type
    const allowedTypes = [
      "image/jpeg", "image/png", "image/gif", "image/webp",
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "text/plain",
    ];
    if (fileType && !allowedTypes.includes(fileType)) {
      return c.json({ error: "File type not allowed" }, 400);
    }

    // Store file reference in submission_answers
    const fileData = JSON.stringify({ fileName, fileType, fileContent, description: description ?? "" });

    // Delete existing answer for this submission (re-upload)
    database.run("DELETE FROM submission_answers WHERE submission_id = ?", [submissionId]);

    // Find or create a question for this upload (use first question or create reference)
    // For upload assignments, we use a single "file" question entry
    let question = queryOne<{ id: number }>(
      database,
      `SELECT id FROM assignment_questions WHERE assignment_id = ? LIMIT 1`,
      [assignmentId]
    );

    if (!question) {
      // Create a placeholder question for file upload
      database.run(
        `INSERT INTO assignment_questions (assignment_id, question_text, question_type, points, question_order)
         VALUES (?, 'File Upload', 'essay', 100, 1)`,
        [assignmentId]
      );
      question = queryOne<{ id: number }>(
        database,
        `SELECT id FROM assignment_questions WHERE assignment_id = ? LIMIT 1`,
        [assignmentId]
      );
    }

    if (!question) return c.json({ error: "Failed to process upload" }, 500);

    database.run(
      `INSERT INTO submission_answers (submission_id, question_id, answer, score, is_correct, graded_at)
       VALUES (?, ?, ?, NULL, NULL, NULL)`,
      [submissionId, question.id, fileData]
    );

    // Update submission status
    database.run(
      `UPDATE assignment_submissions
       SET status = 'submitted', submitted_at = datetime('now'), updated_at = datetime('now')
       WHERE id = ?`,
      [submissionId]
    );

    return c.json({
      success: true,
      message: "Upload submitted successfully. Awaiting teacher review.",
      submissionId,
    });
  });

  // ──────────────────────────────────────────────
  // GET /api/student/assignments/:id/result
  // ──────────────────────────────────────────────
  student.get("/assignments/:id/result", (c) => {
    const user = c.get("authUser");
    const studentId = user.student_id!;
    const classId = user.class_id!;
    const assignmentId = Number(c.req.param("id"));

    if (!assignmentId) return c.json({ error: "Invalid assignment ID" }, 400);

    // Get assignment info
    const assignment = queryOne<{
      id: number;
      title: string;
      assignment_type: string;
      subject_name: string;
      teacher_name: string;
    }>(
      database,
      `SELECT
        a.id, a.title, a.assignment_type,
        s.name AS subject_name,
        u.name AS teacher_name
       FROM assignments a
       JOIN subject_teacher_assignments sta ON sta.id = a.subject_teacher_assignment_id
       JOIN subjects s ON s.id = sta.subject_id
       JOIN users u ON u.id = sta.teacher_id
       WHERE a.id = ? AND sta.class_id = ?`,
      [assignmentId, classId]
    );

    if (!assignment) return c.json({ error: "Assignment not found" }, 404);

    // Get submission
    const submission = queryOne<{
      id: number;
      status: string;
      total_score: number | null;
      submitted_at: string | null;
    }>(
      database,
      `SELECT id, status, total_score, submitted_at
       FROM assignment_submissions
       WHERE assignment_id = ? AND student_id = ?`,
      [assignmentId, studentId]
    );

    if (!submission) return c.json({ error: "No submission found" }, 404);

    // Get max possible score
    const maxRow = queryOne<{ max_score: number | null }>(
      database,
      `SELECT SUM(points) AS max_score FROM assignment_questions WHERE assignment_id = ?`,
      [assignmentId]
    );

    // Get question results (without answer_key)
    const results = queryAll<{
      question_text: string;
      question_type: string;
      points: number;
      answer: string | null;
      score: number | null;
      is_correct: number | null;
    }>(
      database,
      `SELECT
        aq.question_text, aq.question_type, aq.points,
        sa.answer, sa.score, sa.is_correct
       FROM assignment_questions aq
       LEFT JOIN submission_answers sa ON sa.question_id = aq.id AND sa.submission_id = ?
       WHERE aq.assignment_id = ?
       ORDER BY aq.question_order ASC`,
      [submission.id, assignmentId]
    );

    // Check if any essay questions are pending review
    const hasPendingEssay = results.some(
      (r) => r.question_type === "essay" && r.score === null
    );

    return c.json({
      assignment,
      submission: {
        status: submission.status,
        totalScore: submission.total_score,
        maxScore: maxRow?.max_score ?? 0,
        submittedAt: submission.submitted_at,
        hasPendingEssay,
      },
      results,
    });
  });

  return student;
}

// Helper: Parse options from answer_key for multiple_choice questions
// answer_key format: "A. option1\nB. option2\nC. option3\nD. option4" or just the correct answer
function parseOptionsFromAnswerKey(database: Database, questionId: number): string[] | undefined {
  const question = queryOne<{ answer_key: string | null }>(
    database,
    `SELECT answer_key FROM assignment_questions WHERE id = ?`,
    [questionId]
  );
  if (!question?.answer_key) return undefined;

  const key = question.answer_key;
  // If the answer_key contains newline-separated options, parse them
  if (key.includes("\n")) {
    return key.split("\n").map((o) => o.trim()).filter(Boolean);
  }
  // If it's just a single answer, no options to display as selectable
  return undefined;
}
