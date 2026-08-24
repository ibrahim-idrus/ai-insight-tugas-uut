-- ============================================================
-- LMS Dummy Data (SQLite)
-- ============================================================
-- Run: sqlite3 database/lms.db < database/seed.sql
-- ============================================================

PRAGMA foreign_keys = ON;

-- ============================================================
-- 1. users (3 accounts: 1 headmaster + 2 teachers)
-- Password for all: admin123 (bcrypt hash)
-- ============================================================
INSERT INTO users (name, username, password_hash, role) VALUES
('Baim Kepala Sekolah', 'adminbaim', '$2b$10$xJwK5q8V3Z9YtR7mN1pD4eA2fG6hJ0kL3mN5oP8qR9sT0uV1wX2yZ3', 'headmaster'),
('Arsito Guru', 'adminarsito', '$2b$10$xJwK5q8V3Z9YtR7mN1pD4eA2fG6hJ0kL3mN5oP8qR9sT0uV1wX2yZ3', 'teacher'),
('Alfian Guru', 'adminalfian', '$2b$10$xJwK5q8V3Z9YtR7mN1pD4eA2fG6hJ0kL3mN5oP8qR9sT0uV1wX2yZ3', 'teacher');

-- ============================================================
-- 2. classes (6 classes: 2 per grade level)
-- ============================================================
INSERT INTO classes (name, grade_level) VALUES
('X-A', 10),
('X-B', 10),
('XI-A', 11),
('XI-B', 11),
('XII-A', 12),
('XII-B', 12);

-- ============================================================
-- 3. subjects (8 subjects)
-- ============================================================
INSERT INTO subjects (name, code) VALUES
('Matematika', 'MTK'),
('Bahasa Indonesia', 'BIN'),
('Bahasa Inggris', 'ENG'),
('Fisika', 'FIS'),
('Kimia', 'KIM'),
('Biologi', 'BIO'),
('Sejarah', 'SEJ'),
('Pendidikan Agama Islam', 'PAI');

-- ============================================================
-- 4. academic_periods (2 periods)
-- ============================================================
INSERT INTO academic_periods (school_year, semester, start_date, end_date) VALUES
('2025/2026', 1, '2025-07-14', '2025-12-20'),
('2025/2026', 2, '2026-01-05', '2026-06-15');

-- ============================================================
-- 5. students (30 students distributed across classes)
-- Password for all: student123 (bcrypt hash)
-- ============================================================
INSERT INTO students (nis, name, username, password_hash, class_id) VALUES
-- X-A (class_id = 1)
('2025001', 'Ahmad Rizki Pratama', 'ahmad.rizki', '$2b$10$yL8kM2nO4pQ6rS8tU0vW1xA3cE5gH7iJ9kL1mN3oP5qR7sT9uV1w', 1),
('2025002', 'Budi Santoso', 'budi.santoso', '$2b$10$yL8kM2nO4pQ6rS8tU0vW1xA3cE5gH7iJ9kL1mN3oP5qR7sT9uV1w', 1),
('2025003', 'Citra Dewi Lestari', 'citra.dewi', '$2b$10$yL8kM2nO4pQ6rS8tU0vW1xA3cE5gH7iJ9kL1mN3oP5qR7sT9uV1w', 1),
('2025004', 'Diana Putri', 'diana.putri', '$2b$10$yL8kM2nO4pQ6rS8tU0vW1xA3cE5gH7iJ9kL1mN3oP5qR7sT9uV1w', 1),
('2025005', 'Eko Prasetyo', 'eko.prasetyo', '$2b$10$yL8kM2nO4pQ6rS8tU0vW1xA3cE5gH7iJ9kL1mN3oP5qR7sT9uV1w', 1),

-- X-B (class_id = 2)
('2025006', 'Fajar Nugroho', 'fajar.nugroho', '$2b$10$yL8kM2nO4pQ6rS8tU0vW1xA3cE5gH7iJ9kL1mN3oP5qR7sT9uV1w', 2),
('2025007', 'Gita Sari', 'gita.sari', '$2b$10$yL8kM2nO4pQ6rS8tU0vW1xA3cE5gH7iJ9kL1mN3oP5qR7sT9uV1w', 2),
('2025008', 'Hendra Wijaya', 'hendra.wijaya', '$2b$10$yL8kM2nO4pQ6rS8tU0vW1xA3cE5gH7iJ9kL1mN3oP5qR7sT9uV1w', 2),
('2025009', 'Indah Permata', 'indah.permata', '$2b$10$yL8kM2nO4pQ6rS8tU0vW1xA3cE5gH7iJ9kL1mN3oP5qR7sT9uV1w', 2),
('2025010', 'Joko Susilo', 'joko.susilo', '$2b$10$yL8kM2nO4pQ6rS8tU0vW1xA3cE5gH7iJ9kL1mN3oP5qR7sT9uV1w', 2),

