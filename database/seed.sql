-- ============================================================
-- LMS Dummy Data (SQLite)
-- ============================================================
-- Run: sqlite3 database/lms.db < database/seed.sql
-- ============================================================

PRAGMA foreign_keys = ON;

-- ============================================================
-- 1. users (37 accounts: 1 headmaster + 6 teachers + 30 students)
-- Staff password: admin123 (bcrypt hash)
-- Student password: student123 (bcrypt hash)
-- ============================================================
INSERT INTO users (name, username, password_hash, role) VALUES
('Baim Kepala Sekolah', 'adminbaim', '$2a$10$dLZfsoCNXL7INlB1e1KbX.66qDwl4U7541qRR5ju3ZpjPyeB3VgoK', 'headmaster'),
('Arsito Guru', 'adminarsito', '$2a$10$dLZfsoCNXL7INlB1e1KbX.66qDwl4U7541qRR5ju3ZpjPyeB3VgoK', 'teacher'),
('Alfian Guru', 'adminalfian', '$2a$10$dLZfsoCNXL7INlB1e1KbX.66qDwl4U7541qRR5ju3ZpjPyeB3VgoK', 'teacher'),
('Sari Kimia', 'adminsari', '$2a$10$dLZfsoCNXL7INlB1e1KbX.66qDwl4U7541qRR5ju3ZpjPyeB3VgoK', 'teacher'),
('Dedi Biologi', 'admindedi', '$2a$10$dLZfsoCNXL7INlB1e1KbX.66qDwl4U7541qRR5ju3ZpjPyeB3VgoK', 'teacher'),
('Rina Sejarah', 'adminrina', '$2a$10$dLZfsoCNXL7INlB1e1KbX.66qDwl4U7541qRR5ju3ZpjPyeB3VgoK', 'teacher'),
('Hadi PAI', 'adminhadi', '$2a$10$dLZfsoCNXL7INlB1e1KbX.66qDwl4U7541qRR5ju3ZpjPyeB3VgoK', 'teacher'),
('Ahmad Rizki Pratama', 'ahmad.rizki', '$2a$10$Q8UodgDcfqBC7iK3ryUite0jXDYpS9aZ.kSfeSlJsyLoM1XM8m6WS', 'student'),
('Budi Santoso', 'budi.santoso', '$2a$10$Q8UodgDcfqBC7iK3ryUite0jXDYpS9aZ.kSfeSlJsyLoM1XM8m6WS', 'student'),
('Citra Dewi Lestari', 'citra.dewi', '$2a$10$Q8UodgDcfqBC7iK3ryUite0jXDYpS9aZ.kSfeSlJsyLoM1XM8m6WS', 'student'),
('Diana Putri', 'diana.putri', '$2a$10$Q8UodgDcfqBC7iK3ryUite0jXDYpS9aZ.kSfeSlJsyLoM1XM8m6WS', 'student'),
('Eko Prasetyo', 'eko.prasetyo', '$2a$10$Q8UodgDcfqBC7iK3ryUite0jXDYpS9aZ.kSfeSlJsyLoM1XM8m6WS', 'student'),
('Fajar Nugroho', 'fajar.nugroho', '$2a$10$Q8UodgDcfqBC7iK3ryUite0jXDYpS9aZ.kSfeSlJsyLoM1XM8m6WS', 'student'),
('Gita Sari', 'gita.sari', '$2a$10$Q8UodgDcfqBC7iK3ryUite0jXDYpS9aZ.kSfeSlJsyLoM1XM8m6WS', 'student'),
('Hendra Wijaya', 'hendra.wijaya', '$2a$10$Q8UodgDcfqBC7iK3ryUite0jXDYpS9aZ.kSfeSlJsyLoM1XM8m6WS', 'student'),
('Indah Permata', 'indah.permata', '$2a$10$Q8UodgDcfqBC7iK3ryUite0jXDYpS9aZ.kSfeSlJsyLoM1XM8m6WS', 'student'),
('Joko Susilo', 'joko.susilo', '$2a$10$Q8UodgDcfqBC7iK3ryUite0jXDYpS9aZ.kSfeSlJsyLoM1XM8m6WS', 'student'),
('Kartika Sari', 'kartika.sari', '$2a$10$Q8UodgDcfqBC7iK3ryUite0jXDYpS9aZ.kSfeSlJsyLoM1XM8m6WS', 'student'),
('Lukman Hakim', 'lukman.hakim', '$2a$10$Q8UodgDcfqBC7iK3ryUite0jXDYpS9aZ.kSfeSlJsyLoM1XM8m6WS', 'student'),
('Maya Anggraeni', 'maya.anggraeni', '$2a$10$Q8UodgDcfqBC7iK3ryUite0jXDYpS9aZ.kSfeSlJsyLoM1XM8m6WS', 'student'),
('Nanda Putra', 'nanda.putra', '$2a$10$Q8UodgDcfqBC7iK3ryUite0jXDYpS9aZ.kSfeSlJsyLoM1XM8m6WS', 'student'),
('Olivia Tan', 'olivia.tan', '$2a$10$Q8UodgDcfqBC7iK3ryUite0jXDYpS9aZ.kSfeSlJsyLoM1XM8m6WS', 'student'),
('Putra Wijaya', 'putra.wijaya', '$2a$10$Q8UodgDcfqBC7iK3ryUite0jXDYpS9aZ.kSfeSlJsyLoM1XM8m6WS', 'student'),
('Qori Aulia', 'qori.aulia', '$2a$10$Q8UodgDcfqBC7iK3ryUite0jXDYpS9aZ.kSfeSlJsyLoM1XM8m6WS', 'student'),
('Rizal Firmansyah', 'rizal.firmansyah', '$2a$10$Q8UodgDcfqBC7iK3ryUite0jXDYpS9aZ.kSfeSlJsyLoM1XM8m6WS', 'student'),
('Siti Nurhaliza', 'siti.nurhaliza', '$2a$10$Q8UodgDcfqBC7iK3ryUite0jXDYpS9aZ.kSfeSlJsyLoM1XM8m6WS', 'student'),
('Tono Sugiarto', 'tono.sugiarto', '$2a$10$Q8UodgDcfqBC7iK3ryUite0jXDYpS9aZ.kSfeSlJsyLoM1XM8m6WS', 'student'),
('Umar Bakri', 'umar.bakri', '$2a$10$Q8UodgDcfqBC7iK3ryUite0jXDYpS9aZ.kSfeSlJsyLoM1XM8m6WS', 'student'),
('Vina Panduwinata', 'vina.pandu', '$2a$10$Q8UodgDcfqBC7iK3ryUite0jXDYpS9aZ.kSfeSlJsyLoM1XM8m6WS', 'student'),
('Wahyu Hidayat', 'wahyu.hidayat', '$2a$10$Q8UodgDcfqBC7iK3ryUite0jXDYpS9aZ.kSfeSlJsyLoM1XM8m6WS', 'student'),
('Xena Putri', 'xena.putri', '$2a$10$Q8UodgDcfqBC7iK3ryUite0jXDYpS9aZ.kSfeSlJsyLoM1XM8m6WS', 'student'),
('Yusuf Maulana', 'yusuf.maulana', '$2a$10$Q8UodgDcfqBC7iK3ryUite0jXDYpS9aZ.kSfeSlJsyLoM1XM8m6WS', 'student'),
('Zahra Amelia', 'zahra.amelia', '$2a$10$Q8UodgDcfqBC7iK3ryUite0jXDYpS9aZ.kSfeSlJsyLoM1XM8m6WS', 'student'),
('Aditya Pratama', 'aditya.pratama', '$2a$10$Q8UodgDcfqBC7iK3ryUite0jXDYpS9aZ.kSfeSlJsyLoM1XM8m6WS', 'student'),
('Bella Safitri', 'bella.safitri', '$2a$10$Q8UodgDcfqBC7iK3ryUite0jXDYpS9aZ.kSfeSlJsyLoM1XM8m6WS', 'student'),
('Cahyo Nugroho', 'cahyo.nugroho', '$2a$10$Q8UodgDcfqBC7iK3ryUite0jXDYpS9aZ.kSfeSlJsyLoM1XM8m6WS', 'student'),
('Dewi Lestari', 'dewi.lestari', '$2a$10$Q8UodgDcfqBC7iK3ryUite0jXDYpS9aZ.kSfeSlJsyLoM1XM8m6WS', 'student');

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
-- 5. students (30 academic profiles linked to users)
-- ============================================================
INSERT INTO students (user_id, nis, name, class_id) VALUES
-- X-A (class_id = 1)
((SELECT id FROM users WHERE username = 'ahmad.rizki'), '2025001', 'Ahmad Rizki Pratama', 1),
((SELECT id FROM users WHERE username = 'budi.santoso'), '2025002', 'Budi Santoso', 1),
((SELECT id FROM users WHERE username = 'citra.dewi'), '2025003', 'Citra Dewi Lestari', 1),
((SELECT id FROM users WHERE username = 'diana.putri'), '2025004', 'Diana Putri', 1),
((SELECT id FROM users WHERE username = 'eko.prasetyo'), '2025005', 'Eko Prasetyo', 1),

