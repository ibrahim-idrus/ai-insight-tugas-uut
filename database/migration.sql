-- ============================================================
-- LMS Database Schema (SQLite)
-- ============================================================
-- Run: sqlite3 database/lms.db < database/migration.sql
-- ============================================================

PRAGMA foreign_keys = ON;

-- ============================================================
-- 1. users (all authentication accounts)
-- ============================================================
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('headmaster', 'teacher', 'student')),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ============================================================
-- 2. students (student academic/profile data linked to users)
-- ============================================================
CREATE TABLE students (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL UNIQUE,
    nis TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    class_id INTEGER NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (class_id) REFERENCES classes(id)
);

-- ============================================================
-- 3. classes
-- ============================================================
CREATE TABLE classes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    grade_level INTEGER NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ============================================================
-- 4. subjects
-- ============================================================
CREATE TABLE subjects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    code TEXT NOT NULL UNIQUE,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ============================================================
-- 5. academic_periods
-- ============================================================
CREATE TABLE academic_periods (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    school_year TEXT NOT NULL,
    semester INTEGER NOT NULL CHECK (semester IN (1, 2)),
    start_date TEXT NOT NULL,
    end_date TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE (school_year, semester)
);

-- ============================================================
-- 6. subject_teacher_assignments
-- Connects teacher + class + subject + academic_period
-- ============================================================
CREATE TABLE subject_teacher_assignments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    teacher_id INTEGER NOT NULL,
    class_id INTEGER NOT NULL,
    subject_id INTEGER NOT NULL,
    academic_period_id INTEGER NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (teacher_id) REFERENCES users(id),
    FOREIGN KEY (class_id) REFERENCES classes(id),
    FOREIGN KEY (subject_id) REFERENCES subjects(id),
    FOREIGN KEY (academic_period_id) REFERENCES academic_periods(id),
    UNIQUE (teacher_id, class_id, subject_id, academic_period_id)
);

-- ============================================================
-- 7. homeroom_assignments
-- ============================================================
CREATE TABLE homeroom_assignments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    teacher_id INTEGER NOT NULL,
    class_id INTEGER NOT NULL,
    academic_period_id INTEGER NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (teacher_id) REFERENCES users(id),
    FOREIGN KEY (class_id) REFERENCES classes(id),
    FOREIGN KEY (academic_period_id) REFERENCES academic_periods(id),
    UNIQUE (class_id, academic_period_id)
);

-- ============================================================
-- 8. assignments
-- ============================================================
CREATE TABLE assignments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    subject_teacher_assignment_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    assignment_type TEXT NOT NULL CHECK (assignment_type IN ('quiz', 'task', 'upload')),
    start_at TEXT,
    due_at TEXT,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'closed')),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (subject_teacher_assignment_id) REFERENCES subject_teacher_assignments(id)
);

-- ============================================================
-- 9. assignment_questions
-- ============================================================
CREATE TABLE assignment_questions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    assignment_id INTEGER NOT NULL,
    question_text TEXT NOT NULL,
    question_type TEXT NOT NULL CHECK (question_type IN ('multiple_choice', 'true_false', 'short_answer', 'essay')),
    points INTEGER NOT NULL DEFAULT 0,
    question_order INTEGER NOT NULL DEFAULT 0,
    answer_key TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (assignment_id) REFERENCES assignments(id)
);

-- ============================================================
-- 10. assignment_submissions
-- ============================================================
CREATE TABLE assignment_submissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    assignment_id INTEGER NOT NULL,
    student_id INTEGER NOT NULL,
    started_at TEXT,
    submitted_at TEXT,
    status TEXT NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'submitted', 'graded')),
    total_score REAL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (assignment_id) REFERENCES assignments(id),
    FOREIGN KEY (student_id) REFERENCES students(id),
    UNIQUE (assignment_id, student_id)
);

-- ============================================================
-- 11. submission_answers
-- ============================================================
CREATE TABLE submission_answers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    submission_id INTEGER NOT NULL,
    question_id INTEGER NOT NULL,
    answer TEXT,
    score REAL,
    is_correct INTEGER CHECK (is_correct IN (0, 1)),
    graded_at TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (submission_id) REFERENCES assignment_submissions(id),
    FOREIGN KEY (question_id) REFERENCES assignment_questions(id),
    UNIQUE (submission_id, question_id)
);

-- ============================================================
-- 12. materials
-- ============================================================
CREATE TABLE materials (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    subject_teacher_assignment_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    content TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (subject_teacher_assignment_id) REFERENCES subject_teacher_assignments(id)
);

-- ============================================================
-- 13. attitudes
-- ============================================================
CREATE TABLE attitudes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER NOT NULL,
    class_id INTEGER NOT NULL,
    academic_period_id INTEGER NOT NULL,
    teacher_id INTEGER NOT NULL,
    score TEXT NOT NULL,
    description TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (student_id) REFERENCES students(id),
    FOREIGN KEY (class_id) REFERENCES classes(id),
    FOREIGN KEY (academic_period_id) REFERENCES academic_periods(id),
    FOREIGN KEY (teacher_id) REFERENCES users(id)
);

-- ============================================================
-- INDEXES for foreign keys and main query patterns
-- ============================================================

-- students
CREATE INDEX idx_students_user_id ON students(user_id);
CREATE INDEX idx_students_class_id ON students(class_id);

-- subject_teacher_assignments
CREATE INDEX idx_sta_teacher_id ON subject_teacher_assignments(teacher_id);
CREATE INDEX idx_sta_class_id ON subject_teacher_assignments(class_id);
CREATE INDEX idx_sta_subject_id ON subject_teacher_assignments(subject_id);
CREATE INDEX idx_sta_academic_period_id ON subject_teacher_assignments(academic_period_id);

-- homeroom_assignments
CREATE INDEX idx_ha_teacher_id ON homeroom_assignments(teacher_id);
CREATE INDEX idx_ha_class_id ON homeroom_assignments(class_id);
CREATE INDEX idx_ha_academic_period_id ON homeroom_assignments(academic_period_id);

-- assignments
CREATE INDEX idx_assignments_sta_id ON assignments(subject_teacher_assignment_id);

-- assignment_questions
CREATE INDEX idx_aq_assignment_id ON assignment_questions(assignment_id);

-- assignment_submissions
CREATE INDEX idx_as_assignment_id ON assignment_submissions(assignment_id);
CREATE INDEX idx_as_student_id ON assignment_submissions(student_id);

-- submission_answers
CREATE INDEX idx_sa_submission_id ON submission_answers(submission_id);
CREATE INDEX idx_sa_question_id ON submission_answers(question_id);

-- materials
CREATE INDEX idx_materials_sta_id ON materials(subject_teacher_assignment_id);

-- attitudes
CREATE INDEX idx_attitudes_student_id ON attitudes(student_id);
CREATE INDEX idx_attitudes_class_id ON attitudes(class_id);
CREATE INDEX idx_attitudes_academic_period_id ON attitudes(academic_period_id);
CREATE INDEX idx_attitudes_teacher_id ON attitudes(teacher_id);
