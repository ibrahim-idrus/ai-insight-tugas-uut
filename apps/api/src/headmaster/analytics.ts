import { Database } from "sql.js";

export interface AcademicPeriodRow {
  id: number;
  school_year: string;
  semester: number;
  start_date: string;
  end_date: string;
}

export interface HeadmasterAnalytics {
  overview: {
    student_count: number;
    average_score: number | null;
    completion_rate: number;
    average_attitude: number | null;
    students_needing_support: number;
  };
  period_trend: Array<{
    period_id: number;
    label: string;
    student_count: number;
    average_score: number | null;
    completion_rate: number;
    average_attitude: number | null;
  }>;
  class_ranking: Array<{
    rank: number;
    class_id: number;
    class_name: string;
    student_count: number;
    average_score: number | null;
    completion_rate: number;
    average_attitude: number | null;
  }>;
  student_ranking: Array<{
    rank: number;
    student_id: number;
    student_name: string;
    class_name: string;
    average_score: number;
    completed_assignments: number;
    average_attitude: number | null;
  }>;
  subject_performance: Array<{
    subject_id: number;
    subject_name: string;
    assignment_count: number;
    average_score: number | null;
    completion_rate: number;
  }>;
  insight_signals: Array<{
    key: string;
    title: string;
    detail: string;
    metric: number | string;
    tone: "positive" | "warning" | "neutral";
  }>;
}

interface EnrollmentRow {
  academic_period_id: number;
  student_id: number;
  student_name: string;
  class_id: number;
  class_name: string;
}

interface AssignmentRow {
  assignment_id: number;
  academic_period_id: number;
  class_id: number;
  class_name: string;
  subject_id: number;
  subject_name: string;
  status: string;
  total_points: number;
}

interface SubmissionRow {
  assignment_id: number;
  student_id: number;
  status: string;
  total_score: number | null;
}

interface SubjectRosterRow {
  academic_period_id: number;
  subject_id: number;
  subject_name: string;
}

interface AttitudeRow {
  academic_period_id: number;
  student_id: number;
  class_id: number;
  score: string;
}

interface PeriodMetrics {
  overview: HeadmasterAnalytics["overview"];
  classRanking: HeadmasterAnalytics["class_ranking"];
  studentRanking: HeadmasterAnalytics["student_ranking"];
  subjectPerformance: HeadmasterAnalytics["subject_performance"];
  completionRateAvailable: boolean;
}

type QueryResult = Array<{ columns: string[]; values: unknown[][] }>;

function toRows<T>(result: QueryResult): T[] {
  if (!result[0]) return [];
  return result[0].values.map((row) => {
    const entry: Record<string, unknown> = {};
    result[0].columns.forEach((column, index) => {
      entry[column] = row[index];
    });
    return entry as T;
  });
}

function roundMetric(value: number): number {
  return Math.round(value * 100) / 100;
}

function scoreToNumber(score: string): number | null {
  if (score === "A") return 4;
  if (score === "B") return 3;
  if (score === "C") return 2;
  if (score === "D") return 1;
  return null;
}

function average(numbers: number[]): number | null {
  if (numbers.length === 0) return null;
  return roundMetric(numbers.reduce((total, value) => total + value, 0) / numbers.length);
}

function percent(part: number, total: number): number {
  if (total <= 0) return 0;
  return roundMetric((part / total) * 100);
}

function nullablePercent(part: number, total: number): number | null {
  if (total <= 0) return null;
  return percent(part, total);
}

function compareNullableDescending(left: number | null, right: number | null): number {
  if (left === null && right === null) return 0;
  if (left === null) return 1;
  if (right === null) return -1;
  return right - left;
}

function labelPeriod(period: AcademicPeriodRow): string {
  return `${period.school_year} S${period.semester}`;
}

function emptyAnalytics(): HeadmasterAnalytics {
  return {
    overview: {
      student_count: 0,
      average_score: null,
      completion_rate: 0,
      average_attitude: null,
      students_needing_support: 0,
    },
    period_trend: [],
    class_ranking: [],
    student_ranking: [],
    subject_performance: [],
    insight_signals: [],
  };
}