-- X-B (class_id = 2)
((SELECT id FROM users WHERE username = 'fajar.nugroho'), '2025006', 'Fajar Nugroho', 2),
((SELECT id FROM users WHERE username = 'gita.sari'), '2025007', 'Gita Sari', 2),
((SELECT id FROM users WHERE username = 'hendra.wijaya'), '2025008', 'Hendra Wijaya', 2),
((SELECT id FROM users WHERE username = 'indah.permata'), '2025009', 'Indah Permata', 2),
((SELECT id FROM users WHERE username = 'joko.susilo'), '2025010', 'Joko Susilo', 2),

-- XI-A (class_id = 3)
((SELECT id FROM users WHERE username = 'kartika.sari'), '2024001', 'Kartika Sari', 3),
((SELECT id FROM users WHERE username = 'lukman.hakim'), '2024002', 'Lukman Hakim', 3),
((SELECT id FROM users WHERE username = 'maya.anggraeni'), '2024003', 'Maya Anggraeni', 3),
((SELECT id FROM users WHERE username = 'nanda.putra'), '2024004', 'Nanda Putra', 3),
((SELECT id FROM users WHERE username = 'olivia.tan'), '2024005', 'Olivia Tan', 3),

-- XI-B (class_id = 4)
((SELECT id FROM users WHERE username = 'putra.wijaya'), '2024006', 'Putra Wijaya', 4),
((SELECT id FROM users WHERE username = 'qori.aulia'), '2024007', 'Qori Aulia', 4),
((SELECT id FROM users WHERE username = 'rizal.firmansyah'), '2024008', 'Rizal Firmansyah', 4),
((SELECT id FROM users WHERE username = 'siti.nurhaliza'), '2024009', 'Siti Nurhaliza', 4),
((SELECT id FROM users WHERE username = 'tono.sugiarto'), '2024010', 'Tono Sugiarto', 4),