-- XI-A (class_id = 3)
('2024001', 'Kartika Sari', 'kartika.sari', '$2b$10$yL8kM2nO4pQ6rS8tU0vW1xA3cE5gH7iJ9kL1mN3oP5qR7sT9uV1w', 3),
('2024002', 'Lukman Hakim', 'lukman.hakim', '$2b$10$yL8kM2nO4pQ6rS8tU0vW1xA3cE5gH7iJ9kL1mN3oP5qR7sT9uV1w', 3),
('2024003', 'Maya Anggraeni', 'maya.anggraeni', '$2b$10$yL8kM2nO4pQ6rS8tU0vW1xA3cE5gH7iJ9kL1mN3oP5qR7sT9uV1w', 3),
('2024004', 'Nanda Putra', 'nanda.putra', '$2b$10$yL8kM2nO4pQ6rS8tU0vW1xA3cE5gH7iJ9kL1mN3oP5qR7sT9uV1w', 3),
('2024005', 'Olivia Tan', 'olivia.tan', '$2b$10$yL8kM2nO4pQ6rS8tU0vW1xA3cE5gH7iJ9kL1mN3oP5qR7sT9uV1w', 3),

-- XI-B (class_id = 4)
('2024006', 'Putra Wijaya', 'putra.wijaya', '$2b$10$yL8kM2nO4pQ6rS8tU0vW1xA3cE5gH7iJ9kL1mN3oP5qR7sT9uV1w', 4),
('2024007', 'Qori Aulia', 'qori.aulia', '$2b$10$yL8kM2nO4pQ6rS8tU0vW1xA3cE5gH7iJ9kL1mN3oP5qR7sT9uV1w', 4),
('2024008', 'Rizal Firmansyah', 'rizal.firmansyah', '$2b$10$yL8kM2nO4pQ6rS8tU0vW1xA3cE5gH7iJ9kL1mN3oP5qR7sT9uV1w', 4),
('2024009', 'Siti Nurhaliza', 'siti.nurhaliza', '$2b$10$yL8kM2nO4pQ6rS8tU0vW1xA3cE5gH7iJ9kL1mN3oP5qR7sT9uV1w', 4),
('2024010', 'Tono Sugiarto', 'tono.sugiarto', '$2b$10$yL8kM2nO4pQ6rS8tU0vW1xA3cE5gH7iJ9kL1mN3oP5qR7sT9uV1w', 4),

-- XII-A (class_id = 5)
('2023001', 'Umar Bakri', 'umar.bakri', '$2b$10$yL8kM2nO4pQ6rS8tU0vW1xA3cE5gH7iJ9kL1mN3oP5qR7sT9uV1w', 5),
('2023002', 'Vina Panduwinata', 'vina.pandu', '$2b$10$yL8kM2nO4pQ6rS8tU0vW1xA3cE5gH7iJ9kL1mN3oP5qR7sT9uV1w', 5),
('2023003', 'Wahyu Hidayat', 'wahyu.hidayat', '$2b$10$yL8kM2nO4pQ6rS8tU0vW1xA3cE5gH7iJ9kL1mN3oP5qR7sT9uV1w', 5),
('2023004', 'Xena Putri', 'xena.putri', '$2b$10$yL8kM2nO4pQ6rS8tU0vW1xA3cE5gH7iJ9kL1mN3oP5qR7sT9uV1w', 5),
('2023005', 'Yusuf Maulana', 'yusuf.maulana', '$2b$10$yL8kM2nO4pQ6rS8tU0vW1xA3cE5gH7iJ9kL1mN3oP5qR7sT9uV1w', 5),