export function getHeadmasterAnalytics(
  database: Database,
  selectedPeriodId: number,
  academicPeriods: AcademicPeriodRow[]
): HeadmasterAnalytics {
  const selectedPeriod = academicPeriods.find((period) => period.id === selectedPeriodId);
  if (!selectedPeriod) {
    return emptyAnalytics();
  }

  const enrollmentRows = toRows<EnrollmentRow>(
    database.exec(
      `SELECT se.academic_period_id, se.student_id, s.name AS student_name, se.class_id, c.name AS class_name
       FROM student_enrollments se
       JOIN students s ON s.id = se.student_id
       JOIN classes c ON c.id = se.class_id
       WHERE se.status = 'active'`
    )
  ).map((row) => ({
    ...row,
    academic_period_id: Number(row.academic_period_id),
    student_id: Number(row.student_id),
    class_id: Number(row.class_id),
  }));

  const assignmentRows = toRows<AssignmentRow>(
    database.exec(
      `SELECT a.id AS assignment_id, sta.academic_period_id, sta.class_id, c.name AS class_name,
              sta.subject_id, sub.name AS subject_name, a.status,
              COALESCE((SELECT SUM(points) FROM assignment_questions aq WHERE aq.assignment_id = a.id), 0) AS total_points
       FROM assignments a
       JOIN subject_teacher_assignments sta ON sta.id = a.subject_teacher_assignment_id
       JOIN classes c ON c.id = sta.class_id
       JOIN subjects sub ON sub.id = sta.subject_id`
    )
  ).map((row) => ({
    ...row,
    assignment_id: Number(row.assignment_id),
    academic_period_id: Number(row.academic_period_id),
    class_id: Number(row.class_id),
    subject_id: Number(row.subject_id),
    total_points: Number(row.total_points),
  }));

  const submissionRows = toRows<SubmissionRow>(
    database.exec(`SELECT assignment_id, student_id, status, total_score FROM assignment_submissions`)
  ).map((row) => ({
    ...row,
    assignment_id: Number(row.assignment_id),
    student_id: Number(row.student_id),
    total_score: row.total_score === null ? null : Number(row.total_score),
  }));

  const subjectRosterRows = toRows<SubjectRosterRow>(
    database.exec(
      `SELECT DISTINCT sta.academic_period_id, sta.subject_id, sub.name AS subject_name
       FROM subject_teacher_assignments sta
       JOIN subjects sub ON sub.id = sta.subject_id`
    )
  ).map((row) => ({
    ...row,
    academic_period_id: Number(row.academic_period_id),
    subject_id: Number(row.subject_id),
  }));

  const attitudeRows = toRows<AttitudeRow>(
    database.exec(`SELECT academic_period_id, student_id, class_id, score FROM attitudes`)
  ).map((row) => ({
    ...row,
    academic_period_id: Number(row.academic_period_id),
    student_id: Number(row.student_id),
    class_id: Number(row.class_id),
  }));

  const enrollmentsByPeriod = new Map<number, EnrollmentRow[]>();
  const assignmentsByPeriod = new Map<number, AssignmentRow[]>();
  const submissionsByAssignment = new Map<number, SubmissionRow[]>();
  const subjectsByPeriod = new Map<number, SubjectRosterRow[]>();
  const attitudesByPeriod = new Map<number, AttitudeRow[]>();

  for (const row of enrollmentRows) {
    const entries = enrollmentsByPeriod.get(row.academic_period_id) ?? [];
    entries.push(row);
    enrollmentsByPeriod.set(row.academic_period_id, entries);
  }

  for (const row of assignmentRows) {
    const entries = assignmentsByPeriod.get(row.academic_period_id) ?? [];
    entries.push(row);
    assignmentsByPeriod.set(row.academic_period_id, entries);
  }

  for (const row of submissionRows) {
    const entries = submissionsByAssignment.get(row.assignment_id) ?? [];
    entries.push(row);
    submissionsByAssignment.set(row.assignment_id, entries);
  }

  for (const row of subjectRosterRows) {
    const entries = subjectsByPeriod.get(row.academic_period_id) ?? [];
    entries.push(row);
    subjectsByPeriod.set(row.academic_period_id, entries);
  }

  for (const row of attitudeRows) {
    const entries = attitudesByPeriod.get(row.academic_period_id) ?? [];
    entries.push(row);
    attitudesByPeriod.set(row.academic_period_id, entries);
  }

  const calculatePeriodMetrics = (periodId: number): PeriodMetrics => {
    const periodEnrollments = enrollmentsByPeriod.get(periodId) ?? [];
    const publishedAssignments = (assignmentsByPeriod.get(periodId) ?? []).filter((row) => row.status === "published");
    const periodSubjects = subjectsByPeriod.get(periodId) ?? [];
    const periodAttitudes = attitudesByPeriod.get(periodId) ?? [];

    const studentById = new Map<number, EnrollmentRow>();
    const classStudents = new Map<number, EnrollmentRow[]>();
    const classAssignments = new Map<number, AssignmentRow[]>();
    const subjectAssignments = new Map<number, AssignmentRow[]>();
    const attitudesByStudent = new Map<number, number[]>();
    const attitudesByClass = new Map<number, number[]>();

    for (const enrollment of periodEnrollments) {
      studentById.set(enrollment.student_id, enrollment);
      const classEntries = classStudents.get(enrollment.class_id) ?? [];
      classEntries.push(enrollment);
      classStudents.set(enrollment.class_id, classEntries);
    }

    for (const assignment of publishedAssignments) {
      const classEntries = classAssignments.get(assignment.class_id) ?? [];
      classEntries.push(assignment);
      classAssignments.set(assignment.class_id, classEntries);

      const subjectEntries = subjectAssignments.get(assignment.subject_id) ?? [];
      subjectEntries.push(assignment);
      subjectAssignments.set(assignment.subject_id, subjectEntries);
    }

    for (const attitude of periodAttitudes) {
      const numeric = scoreToNumber(attitude.score);
      if (numeric === null) continue;

      const studentEntries = attitudesByStudent.get(attitude.student_id) ?? [];
      studentEntries.push(numeric);
      attitudesByStudent.set(attitude.student_id, studentEntries);

      const classEntries = attitudesByClass.get(attitude.class_id) ?? [];
      classEntries.push(numeric);
      attitudesByClass.set(attitude.class_id, classEntries);
    }

    const classScoreBuckets = new Map<number, number[]>();
    const classCompletedCounts = new Map<number, number>();
    const studentScoreBuckets = new Map<number, number[]>();
    const studentCompletedCounts = new Map<number, number>();
    const subjectScoreBuckets = new Map<number, number[]>();
    const subjectCompletedCounts = new Map<number, number>();
    const supportStudents = new Set<number>();
    const scoredStudents = new Set<number>();

    let expectedSubmissions = 0;
    let completedSubmissions = 0;
    const allScores: number[] = [];

    for (const assignment of publishedAssignments) {
      const enrolledStudents = classStudents.get(assignment.class_id) ?? [];
      expectedSubmissions += enrolledStudents.length;

      const validStudentIds = new Set(enrolledStudents.map((row) => row.student_id));
      const submissions = submissionsByAssignment.get(assignment.assignment_id) ?? [];

      for (const submission of submissions) {
        if (!validStudentIds.has(submission.student_id)) continue;

        if (submission.status === "submitted" || submission.status === "graded") {
          completedSubmissions += 1;
          classCompletedCounts.set(
            assignment.class_id,
            (classCompletedCounts.get(assignment.class_id) ?? 0) + 1
          );
          studentCompletedCounts.set(
            submission.student_id,
            (studentCompletedCounts.get(submission.student_id) ?? 0) + 1
          );
          subjectCompletedCounts.set(
            assignment.subject_id,
            (subjectCompletedCounts.get(assignment.subject_id) ?? 0) + 1
          );
        }

        if (
          submission.status === "graded" &&
          assignment.total_points > 0 &&
          submission.total_score !== null
        ) {
          const normalizedScore = roundMetric((submission.total_score / assignment.total_points) * 100);
          allScores.push(normalizedScore);
          scoredStudents.add(submission.student_id);

          const classScores = classScoreBuckets.get(assignment.class_id) ?? [];
          classScores.push(normalizedScore);
          classScoreBuckets.set(assignment.class_id, classScores);

          const studentScores = studentScoreBuckets.get(submission.student_id) ?? [];
          studentScores.push(normalizedScore);
          studentScoreBuckets.set(submission.student_id, studentScores);

          const subjectScores = subjectScoreBuckets.get(assignment.subject_id) ?? [];
          subjectScores.push(normalizedScore);
          subjectScoreBuckets.set(assignment.subject_id, subjectScores);
        }
      }
    }

    const studentCount = studentById.size;
    const averageScore = average(allScores);
    const averageAttitude = average(
      periodAttitudes.map((row) => scoreToNumber(row.score)).filter((value): value is number => value !== null)
    );
    const completionRate = nullablePercent(completedSubmissions, expectedSubmissions);

    for (const enrollment of periodEnrollments) {
      const studentScores = studentScoreBuckets.get(enrollment.student_id) ?? [];
      const studentAverage = average(studentScores);
      const studentAttitude = average(attitudesByStudent.get(enrollment.student_id) ?? []);
      const classAssignmentCount = (classAssignments.get(enrollment.class_id) ?? []).length;
      const classHasAssessmentData = classScoreBuckets.has(enrollment.class_id);
      const completedCount = studentCompletedCounts.get(enrollment.student_id) ?? 0;
      const studentCompletionRate = nullablePercent(completedCount, classAssignmentCount);

      if (
        (classHasAssessmentData && studentAverage === null) ||
        (studentAverage !== null && studentAverage < 60) ||
        (studentCompletionRate !== null && studentCompletionRate < 70) ||
        (studentAttitude !== null && studentAttitude < 2.5)
      ) {
        supportStudents.add(enrollment.student_id);
      }
    }

    const classRanking = Array.from(classStudents.entries())
      .map(([classId, students]) => {
        const className = students[0]?.class_name ?? "";
        const assignmentCount = (classAssignments.get(classId) ?? []).length;
        const expectedForClass = students.length * assignmentCount;
        return {
          rank: 0,
          class_id: classId,
          class_name: className,
          student_count: students.length,
          average_score: average(classScoreBuckets.get(classId) ?? []),
          completion_rate: nullablePercent(classCompletedCounts.get(classId) ?? 0, expectedForClass) ?? 0,
          average_attitude: average(attitudesByClass.get(classId) ?? []),
        };
      })
      .filter((row) => row.average_score !== null)
      .sort((left, right) => {
        const scoreCompare = compareNullableDescending(left.average_score, right.average_score);
        if (scoreCompare !== 0) return scoreCompare;
        if (right.completion_rate !== left.completion_rate) return right.completion_rate - left.completion_rate;
        return left.class_name.localeCompare(right.class_name);
      })
      .map((row, index) => ({ ...row, rank: index + 1 }));

    const studentRanking = periodEnrollments
      .filter((enrollment) => scoredStudents.has(enrollment.student_id))
      .map((enrollment) => ({
        rank: 0,
        student_id: enrollment.student_id,
        student_name: enrollment.student_name,
        class_name: enrollment.class_name,
        average_score: average(studentScoreBuckets.get(enrollment.student_id) ?? []) ?? 0,
        completed_assignments: studentCompletedCounts.get(enrollment.student_id) ?? 0,
        average_attitude: average(attitudesByStudent.get(enrollment.student_id) ?? []),
      }))
      .sort((left, right) => {
        if (right.average_score !== left.average_score) return right.average_score - left.average_score;
        if (right.completed_assignments !== left.completed_assignments) {
          return right.completed_assignments - left.completed_assignments;
        }
        return left.student_name.localeCompare(right.student_name);
      })
      .slice(0, 10)
      .map((row, index) => ({ ...row, rank: index + 1, average_score: roundMetric(row.average_score) }));

    const subjectPerformance = periodSubjects
      .map((subject) => {
        const assignments = subjectAssignments.get(subject.subject_id) ?? [];
        const expectedForSubject = assignments.reduce((total, assignment) => {
          const enrolledStudents = classStudents.get(assignment.class_id) ?? [];
          return total + enrolledStudents.length;
        }, 0);
        return {
          subject_id: subject.subject_id,
          subject_name: subject.subject_name,
          assignment_count: assignments.length,
          average_score: average(subjectScoreBuckets.get(subject.subject_id) ?? []),
          completion_rate: nullablePercent(subjectCompletedCounts.get(subject.subject_id) ?? 0, expectedForSubject) ?? 0,
        };
      })
      .sort((left, right) => {
        const scoreCompare = compareNullableDescending(left.average_score, right.average_score);
        if (scoreCompare !== 0) return scoreCompare;
        return left.subject_name.localeCompare(right.subject_name);
      });

    return {
      overview: {
        student_count: studentCount,
        average_score: averageScore,
        completion_rate: completionRate ?? 0,
        average_attitude: averageAttitude,
        students_needing_support: supportStudents.size,
      },
      classRanking,
      studentRanking,
      subjectPerformance,
      completionRateAvailable: completionRate !== null,
    };
  };

  const metricsByPeriod = new Map<number, PeriodMetrics>();
  for (const period of academicPeriods) {
    metricsByPeriod.set(period.id, calculatePeriodMetrics(period.id));
  }

  const selectedMetrics = metricsByPeriod.get(selectedPeriodId) ?? {
    overview: emptyAnalytics().overview,
    classRanking: [],
    studentRanking: [],
    subjectPerformance: [],
    completionRateAvailable: false,
  };
  const selectedIndex = academicPeriods.findIndex((period) => period.id === selectedPeriodId);
  const previousMetrics =
    selectedIndex >= 0 && academicPeriods[selectedIndex + 1]
      ? metricsByPeriod.get(academicPeriods[selectedIndex + 1].id)
      : undefined;
  const topClass = selectedMetrics.classRanking[0] ?? null;

  return {
    overview: selectedMetrics.overview,
    period_trend: academicPeriods.map((period) => {
      const metrics = metricsByPeriod.get(period.id) ?? {
        overview: emptyAnalytics().overview,
      };
      return {
        period_id: period.id,
        label: labelPeriod(period),
        student_count: metrics.overview.student_count,
        average_score: metrics.overview.average_score,
        completion_rate: metrics.overview.completion_rate,
        average_attitude: metrics.overview.average_attitude,
      };
    }),
    class_ranking: selectedMetrics.classRanking,
    student_ranking: selectedMetrics.studentRanking,
    subject_performance: selectedMetrics.subjectPerformance,
    insight_signals: [
      {
        key: "top_class",
        title: "Top Class",
        detail: topClass
          ? `${topClass.class_name} leads the selected period with the strongest average score.`
          : "No class performance data is available for the selected period.",
        metric: topClass?.class_name ?? "No data",
        tone: topClass && (topClass.average_score ?? 0) >= 85 ? "positive" : "neutral",
      },
      {
        key: "completion_rate",
        title: "Completion Rate",
        detail: selectedMetrics.completionRateAvailable
          ? selectedMetrics.overview.completion_rate >= 85
            ? "Assignment completion is staying on track for the selected period."
            : "Assignment completion needs attention in the selected period."
          : "No completion data is available for the selected period.",
        metric: selectedMetrics.completionRateAvailable
          ? selectedMetrics.overview.completion_rate
          : "No data",
        tone: selectedMetrics.completionRateAvailable
          ? selectedMetrics.overview.completion_rate >= 85
            ? "positive"
            : "warning"
          : "neutral",
      },
      {
        key: "enrollment_trend",
        title: "Enrollment Trend",
        detail: previousMetrics
          ? `Enrollment changed by ${selectedMetrics.overview.student_count - previousMetrics.overview.student_count} students from the previous tracked period.`
          : "No previous academic period is available for comparison.",
        metric: previousMetrics
          ? selectedMetrics.overview.student_count - previousMetrics.overview.student_count
          : selectedMetrics.overview.student_count,
        tone: previousMetrics ? "neutral" : "neutral",
      },
      {
        key: "students_needing_support",
        title: "Students Needing Support",
        detail:
          selectedMetrics.overview.students_needing_support > 0
            ? `${selectedMetrics.overview.students_needing_support} students show low completion, low grades, or weak attitudes in this period.`
            : "No students are currently flagged for support in this period.",
        metric: selectedMetrics.overview.students_needing_support,
        tone: selectedMetrics.overview.students_needing_support > 0 ? "warning" : "positive",
      },
    ],
  };
}