-- XII-A (class_id = 5)
((SELECT id FROM users WHERE username = 'umar.bakri'), '2023001', 'Umar Bakri', 5),
((SELECT id FROM users WHERE username = 'vina.pandu'), '2023002', 'Vina Panduwinata', 5),
((SELECT id FROM users WHERE username = 'wahyu.hidayat'), '2023003', 'Wahyu Hidayat', 5),
((SELECT id FROM users WHERE username = 'xena.putri'), '2023004', 'Xena Putri', 5),
((SELECT id FROM users WHERE username = 'yusuf.maulana'), '2023005', 'Yusuf Maulana', 5),

-- XII-B (class_id = 6)
((SELECT id FROM users WHERE username = 'zahra.amelia'), '2023006', 'Zahra Amelia', 6),
((SELECT id FROM users WHERE username = 'aditya.pratama'), '2023007', 'Aditya Pratama', 6),
((SELECT id FROM users WHERE username = 'bella.safitri'), '2023008', 'Bella Safitri', 6),
((SELECT id FROM users WHERE username = 'cahyo.nugroho'), '2023009', 'Cahyo Nugroho', 6),
((SELECT id FROM users WHERE username = 'dewi.lestari'), '2023010', 'Dewi Lestari', 6);

-- ============================================================
-- 6. subject_teacher_assignments
-- ============================================================
INSERT INTO subject_teacher_assignments (teacher_id, class_id, subject_id, academic_period_id) VALUES
-- Arsito (teacher_id=2) teaches Math across all classes
(2, 1, 1, 1), (2, 2, 1, 1), (2, 3, 1, 1), (2, 4, 1, 1), (2, 5, 1, 1), (2, 6, 1, 1),
-- Arsito teaches Physics to X and XI
(2, 1, 4, 1), (2, 2, 4, 1), (2, 3, 4, 1), (2, 4, 4, 1),
-- Alfian (teacher_id=3) teaches Indonesian across all classes
(3, 1, 2, 1), (3, 2, 2, 1), (3, 3, 2, 1), (3, 4, 2, 1), (3, 5, 2, 1), (3, 6, 2, 1),
-- Alfian teaches English across all classes
(3, 1, 3, 1), (3, 2, 3, 1), (3, 3, 3, 1), (3, 4, 3, 1), (3, 5, 3, 1), (3, 6, 3, 1),
-- Sari (teacher_id=4) teaches Chemistry to XI and XII
(4, 3, 5, 1), (4, 4, 5, 1), (4, 5, 5, 1), (4, 6, 5, 1),
-- Dedi (teacher_id=5) teaches Biology to XI and XII
(5, 3, 6, 1), (5, 4, 6, 1), (5, 5, 6, 1), (5, 6, 6, 1),
-- Rina (teacher_id=6) teaches History to all classes
(6, 1, 7, 1), (6, 2, 7, 1), (6, 3, 7, 1), (6, 4, 7, 1), (6, 5, 7, 1), (6, 6, 7, 1),
-- Hadi (teacher_id=7) teaches PAI to all classes
(7, 1, 8, 1), (7, 2, 8, 1), (7, 3, 8, 1), (7, 4, 8, 1), (7, 5, 8, 1), (7, 6, 8, 1);

-- ============================================================
-- 7. homeroom_assignments
-- ============================================================
INSERT INTO homeroom_assignments (teacher_id, class_id, academic_period_id) VALUES
(2, 1, 1),  -- Arsito -> X-A
(3, 2, 1),  -- Alfian -> X-B
(4, 3, 1),  -- Sari -> XI-A
(5, 4, 1),  -- Dedi -> XI-B
(6, 5, 1),  -- Rina -> XII-A
(7, 6, 1);  -- Hadi -> XII-B

-- ============================================================
-- 8. assignments (various types, 24 total)
-- ============================================================
INSERT INTO assignments (subject_teacher_assignment_id, title, description, assignment_type, start_at, due_at, status) VALUES
-- === MATEMATIKA ===
-- X-A Math (sta_id=1)
(1, 'Quiz Aljabar Dasar', 'Kerjakan soal-soal aljabar berikut', 'quiz', '2025-08-01 08:00:00', '2025-08-01 09:00:00', 'published'),
(1, 'Tugas Rumah Persamaan Linear', 'Selesaikan 10 soal persamaan linear', 'task', '2025-08-05 08:00:00', '2025-08-12 23:59:00', 'published'),
-- X-B Math (sta_id=2)
(2, 'Quiz Geometri', 'Kerjakan soal geometri berikut', 'quiz', '2025-08-03 08:00:00', '2025-08-03 09:00:00', 'published'),
(2, 'Tugas Statistika Dasar', 'Analisis data statistik sederhana', 'task', '2025-08-10 08:00:00', '2025-08-17 23:59:00', 'published'),
-- XI-A Math (sta_id=3)
(3, 'Quiz Trigonometri', 'Kerjakan soal trigonometri', 'quiz', '2025-08-05 08:00:00', '2025-08-05 09:30:00', 'published'),
(3, 'Tugas Turunan', 'Selesaikan soal turunan fungsi', 'task', '2025-08-12 08:00:00', '2025-08-19 23:59:00', 'published'),
-- XII-A Math (sta_id=5)
(5, 'Quiz Integral', 'Kerjakan soal integral', 'quiz', '2025-08-08 08:00:00', '2025-08-08 09:30:00', 'published'),
(5, 'Tugas Matematika Lanjutan', 'Soal-soal campuran matematika lanjutan', 'task', '2025-08-15 08:00:00', '2025-08-22 23:59:00', 'published'),