-- XII-B (class_id = 6)
('2023006', 'Zahra Amelia', 'zahra.amelia', '$2b$10$yL8kM2nO4pQ6rS8tU0vW1xA3cE5gH7iJ9kL1mN3oP5qR7sT9uV1w', 6),
('2023007', 'Aditya Pratama', 'aditya.pratama', '$2b$10$yL8kM2nO4pQ6rS8tU0vW1xA3cE5gH7iJ9kL1mN3oP5qR7sT9uV1w', 6),
('2023008', 'Bella Safitri', 'bella.safitri', '$2b$10$yL8kM2nO4pQ6rS8tU0vW1xA3cE5gH7iJ9kL1mN3oP5qR7sT9uV1w', 6),
('2023009', 'Cahyo Nugroho', 'cahyo.nugroho', '$2b$10$yL8kM2nO4pQ6rS8tU0vW1xA3cE5gH7iJ9kL1mN3oP5qR7sT9uV1w', 6),
('2023010', 'Dewi Lestari', 'dewi.lestari', '$2b$10$yL8kM2nO4pQ6rS8tU0vW1xA3cE5gH7iJ9kL1mN3oP5qR7sT9uV1w', 6);

-- ============================================================
-- 6. subject_teacher_assignments
-- ============================================================
INSERT INTO subject_teacher_assignments (teacher_id, class_id, subject_id, academic_period_id) VALUES
-- Arsito (teacher_id=2) teaches Math and Science
(2, 1, 1, 1), (2, 2, 1, 1), (2, 3, 1, 1), (2, 4, 1, 1), (2, 5, 1, 1), (2, 6, 1, 1),
(2, 1, 4, 1), (2, 2, 4, 1), (2, 3, 4, 1), (2, 4, 4, 1),
-- Alfian (teacher_id=3) teaches Languages and PAI
(3, 1, 2, 1), (3, 2, 2, 1), (3, 3, 2, 1), (3, 4, 2, 1),
(3, 1, 3, 1), (3, 2, 3, 1), (3, 3, 3, 1), (3, 4, 3, 1),
(3, 5, 8, 1), (3, 6, 8, 1);

-- ============================================================
-- 7. homeroom_assignments
-- ============================================================
INSERT INTO homeroom_assignments (teacher_id, class_id, academic_period_id) VALUES
(2, 1, 1),  -- Arsito -> X-A
(3, 2, 1),  -- Alfian -> X-B
(2, 3, 1),  -- Arsito -> XI-A
(3, 4, 1),  -- Alfian -> XI-B
(2, 5, 1),  -- Arsito -> XII-A
(3, 6, 1);  -- Alfian -> XII-B

-- ============================================================
-- 8. assignments (various types)
-- ============================================================
INSERT INTO assignments (subject_teacher_assignment_id, title, description, assignment_type, start_at, due_at, status) VALUES
-- Math assignments (sta_id = 1-6)
(1, 'Quiz Aljabar Dasar', 'Kerjakan soal-soal aljabar berikut', 'quiz', '2025-08-01 08:00:00', '2025-08-01 09:00:00', 'published'),
(1, 'Tugas Rumah Persamaan Linear', 'Selesaikan 10 soal persamaan linear', 'task', '2025-08-05 08:00:00', '2025-08-12 23:59:00', 'published'),
(2, 'Quiz Geometri', 'Kerjakan soal geometri berikut', 'quiz', '2025-08-03 08:00:00', '2025-08-03 09:00:00', 'published'),
-- Physics assignments (sta_id = 7-10)
(7, 'Tugas Praktikum Fisika', 'Upload laporan praktikum', 'upload', '2025-08-10 08:00:00', '2025-08-17 23:59:00', 'published'),
(7, 'Quiz Kinematika', 'Kerjakan soal kinematika', 'quiz', '2025-08-15 08:00:00', '2025-08-15 09:00:00', 'draft'),
-- Indonesian assignments (sta_id = 11-14)
(11, 'Tugas Menulis Esai', 'Tulis esai 500 kata tentang lingkungan', 'upload', '2025-08-05 08:00:00', '2025-08-15 23:59:00', 'published'),
(11, 'Quiz Tatabahasa', 'Kerjakan soal tatabahasa', 'quiz', '2025-08-20 08:00:00', '2025-08-20 09:00:00', 'published'),
-- English assignments (sta_id = 15-18)
(15, 'Tugas Reading Comprehension', 'Baca teks dan jawab pertanyaan', 'task', '2025-08-08 08:00:00', '2025-08-15 23:59:00', 'published'),
(15, 'Quiz Vocabulary', 'Kerjakan soal vocabulary', 'quiz', '2025-08-22 08:00:00', '2025-08-22 09:00:00', 'published');

-- ============================================================
-- 9. assignment_questions
-- ============================================================
INSERT INTO assignment_questions (assignment_id, question_text, question_type, points, question_order, answer_key) VALUES
-- Quiz Aljabar Dasar (assignment_id = 1)
(1, 'Hasil dari 2x + 3x adalah...', 'multiple_choice', 10, 1, '5x'),
(1, 'Jika x = 5, maka nilai dari 3x - 7 adalah...', 'multiple_choice', 10, 2, '8'),
(1, 'Penyelesaian dari 2x + 4 = 10 adalah...', 'short_answer', 10, 3, '3'),
(1, 'x² - 9 dapat difaktorkan menjadi...', 'short_answer', 10, 4, '(x+3)(x-3)'),
(1, 'Jelaskan langkah-langkah menyelesaikan persamaan linear dua variabel!', 'essay', 20, 5, NULL),

-- Tugas Rumah Persamaan Linear (assignment_id = 2)
(2, 'Selesaikan: 5x - 3 = 2x + 9', 'short_answer', 10, 1, '4'),
(2, 'Selesaikan: 3(x + 2) = 15', 'short_answer', 10, 2, '3'),
(2, 'Jika 2x + y = 10 dan x = 3, maka y = ...', 'short_answer', 10, 3, '4'),

-- Quiz Geometri (assignment_id = 3)
(3, 'Luas segitiga dengan alas 10 cm dan tinggi 8 cm adalah...', 'multiple_choice', 10, 1, '40 cm²'),
(3, 'Keliling lingkaran dengan jari-jari 7 cm adalah...', 'short_answer', 10, 2, '44 cm'),

-- Quiz Tatabahasa (assignment_id = 7)
(7, 'Kata "di mana" termasuk jenis kata...', 'multiple_choice', 10, 1, 'Kata tanya'),
(7, 'Kalimat yang menggunakan tanda baca yang benar adalah...', 'multiple_choice', 10, 2, 'B'),

-- Quiz Vocabulary (assignment_id = 9)
(9, 'The synonym of "happy" is...', 'multiple_choice', 10, 1, 'Joyful'),
(9, 'The antonym of "difficult" is...', 'multiple_choice', 10, 2, 'Easy');

-- ============================================================
-- 10. assignment_submissions (students submit assignments)
-- ============================================================
INSERT INTO assignment_submissions (assignment_id, student_id, started_at, submitted_at, status, total_score) VALUES
-- Students from X-A (students 1-5) submit Quiz Aljabar
(1, 1, '2025-08-01 08:00:00', '2025-08-01 08:45:00', 'graded', 45),
(1, 2, '2025-08-01 08:00:00', '2025-08-01 08:50:00', 'graded', 50),
(1, 3, '2025-08-01 08:00:00', '2025-08-01 08:55:00', 'graded', 40),
(1, 4, '2025-08-01 08:00:00', '2025-08-01 08:40:00', 'graded', 55),
(1, 5, '2025-08-01 08:00:00', '2025-08-01 08:52:00', 'graded', 48),

-- Students from X-A submit Tugas Persamaan Linear
(2, 1, '2025-08-05 10:00:00', '2025-08-10 15:00:00', 'graded', 28),
(2, 2, '2025-08-06 09:00:00', '2025-08-11 14:00:00', 'graded', 30),
(2, 3, '2025-08-07 08:00:00', '2025-08-12 16:00:00', 'graded', 25),

-- Students from X-B (students 6-10) submit Quiz Geometri
(3, 6, '2025-08-03 08:00:00', '2025-08-03 08:40:00', 'graded', 18),
(3, 7, '2025-08-03 08:00:00', '2025-08-03 08:45:00', 'graded', 20),
(3, 8, '2025-08-03 08:00:00', '2025-08-03 08:50:00', 'graded', 15),
(3, 9, '2025-08-03 08:00:00', '2025-08-03 08:35:00', 'graded', 19),
(3, 10, '2025-08-03 08:00:00', '2025-08-03 08:48:00', 'graded', 17),

-- Students from XI-A (students 11-15) submit Tugas Menulis Esai
(6, 11, '2025-08-06 10:00:00', '2025-08-14 20:00:00', 'graded', 85),
(6, 12, '2025-08-07 09:00:00', '2025-08-13 18:00:00', 'graded', 90),
(6, 13, '2025-08-08 08:00:00', '2025-08-15 19:00:00', 'graded', 78),
(6, 14, '2025-08-09 11:00:00', '2025-08-14 21:00:00', 'graded', 88),
(6, 15, '2025-08-10 10:00:00', '2025-08-15 17:00:00', 'graded', 92),