-- === FISIKA ===
-- X-A Physics (sta_id=7)
(7, 'Tugas Praktikum Fisika', 'Upload laporan praktikum', 'upload', '2025-08-10 08:00:00', '2025-08-17 23:59:00', 'published'),
(7, 'Quiz Kinematika', 'Kerjakan soal kinematika', 'quiz', '2025-08-15 08:00:00', '2025-08-15 09:00:00', 'draft'),
-- XI-A Physics (sta_id=9)
(9, 'Quiz Termodinamika', 'Kerjakan soal termodinamika', 'quiz', '2025-08-12 08:00:00', '2025-08-12 09:30:00', 'published'),
(9, 'Tugas Laporan Optik', 'Upload laporan eksperimen optik', 'upload', '2025-08-18 08:00:00', '2025-08-25 23:59:00', 'published'),

-- === BAHASA INDONESIA ===
-- X-A Indonesian (sta_id=11)
(11, 'Tugas Menulis Esai', 'Tulis esai 500 kata tentang lingkungan', 'upload', '2025-08-05 08:00:00', '2025-08-15 23:59:00', 'published'),
(11, 'Quiz Tatabahasa', 'Kerjakan soal tatabahasa', 'quiz', '2025-08-20 08:00:00', '2025-08-20 09:00:00', 'published'),
-- XI-A Indonesian (sta_id=13)
(13, 'Tugas Analisis Puisi', 'Analisis puisi pilihanmu', 'upload', '2025-08-08 08:00:00', '2025-08-18 23:59:00', 'published'),
(13, 'Quiz Sastra Indonesia', 'Kerjakan soal sastra Indonesia', 'quiz', '2025-08-22 08:00:00', '2025-08-22 09:00:00', 'published'),

-- === BAHASA INGGRIS ===
-- X-A English (sta_id=17)
(17, 'Tugas Reading Comprehension', 'Baca teks dan jawab pertanyaan', 'task', '2025-08-08 08:00:00', '2025-08-15 23:59:00', 'published'),
(17, 'Quiz Vocabulary', 'Kerjakan soal vocabulary', 'quiz', '2025-08-22 08:00:00', '2025-08-22 09:00:00', 'published'),
-- XI-A English (sta_id=19)
(19, 'Tugas Writing Essay', 'Write a 300-word essay about technology', 'upload', '2025-08-10 08:00:00', '2025-08-20 23:59:00', 'published'),
(19, 'Quiz Grammar', 'Complete the grammar exercises', 'quiz', '2025-08-25 08:00:00', '2025-08-25 09:00:00', 'published'),

-- === KIMIA ===
-- XI-A Chemistry (sta_id=23)
(23, 'Quiz Stoikiometri', 'Kerjakan soal stoikiometri', 'quiz', '2025-08-10 08:00:00', '2025-08-10 09:30:00', 'published'),
(23, 'Tugas Laporan Kimia', 'Upload laporan praktikum kimia', 'upload', '2025-08-15 08:00:00', '2025-08-22 23:59:00', 'published'),

-- === BIOLOGI ===
-- XI-A Biology (sta_id=27)
(27, 'Quiz Ekosistem', 'Kerjakan soal ekosistem', 'quiz', '2025-08-12 08:00:00', '2025-08-12 09:00:00', 'published'),
(27, 'Tugas Observasi Lingkungan', 'Upload hasil observasi lingkungan', 'upload', '2025-08-18 08:00:00', '2025-08-25 23:59:00', 'published'),

-- === SEJARAH ===
-- X-A History (sta_id=33)
(33, 'Quiz Sejarah Kemerdekaan', 'Kerjakan soal sejarah kemerdekaan', 'quiz', '2025-08-06 08:00:00', '2025-08-06 09:00:00', 'published'),
(33, 'Tugas Makalah Sejarah', 'Tulis makalah tentang perjuangan kemerdekaan', 'task', '2025-08-12 08:00:00', '2025-08-20 23:59:00', 'published'),

-- === PAI ===
-- X-A PAI (sta_id=39)
(39, 'Quiz Akhlak', 'Kerjakan soal tentang akhlak', 'quiz', '2025-08-07 08:00:00', '2025-08-07 09:00:00', 'published'),
(39, 'Tugas Refleksi Diri', 'Tulis refleksi diri tentang nilai-nilai kebaikan', 'task', '2025-08-14 08:00:00', '2025-08-21 23:59:00', 'published');

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

-- Quiz Trigonometri (assignment_id = 5)
(5, 'Nilai sin 30° adalah...', 'multiple_choice', 10, 1, '0.5'),
(5, 'Jika tan A = 3/4, maka sin A = ...', 'short_answer', 10, 2, '3/5'),

-- Quiz Integral (assignment_id = 7)
(7, 'Hasil dari ∫2x dx adalah...', 'short_answer', 10, 1, 'x² + C'),
(7, 'Hasil dari ∫(3x² + 2x) dx adalah...', 'short_answer', 10, 2, 'x³ + x² + C'),

-- Quiz Tatabahasa (assignment_id = 14)
(14, 'Kata "di mana" termasuk jenis kata...', 'multiple_choice', 10, 1, 'Kata tanya'),
(14, 'Kalimat yang menggunakan tanda baca yang benar adalah...', 'multiple_choice', 10, 2, 'B'),

-- Quiz Vocabulary (assignment_id = 18)
(18, 'The synonym of "happy" is...', 'multiple_choice', 10, 1, 'Joyful'),
(18, 'The antonym of "difficult" is...', 'multiple_choice', 10, 2, 'Easy'),

-- Quiz Grammar (assignment_id = 20)
(20, 'Choose the correct form: "She ___ to school every day"', 'multiple_choice', 10, 1, 'goes'),
(20, 'Identify the tense: "They have been working for hours"', 'short_answer', 10, 2, 'Present Perfect Continuous'),

-- Quiz Stoikiometri (assignment_id = 21)
(21, 'Mol dari 18 gram H₂O adalah...', 'short_answer', 10, 1, '1 mol'),
(21, 'Reaksi setara dari 2H₂ + O₂ → 2H₂O menunjukkan...', 'multiple_choice', 10, 2, 'Hukum kekekalan massa'),

-- Quiz Ekosistem (assignment_id = 23)
(23, 'Rantai makanan dimulai dari...', 'multiple_choice', 10, 1, 'Produsen'),
(23, 'Organisme yang berperan sebagai dekompositor adalah...', 'short_answer', 10, 2, 'Jamur dan bakteri'),

-- Quiz Sejarah Kemerdekaan (assignment_id = 25)
(25, 'Proklamasi kemerdekaan Indonesia dibacakan pada tanggal...', 'multiple_choice', 10, 1, '17 Agustus 1945'),
(25, 'Siapa yang membacakan teks proklamasi?', 'short_answer', 10, 2, 'Ir. Soekarno'),

-- Quiz Akhlak (assignment_id = 27)
(27, 'Akhlak terpuji yang artinya jujur adalah...', 'multiple_choice', 10, 1, 'Siddiq'),
(27, 'Sebutkan 3 contoh akhlak terpuji dalam kehidupan sehari-hari!', 'essay', 15, 2, NULL);

-- ============================================================
-- 10. assignment_submissions (students submit assignments)
-- ============================================================
INSERT INTO assignment_submissions (assignment_id, student_id, started_at, submitted_at, status, total_score) VALUES
-- === Quiz Aljabar (X-A, students 1-5) ===
(1, 1, '2025-08-01 08:00:00', '2025-08-01 08:45:00', 'graded', 45),
(1, 2, '2025-08-01 08:00:00', '2025-08-01 08:50:00', 'graded', 50),
(1, 3, '2025-08-01 08:00:00', '2025-08-01 08:55:00', 'graded', 40),
(1, 4, '2025-08-01 08:00:00', '2025-08-01 08:40:00', 'graded', 55),
(1, 5, '2025-08-01 08:00:00', '2025-08-01 08:52:00', 'graded', 48),

-- === Tugas Persamaan Linear (X-A, students 1-3) ===
(2, 1, '2025-08-05 10:00:00', '2025-08-10 15:00:00', 'graded', 28),
(2, 2, '2025-08-06 09:00:00', '2025-08-11 14:00:00', 'graded', 30),
(2, 3, '2025-08-07 08:00:00', '2025-08-12 16:00:00', 'graded', 25),

-- === Quiz Geometri (X-B, students 6-10) ===
(3, 6, '2025-08-03 08:00:00', '2025-08-03 08:40:00', 'graded', 18),
(3, 7, '2025-08-03 08:00:00', '2025-08-03 08:45:00', 'graded', 20),
(3, 8, '2025-08-03 08:00:00', '2025-08-03 08:50:00', 'graded', 15),
(3, 9, '2025-08-03 08:00:00', '2025-08-03 08:35:00', 'graded', 19),
(3, 10, '2025-08-03 08:00:00', '2025-08-03 08:48:00', 'graded', 17),

-- === Tugas Statistika (X-B, students 6-10) ===
(4, 6, '2025-08-11 09:00:00', '2025-08-16 14:00:00', 'graded', 85),
(4, 7, '2025-08-12 10:00:00', '2025-08-15 16:00:00', 'graded', 90),
(4, 8, '2025-08-13 08:00:00', '2025-08-17 12:00:00', 'graded', 78),
(4, 9, '2025-08-11 11:00:00', '2025-08-16 18:00:00', 'graded', 88),
(4, 10, '2025-08-14 09:00:00', '2025-08-17 15:00:00', 'graded', 82),