-- Students from XI-A submit Quiz Tatabahasa
(7, 11, '2025-08-20 08:00:00', '2025-08-20 08:30:00', 'graded', 18),
(7, 12, '2025-08-20 08:00:00', '2025-08-20 08:35:00', 'graded', 20),
(7, 13, '2025-08-20 08:00:00', '2025-08-20 08:40:00', 'graded', 16),
(7, 14, '2025-08-20 08:00:00', '2025-08-20 08:32:00', 'graded', 19),
(7, 15, '2025-08-20 08:00:00', '2025-08-20 08:38:00', 'graded', 17),

-- Students from XI-B (students 16-20) submit Tugas Reading Comprehension
(8, 16, '2025-08-09 10:00:00', '2025-08-14 15:00:00', 'graded', 82),
(8, 17, '2025-08-10 09:00:00', '2025-08-13 14:00:00', 'graded', 88),
(8, 18, '2025-08-11 08:00:00', '2025-08-15 16:00:00', 'graded', 75),
(8, 19, '2025-08-12 11:00:00', '2025-08-14 20:00:00', 'graded', 90),
(8, 20, '2025-08-13 10:00:00', '2025-08-15 18:00:00', 'graded', 85),

-- Students from XI-B submit Quiz Vocabulary
(9, 16, '2025-08-22 08:00:00', '2025-08-22 08:25:00', 'graded', 16),
(9, 17, '2025-08-22 08:00:00', '2025-08-22 08:30:00', 'graded', 20),
(9, 18, '2025-08-22 08:00:00', '2025-08-22 08:35:00', 'graded', 14),
(9, 19, '2025-08-22 08:00:00', '2025-08-22 08:28:00', 'graded', 18),
(9, 20, '2025-08-22 08:00:00', '2025-08-22 08:32:00', 'graded', 15);

-- ============================================================
-- 11. submission_answers
-- ============================================================
INSERT INTO submission_answers (submission_id, question_id, answer, score, is_correct, graded_at) VALUES
-- Submission 1 (student 1, Quiz Aljabar)
(1, 1, '5x', 10, 1, '2025-08-01 09:00:00'),
(1, 2, '8', 10, 1, '2025-08-01 09:00:00'),
(1, 3, '3', 10, 1, '2025-08-01 09:00:00'),
(1, 4, '(x+3)(x-3)', 10, 1, '2025-08-01 09:00:00'),
(1, 5, 'Substitusi dan eliminasi', 5, 0, '2025-08-01 09:00:00'),

-- Submission 2 (student 2, Quiz Aljabar)
(2, 1, '5x', 10, 1, '2025-08-01 09:00:00'),
(2, 2, '8', 10, 1, '2025-08-01 09:00:00'),
(2, 3, '3', 10, 1, '2025-08-01 09:00:00'),
(2, 4, '(x+3)(x-3)', 10, 1, '2025-08-01 09:00:00'),
(2, 5, 'Langkah-langkah lengkap', 10, 1, '2025-08-01 09:00:00'),

-- Submission 6 (student 1, Tugas Persamaan Linear)
(6, 6, '4', 10, 1, '2025-08-12 10:00:00'),
(6, 7, '3', 10, 1, '2025-08-12 10:00:00'),
(6, 8, '4', 8, 1, '2025-08-12 10:00:00'),

-- Submission 9 (student 6, Quiz Geometri)
(9, 9, '40 cm²', 10, 1, '2025-08-03 09:00:00'),
(9, 10, '44 cm', 8, 1, '2025-08-03 09:00:00'),

-- Submission 14 (student 11, Quiz Tatabahasa)
(19, 11, 'Kata tanya', 10, 1, '2025-08-20 09:00:00'),
(19, 12, 'B', 8, 1, '2025-08-20 09:00:00'),

-- Submission 24 (student 16, Quiz Vocabulary)
(29, 13, 'Joyful', 8, 1, '2025-08-22 09:00:00'),
(29, 14, 'Easy', 8, 1, '2025-08-22 09:00:00');