-- === Quiz Trigonometri (XI-A, students 11-15) ===
(5, 11, '2025-08-05 08:00:00', '2025-08-05 09:10:00', 'graded', 18),
(5, 12, '2025-08-05 08:00:00', '2025-08-05 09:15:00', 'graded', 20),
(5, 13, '2025-08-05 08:00:00', '2025-08-05 09:20:00', 'graded', 15),
(5, 14, '2025-08-05 08:00:00', '2025-08-05 09:05:00', 'graded', 19),
(5, 15, '2025-08-05 08:00:00', '2025-08-05 09:12:00', 'graded', 17),

-- === Tugas Menulis Esai (XI-A, students 11-15) ===
(13, 11, '2025-08-06 10:00:00', '2025-08-14 20:00:00', 'graded', 85),
(13, 12, '2025-08-07 09:00:00', '2025-08-13 18:00:00', 'graded', 90),
(13, 13, '2025-08-08 08:00:00', '2025-08-15 19:00:00', 'graded', 78),
(13, 14, '2025-08-09 11:00:00', '2025-08-14 21:00:00', 'graded', 88),
(13, 15, '2025-08-10 10:00:00', '2025-08-15 17:00:00', 'graded', 92),

-- === Quiz Tatabahasa (XI-A, students 11-15) ===
(14, 11, '2025-08-20 08:00:00', '2025-08-20 08:30:00', 'graded', 18),
(14, 12, '2025-08-20 08:00:00', '2025-08-20 08:35:00', 'graded', 20),
(14, 13, '2025-08-20 08:00:00', '2025-08-20 08:40:00', 'graded', 16),
(14, 14, '2025-08-20 08:00:00', '2025-08-20 08:32:00', 'graded', 19),
(14, 15, '2025-08-20 08:00:00', '2025-08-20 08:38:00', 'graded', 17),

-- === Tugas Reading Comprehension (XI-B, students 16-20) ===
(17, 16, '2025-08-09 10:00:00', '2025-08-14 15:00:00', 'graded', 82),
(17, 17, '2025-08-10 09:00:00', '2025-08-13 14:00:00', 'graded', 88),
(17, 18, '2025-08-11 08:00:00', '2025-08-15 16:00:00', 'graded', 75),
(17, 19, '2025-08-12 11:00:00', '2025-08-14 20:00:00', 'graded', 90),
(17, 20, '2025-08-13 10:00:00', '2025-08-15 18:00:00', 'graded', 85),

-- === Quiz Vocabulary (XI-B, students 16-20) ===
(18, 16, '2025-08-22 08:00:00', '2025-08-22 08:25:00', 'graded', 16),
(18, 17, '2025-08-22 08:00:00', '2025-08-22 08:30:00', 'graded', 20),
(18, 18, '2025-08-22 08:00:00', '2025-08-22 08:35:00', 'graded', 14),
(18, 19, '2025-08-22 08:00:00', '2025-08-22 08:28:00', 'graded', 18),
(18, 20, '2025-08-22 08:00:00', '2025-08-22 08:32:00', 'graded', 15),

-- === Quiz Termodinamika (XI-A, students 11-15) ===
(11, 11, '2025-08-12 08:00:00', '2025-08-12 09:10:00', 'graded', 16),
(11, 12, '2025-08-12 08:00:00', '2025-08-12 09:15:00', 'graded', 19),
(11, 13, '2025-08-12 08:00:00', '2025-08-12 09:20:00', 'graded', 14),
(11, 14, '2025-08-12 08:00:00', '2025-08-12 09:08:00', 'graded', 18),
(11, 15, '2025-08-12 08:00:00', '2025-08-12 09:12:00', 'graded', 15),

-- === Quiz Stoikiometri (XI-A, students 11-15) ===
(21, 11, '2025-08-10 08:00:00', '2025-08-10 09:10:00', 'graded', 17),
(21, 12, '2025-08-10 08:00:00', '2025-08-10 09:15:00', 'graded', 20),
(21, 13, '2025-08-10 08:00:00', '2025-08-10 09:20:00', 'graded', 15),
(21, 14, '2025-08-10 08:00:00', '2025-08-10 09:05:00', 'graded', 19),
(21, 15, '2025-08-10 08:00:00', '2025-08-10 09:12:00', 'graded', 16),

-- === Quiz Ekosistem (XI-A, students 11-15) ===
(23, 11, '2025-08-12 08:00:00', '2025-08-12 08:40:00', 'graded', 18),
(23, 12, '2025-08-12 08:00:00', '2025-08-12 08:45:00', 'graded', 20),
(23, 13, '2025-08-12 08:00:00', '2025-08-12 08:50:00', 'graded', 16),
(23, 14, '2025-08-12 08:00:00', '2025-08-12 08:35:00', 'graded', 19),
(23, 15, '2025-08-12 08:00:00', '2025-08-12 08:42:00', 'graded', 17),

-- === Quiz Sejarah (X-A, students 1-5) ===
(25, 1, '2025-08-06 08:00:00', '2025-08-06 08:30:00', 'graded', 18),
(25, 2, '2025-08-06 08:00:00', '2025-08-06 08:35:00', 'graded', 20),
(25, 3, '2025-08-06 08:00:00', '2025-08-06 08:40:00', 'graded', 16),
(25, 4, '2025-08-06 08:00:00', '2025-08-06 08:28:00', 'graded', 19),
(25, 5, '2025-08-06 08:00:00', '2025-08-06 08:38:00', 'graded', 17),

-- === Quiz Akhlak (X-A, students 1-5) ===
(27, 1, '2025-08-07 08:00:00', '2025-08-07 08:30:00', 'graded', 22),
(27, 2, '2025-08-07 08:00:00', '2025-08-07 08:35:00', 'graded', 25),
(27, 3, '2025-08-07 08:00:00', '2025-08-07 08:40:00', 'graded', 20),
(27, 4, '2025-08-07 08:00:00', '2025-08-07 08:28:00', 'graded', 24),
(27, 5, '2025-08-07 08:00:00', '2025-08-07 08:38:00', 'graded', 21),

-- === Quiz Integral (XII-A, students 21-25) ===
(7, 21, '2025-08-08 08:00:00', '2025-08-08 09:10:00', 'graded', 18),
(7, 22, '2025-08-08 08:00:00', '2025-08-08 09:15:00', 'graded', 20),
(7, 23, '2025-08-08 08:00:00', '2025-08-08 09:20:00', 'graded', 15),
(7, 24, '2025-08-08 08:00:00', '2025-08-08 09:05:00', 'graded', 19),
(7, 25, '2025-08-08 08:00:00', '2025-08-08 09:12:00', 'graded', 17),

-- === Tugas Praktikum Fisika (X-A, students 1-5) ===
(9, 1, '2025-08-10 08:00:00', '2025-08-16 15:00:00', 'graded', 88),
(9, 2, '2025-08-11 09:00:00', '2025-08-15 14:00:00', 'graded', 92),
(9, 3, '2025-08-12 08:00:00', '2025-08-17 16:00:00', 'graded', 80),
(9, 4, '2025-08-10 11:00:00', '2025-08-16 20:00:00', 'graded', 90),
(9, 5, '2025-08-13 10:00:00', '2025-08-17 18:00:00', 'graded', 85),

-- === Quiz Sastra Indonesia (XI-A, students 11-15) ===
(16, 11, '2025-08-22 08:00:00', '2025-08-22 08:30:00', 'graded', 17),
(16, 12, '2025-08-22 08:00:00', '2025-08-22 08:35:00', 'graded', 19),
(16, 13, '2025-08-22 08:00:00', '2025-08-22 08:40:00', 'graded', 15),
(16, 14, '2025-08-22 08:00:00', '2025-08-22 08:32:00', 'graded', 18),
(16, 15, '2025-08-22 08:00:00', '2025-08-22 08:38:00', 'graded', 16),

-- === Quiz Grammar (XI-A, students 11-15) ===
(20, 11, '2025-08-25 08:00:00', '2025-08-25 08:30:00', 'graded', 18),
(20, 12, '2025-08-25 08:00:00', '2025-08-25 08:35:00', 'graded', 20),
(20, 13, '2025-08-25 08:00:00', '2025-08-25 08:40:00', 'graded', 16),
(20, 14, '2025-08-25 08:00:00', '2025-08-25 08:32:00', 'graded', 19),
(20, 15, '2025-08-25 08:00:00', '2025-08-25 08:38:00', 'graded', 17),

-- === Tugas Makalah Sejarah (X-A, students 1-5) ===
(26, 1, '2025-08-12 08:00:00', '2025-08-19 15:00:00', 'graded', 85),
(26, 2, '2025-08-13 09:00:00', '2025-08-18 14:00:00', 'graded', 90),
(26, 3, '2025-08-14 08:00:00', '2025-08-20 16:00:00', 'graded', 78),
(26, 4, '2025-08-12 11:00:00', '2025-08-19 20:00:00', 'graded', 88),
(26, 5, '2025-08-15 10:00:00', '2025-08-20 18:00:00', 'graded', 82),

-- === Tugas Refleksi Diri PAI (X-A, students 1-5) ===
(28, 1, '2025-08-14 08:00:00', '2025-08-20 15:00:00', 'graded', 22),
(28, 2, '2025-08-15 09:00:00', '2025-08-19 14:00:00', 'graded', 25),
(28, 3, '2025-08-16 08:00:00', '2025-08-21 16:00:00', 'graded', 20),
(28, 4, '2025-08-14 11:00:00', '2025-08-20 20:00:00', 'graded', 24),
(28, 5, '2025-08-17 10:00:00', '2025-08-21 18:00:00', 'graded', 21);

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

-- Submission 19 (student 11, Quiz Tatabahasa)
(19, 15, 'Kata tanya', 10, 1, '2025-08-20 09:00:00'),
(19, 16, 'B', 8, 1, '2025-08-20 09:00:00'),

-- Submission 29 (student 16, Quiz Vocabulary)
(29, 17, 'Joyful', 8, 1, '2025-08-22 09:00:00'),
(29, 18, 'Easy', 8, 1, '2025-08-22 09:00:00'),

-- Submission for Quiz Trigonometri (student 11)
(21, 11, '0.5', 10, 1, '2025-08-05 09:30:00'),
(21, 12, '3/5', 8, 1, '2025-08-05 09:30:00'),

-- Submission for Quiz Integral (student 21)
(51, 13, 'x² + C', 10, 1, '2025-08-08 09:30:00'),
(51, 14, 'x³ + x² + C', 8, 1, '2025-08-08 09:30:00'),