-- ============================================================
-- 12. materials
-- ============================================================
INSERT INTO materials (subject_teacher_assignment_id, title, description, content) VALUES
(1, 'Materi Aljabar Dasar', 'Pengenalan konsep aljabar untuk kelas X', 'Aljabar adalah cabang matematika yang menggunakan huruf untuk mewakili angka. Konsep dasar meliputi variabel, konstanta, koefisien, dan operasi aljabar.'),
(1, 'Rumus Persamaan Linear', 'Kumpulan rumus persamaan linear', 'Persamaan linear satu variabel: ax + b = c. Persamaan linear dua variabel: ax + by = c.'),
(2, 'Materi Geometri', 'Konsep dasar geometri', 'Geometri adalah cabang matematika yang mempelajari bentuk, ukuran, posisi, dan sifat-sifat ruang.'),
(7, 'Materi Kinematika', 'Konsep gerak dan kinematika', 'Kinematika adalah cabang fisika yang mempelajari gerak benda tanpa memperhatikan penyebab geraknya.'),
(11, 'Panduan Menulis Esai', 'Cara menulis esai yang baik', 'Esai terdiri dari tiga bagian: pendahuluan, isi, dan penutup. Gunakan kalimat topik yang jelas di setiap paragraf.'),
(15, 'Vocabulary List - Unit 1', 'Daftar kosakata bahasa Inggris', 'Important vocabulary: environment (lingkungan), sustainable (berkelanjutan), conservation (pelestarian), ecosystem (ekosistem).');

-- ============================================================
-- 13. attitudes (penilaian sikap)
-- ============================================================
INSERT INTO attitudes (student_id, class_id, academic_period_id, teacher_id, score, description) VALUES
-- X-A students (teacher_id=2, Arsito)
(1, 1, 1, 2, 'A', 'Sangat baik dalam berpartisipasi di kelas'),
(2, 1, 1, 2, 'B', 'Baik, perlu lebih aktif bertanya'),
(3, 1, 1, 2, 'A', 'Sangat sopan dan rajin'),
(4, 1, 1, 2, 'B', 'Cukup baik, perlu meningkatkan kedisiplinan'),
(5, 1, 1, 2, 'A', 'Sangat baik dalam kerja kelompok'),

-- X-B students (teacher_id=3, Alfian)
(6, 2, 1, 3, 'B', 'Baik, perlu lebih fokus saat pelajaran'),
(7, 2, 1, 3, 'A', 'Sangat baik dan membantu teman'),
(8, 2, 1, 3, 'B', 'Cukup baik, perlu tepat waktu'),
(9, 2, 1, 3, 'A', 'Sangat aktif dan positif'),
(10, 2, 1, 3, 'B', 'Baik, perlu lebih sopan'),

-- XI-A students (teacher_id=2, Arsito)
(11, 3, 1, 2, 'A', 'Sangat baik dalam kepemimpinan'),
(12, 3, 1, 2, 'A', 'Sangat rajin dan disiplin'),
(13, 3, 1, 2, 'B', 'Baik, perlu lebih percaya diri'),
(14, 3, 1, 2, 'A', 'Sangat baik dalam kolaborasi'),
(15, 3, 1, 2, 'A', 'Sangat baik dan menjadi contoh'),

-- XI-B students (teacher_id=3, Alfian)
(16, 4, 1, 3, 'B', 'Baik, perlu lebih konsentrasi'),
(17, 4, 1, 3, 'A', 'Sangat baik dan sopan'),
(18, 4, 1, 3, 'B', 'Cukup baik, perlu lebih aktif'),
(19, 4, 1, 3, 'A', 'Sangat baik dalam diskusi'),
(20, 4, 1, 3, 'B', 'Baik, perlu tepat waktu'),

-- XII-A students (teacher_id=2, Arsito)
(21, 5, 1, 2, 'A', 'Sangat baik dan menjadi panutan'),
(22, 5, 1, 2, 'A', 'Sangat rajin dan bertanggung jawab'),
(23, 5, 1, 2, 'B', 'Baik, perlu lebih fokus'),
(24, 5, 1, 2, 'A', 'Sangat baik dalam membantu teman'),
(25, 5, 1, 2, 'A', 'Sangat baik dan disiplin'),

-- XII-B students (teacher_id=3, Alfian)
(26, 6, 1, 3, 'B', 'Baik, perlu lebih sopan'),
(27, 6, 1, 3, 'A', 'Sangat baik dan aktif'),
(28, 6, 1, 3, 'B', 'Cukup baik, perlu lebih rajin'),
(29, 6, 1, 3, 'A', 'Sangat baik dalam kerja sama'),
(30, 6, 1, 3, 'B', 'Baik, perlu lebih disiplin');