-- Submission for Quiz Sejarah (student 1)
(61, 23, '17 Agustus 1945', 10, 1, '2025-08-06 09:00:00'),
(61, 24, 'Ir. Soekarno', 8, 1, '2025-08-06 09:00:00'),

-- Submission for Quiz Akhlak (student 1)
(66, 25, 'Siddiq', 10, 1, '2025-08-07 09:00:00'),
(66, 26, 'Jujur, amanah, dan peduli', 12, 1, '2025-08-07 09:00:00');

-- ============================================================
-- 12. materials
-- ============================================================
INSERT INTO materials (subject_teacher_assignment_id, title, description, content) VALUES
(1, 'Materi Aljabar Dasar', 'Pengenalan konsep aljabar untuk kelas X', 'Aljabar adalah cabang matematika yang menggunakan huruf untuk mewakili angka. Konsep dasar meliputi variabel, konstanta, koefisien, dan operasi aljabar.'),
(1, 'Rumus Persamaan Linear', 'Kumpulan rumus persamaan linear', 'Persamaan linear satu variabel: ax + b = c. Persamaan linear dua variabel: ax + by = c.'),
(2, 'Materi Geometri', 'Konsep dasar geometri', 'Geometri adalah cabang matematika yang mempelajari bentuk, ukuran, posisi, dan sifat-sifat ruang.'),
(7, 'Materi Kinematika', 'Konsep gerak dan kinematika', 'Kinematika adalah cabang fisika yang mempelajari gerak benda tanpa memperhatikan penyebab geraknya.'),
(11, 'Panduan Menulis Esai', 'Cara menulis esai yang baik', 'Esai terdiri dari tiga bagian: pendahuluan, isi, dan penutup. Gunakan kalimat topik yang jelas di setiap paragraf.'),
(17, 'Vocabulary List - Unit 1', 'Daftar kosakata bahasa Inggris', 'Important vocabulary: environment (lingkungan), sustainable (berkelanjutan), conservation (pelestarian), ecosystem (ekosistem).'),
(23, 'Materi Stoikiometri', 'Konsep mol dan stoikiometri', 'Stoikiometri adalah perhitungan kuantitatif reaksi kimia. Mol adalah satuan jumlah zat.'),
(27, 'Materi Ekosistem', 'Konsep ekosistem dan rantai makanan', 'Ekosistem adalah sistem ekologi yang terbentuk dari hubungan timbal balik antara makhluk hidup dengan lingkungannya.'),
(33, 'Materi Sejarah Kemerdekaan', 'Perjuangan kemerdekaan Indonesia', 'Proklamasi kemerdekaan Indonesia dibacakan pada 17 Agustus 1945 oleh Ir. Soekarno dan Drs. Mohammad Hatta.'),
(39, 'Materi Akhlak', 'Konsep akhlak dalam Islam', 'Akhlak adalah budi pekerti atau tingkah laku. Akhlak terpuji meliputi siddiq (jujur), amanah (terpercaya), tabligh (menyampaikan), dan fathanah (cerdas).');

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
(30, 6, 1, 3, 'B', 'Baik, perlu lebih disiplin'),

-- Additional attitude records from other teachers
-- X-A students (teacher_id=4, Sari - Chemistry perspective)
(1, 1, 1, 4, 'A', 'Aktif dalam praktikum kimia'),
(2, 1, 1, 4, 'B', 'Perlu lebih teliti dalam eksperimen'),
(3, 1, 1, 4, 'A', 'Sangat baik dalam kerja laboratorium'),
(4, 1, 1, 4, 'B', 'Cukup baik, perlu lebih berhati-hati'),
(5, 1, 1, 4, 'A', 'Sangat antusias dalam pembelajaran'),

-- XI-A students (teacher_id=5, Dedi - Biology perspective)
(11, 3, 1, 5, 'A', 'Sangat baik dalam observasi lingkungan'),
(12, 3, 1, 5, 'A', 'Rajin mencatat dan bertanya'),
(13, 3, 1, 5, 'B', 'Perlu lebih aktif dalam diskusi kelompok'),
(14, 3, 1, 5, 'A', 'Sangat baik dalam presentasi'),
(15, 3, 1, 5, 'A', 'Menjadi contoh bagi teman-teman'),

-- XII-A students (teacher_id=6, Rina - History perspective)
(21, 5, 1, 6, 'A', 'Sangat menghargai sejarah bangsa'),
(22, 5, 1, 6, 'A', 'Aktif dalam diskusi sejarah'),
(23, 5, 1, 6, 'B', 'Perlu lebih banyak membaca referensi'),
(24, 5, 1, 6, 'A', 'Sangat baik dalam analisis sejarah'),
(25, 5, 1, 6, 'A', 'Menunjukkan sikap nasionalisme yang tinggi'),

-- XII-B students (teacher_id=7, Hadi - PAI perspective)
(26, 6, 1, 7, 'B', 'Perlu lebih khusyuk dalam beribadah'),
(27, 6, 1, 7, 'A', 'Sangat baik dalam mengamalkan nilai-nilai Islam'),
(28, 6, 1, 7, 'B', 'Cukup baik, perlu lebih rajin beribadah'),
(29, 6, 1, 7, 'A', 'Sangat baik dalam membantu sesama'),
(30, 6, 1, 7, 'B', 'Baik, perlu lebih disiplin dalam waktu');
