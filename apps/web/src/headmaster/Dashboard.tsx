import { useCallback, useEffect, useState } from "react";
import { apiUrl } from "../auth/api";
import { DashboardAnalytics } from "./DashboardAnalytics";

interface AcademicPeriod {
  id: number;
  school_year: string;
  semester: number;
  start_date: string;
  end_date: string;
}

interface Kpi {
  total_students: number;
  total_teachers: number;
  total_classes: number;
  total_subjects: number;
  published_assignments: number;
  avg_attitude_score: number | null;
}

interface StudentsPerClass {
  id: number;
  name: string;
  grade_level: number;
  student_count: number;
}

interface AssignmentsByType {
  assignment_type: string;
  count: number;
}

interface AssignmentsPerSubject {
  id: number;
  name: string;
  code: string;
  count: number;
}

interface AttitudePerClass {
  id: number;
  name: string;
  grade_level: number;
  avg_score: number | null;
  record_count: number;
}

interface ClassOverviewRow {
  id: number;
  name: string;
  grade_level: number;
  homeroom_teacher: string | null;
  student_count: number;
  avg_attitude: number | null;
  attitude_records: number;
}

interface TeacherAssignmentRow {
  teacher_name: string;
  subject_name: string;
  class_name: string;
  school_year: string;
  semester: number;
}

interface HomeroomRow {
  class_name: string;
  grade_level: number;
  teacher_name: string;
}

interface DashboardData {
  active_period_id: number | null;
  kpi: Kpi;
  analytics: DashboardAnalytics;
  students_per_class: StudentsPerClass[];
  assignments_by_type: AssignmentsByType[];
  assignments_per_subject: AssignmentsPerSubject[];
  attitude_per_class: AttitudePerClass[];
  class_overview: ClassOverviewRow[];
  teacher_assignments: TeacherAssignmentRow[];
  homeroom_overview: HomeroomRow[];
  academic_periods: AcademicPeriod[];
}

// Detail data interfaces
interface StudentDetail {
  id: number;
  name: string;
  nis: string;
  username: string;
  class_name: string;
  grade_level: number;
}

interface TeacherDetail {
  id: number;
  name: string;
  username: string;
  subjects: string | null;
  classes: string | null;
}

interface ClassDetail {
  id: number;
  name: string;
  grade_level: number;
  homeroom_teacher: string | null;
  student_count: number;
}

interface SubjectDetail {
  id: number;
  name: string;
  code: string;
  teachers: string | null;
}

interface AssignmentDetail {
  id: number;
  title: string;
  assignment_type: string;
  status: string;
  start_at: string;
  due_at: string;
  subject_name: string;
  class_name: string;
  class_id: number;
  teacher_name: string;
  submission_count: number;
}

interface AttitudeDetail {
  id: number;
  student_name: string;
  nis: string;
  class_name: string;
  class_id: number;
  score: string;
  description: string;
  teacher_name: string;
}

interface AttitudeSummary {
  class_id: number;
  class_name: string;
  avg_score: number | null;
  record_count: number;
  count_a: number;
  count_b: number;
  count_c: number;
  count_d: number;
}

interface AssignmentsByTypePerClass {
  class_id: number;
  class_name: string;
  grade_level: number;
  assignment_type: string;
  count: number;
}

type ModalType = "students" | "teachers" | "classes" | "subjects" | "assignments" | "attitudes" | null;

const TYPE_LABELS: Record<string, string> = {
  quiz: "Quiz",
  task: "Task",
  upload: "Upload",
};

const TYPE_COLORS: Record<string, string> = {
  quiz: "#6366f1",
  task: "#06b6d4",
  upload: "#f59e0b",
};

function formatAttitudeScore(score: number | null): string {
  if (score === null || score === undefined) return "No data";
  return score.toFixed(1);
}

function attitudeBarColor(score: number | null): string {
  if (score === null) return "#e2e8f0";
  if (score >= 3.5) return "#22c55e";
  if (score >= 2.5) return "#f59e0b";
  return "#ef4444";
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  const date = new Date(dateStr);
  return date.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}

export default function HeadmasterDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedPeriod, setSelectedPeriod] = useState<number | null>(null);
  const [activeModal, setActiveModal] = useState<ModalType>(null);

  const fetchDashboard = useCallback(async (periodId?: number | null) => {
    setLoading(true);
    setError("");
    try {
      const params = periodId ? `?academic_period_id=${periodId}` : "";
      const response = await fetch(apiUrl(`/api/headmaster/dashboard${params}`), {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("Failed to load dashboard data");
      }
      const json = (await response.json()) as DashboardData;
      setData(json);
      if (selectedPeriod === null && json.active_period_id) {
        setSelectedPeriod(json.active_period_id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  }, [selectedPeriod]);

  useEffect(() => {
    void fetchDashboard(selectedPeriod);
  }, [selectedPeriod, fetchDashboard]);

  if (loading && !data) {
    return (
      <section className="page-content">
        <div className="dashboard-loading">Loading dashboard...</div>
      </section>
    );
  }

  if (error && !data) {
    return (
      <section className="page-content">
        <div className="dashboard-error">{error}</div>
      </section>
    );
  }

  if (!data) return null;

  const maxStudents = Math.max(...data.students_per_class.map((c) => c.student_count), 1);
  const maxAssignments = Math.max(...data.assignments_per_subject.map((s) => s.count), 1);
  const totalAssignmentsByType = data.assignments_by_type.reduce((sum, t) => sum + t.count, 0);

  return (
    <section className="page-content">
      <div className="page-heading">
        <div>
          <span className="eyebrow">Headmaster / Dashboard</span>
          <h1>School Overview</h1>
          <p>Monitor school-wide academic activity, class performance, and staffing at a glance.</p>
        </div>
      </div>

      <div className="dashboard-filters">
        <label className="filter-label" htmlFor="period-select">
          Academic Period
        </label>
        <select
          className="filter-select"
          id="period-select"
          onChange={(e) => {
            const val = e.target.value;
            setSelectedPeriod(val ? Number(val) : null);
          }}
          value={selectedPeriod ?? ""}
        >
          {data.academic_periods.map((p) => (
            <option key={p.id} value={p.id}>
              {p.school_year} — Semester {p.semester}
            </option>
          ))}
        </select>
      </div>

      <div className="kpi-grid">
        <KpiCard
          label="Total Students"
          value={data.kpi.total_students}
          onClick={() => setActiveModal("students")}
        />
        <KpiCard
          label="Total Teachers"
          value={data.kpi.total_teachers}
          onClick={() => setActiveModal("teachers")}
        />
        <KpiCard
          label="Total Classes"
          value={data.kpi.total_classes}
          onClick={() => setActiveModal("classes")}
        />
        <KpiCard
          label="Total Subjects"
          value={data.kpi.total_subjects}
          onClick={() => setActiveModal("subjects")}
        />
        <KpiCard
          label="Published Assignments"
          value={data.kpi.published_assignments}
          onClick={() => setActiveModal("assignments")}
        />
        <KpiCard
          label="Avg Attitude Score"
          value={formatAttitudeScore(data.kpi.avg_attitude_score)}
          suffix="/ 4.0"
          onClick={() => setActiveModal("attitudes")}
        />
      </div>

      <DashboardAnalytics analytics={data.analytics} />

      <div className="chart-grid">
        <div className="chart-card">
          <h3 className="chart-title">Students per Class</h3>
          <div className="bar-chart">
            {data.students_per_class.map((cls) => (
              <div className="bar-row" key={cls.id}>
                <span className="bar-label">{cls.name}</span>
                <div className="bar-track">
                  <div
                    className="bar-fill bar-fill-indigo"
                    style={{ width: `${(cls.student_count / maxStudents) * 100}%` }}
                  />
                </div>
                <span className="bar-value">{cls.student_count}</span>
              </div>
            ))}
          </div>
        </div>

        <AssignmentsByTypeChart
          assignmentsByType={data.assignments_by_type}
          totalAssignmentsByType={totalAssignmentsByType}
          periodId={selectedPeriod}
        />

        <div className="chart-card">
          <h3 className="chart-title">Assignments per Subject</h3>
          <div className="bar-chart">
            {data.assignments_per_subject.map((sub) => (
              <div className="bar-row" key={sub.id}>
                <span className="bar-label">{sub.code}</span>
                <div className="bar-track">
                  <div
                    className="bar-fill bar-fill-cyan"
                    style={{ width: `${(sub.count / maxAssignments) * 100}%` }}
                  />
                </div>
                <span className="bar-value">{sub.count}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="chart-card">
          <h3 className="chart-title">Average Attitude Score per Class</h3>
          <div className="bar-chart">
            {data.attitude_per_class.map((cls) => (
              <div className="bar-row" key={cls.id}>
                <span className="bar-label">{cls.name}</span>
                <div className="bar-track">
                  <div
                    className="bar-fill"
                    style={{
                      width: `${((cls.avg_score ?? 0) / 4) * 100}%`,
                      background: attitudeBarColor(cls.avg_score),
                    }}
                  />
                </div>
                <span className="bar-value">
                  {formatAttitudeScore(cls.avg_score)}
                  {cls.record_count > 0 && (
                    <span className="bar-suffix"> (n={cls.record_count})</span>
                  )}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="table-section">
        <h3 className="section-title">Class Overview</h3>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Class</th>
                <th>Grade</th>
                <th>Homeroom Teacher</th>
                <th>Students</th>
                <th>Avg Attitude</th>
              </tr>
            </thead>
            <tbody>
              {data.class_overview.map((row) => (
                <tr key={row.id}>
                  <td className="cell-bold">{row.name}</td>
                  <td>{row.grade_level}</td>
                  <td>{row.homeroom_teacher ?? "—"}</td>
                  <td>{row.student_count}</td>
                  <td>
                    <span
                      className="attitude-badge"
                      style={{ background: attitudeBarColor(row.avg_attitude) }}
                    >
                      {formatAttitudeScore(row.avg_attitude)}
                    </span>
                    {row.attitude_records > 0 && (
                      <span className="record-count"> ({row.attitude_records})</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="table-section">
        <h3 className="section-title">Teacher Assignments</h3>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Teacher</th>
                <th>Subject</th>
                <th>Class</th>
                <th>Period</th>
              </tr>
            </thead>
            <tbody>
              {data.teacher_assignments.map((row, i) => (
                <tr key={i}>
                  <td className="cell-bold">{row.teacher_name}</td>
                  <td>{row.subject_name}</td>
                  <td>{row.class_name}</td>
                  <td>{row.school_year} S{row.semester}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="table-section">
        <h3 className="section-title">Homeroom Assignments</h3>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Class</th>
                <th>Grade</th>
                <th>Homeroom Teacher</th>
              </tr>
            </thead>
            <tbody>
              {data.homeroom_overview.map((row, i) => (
                <tr key={i}>
                  <td className="cell-bold">{row.class_name}</td>
                  <td>{row.grade_level}</td>
                  <td>{row.teacher_name}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {activeModal && (
        <DetailModal
          type={activeModal}
          periodId={selectedPeriod}
          onClose={() => setActiveModal(null)}
        />
      )}
    </section>
  );
}

function KpiCard({
  label,
  value,
  suffix,
  onClick,
}: {
  label: string;
  value: number | string;
  suffix?: string;
  onClick?: () => void;
}) {
  return (
    <article
      className={`kpi-card ${onClick ? "kpi-card-clickable" : ""}`}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClick(); } } : undefined}
    >
      <span className="kpi-label">{label}</span>
      <span className="kpi-value">{value}</span>
      {suffix && <span className="kpi-suffix">{suffix}</span>}
      {onClick && <span className="kpi-hint">Click to view details</span>}
    </article>
  );
}

function AssignmentsByTypeChart({
  assignmentsByType,
  totalAssignmentsByType,
  periodId,
}: {
  assignmentsByType: AssignmentsByType[];
  totalAssignmentsByType: number;
  periodId: number | null;
}) {
  const [perClassData, setPerClassData] = useState<AssignmentsByTypePerClass[]>([]);
  const [selectedClass, setSelectedClass] = useState<number | null>(null);
  const [showPerClass, setShowPerClass] = useState(false);

  useEffect(() => {
    if (!showPerClass) return;
    const params = periodId ? `?academic_period_id=${periodId}` : "";
    fetch(apiUrl(`/api/headmaster/assignments-by-type-per-class${params}`), {
      credentials: "include",
    })
      .then((r) => r.json())
      .then((json: { assignments_by_type_per_class: AssignmentsByTypePerClass[] }) => {
        setPerClassData(json.assignments_by_type_per_class);
      })
      .catch(() => {});
  }, [showPerClass, periodId]);

  const classIds = [...new Set(perClassData.map((d) => d.class_id))];
  const filteredData = selectedClass
    ? perClassData.filter((d) => d.class_id === selectedClass)
    : perClassData;

  const classTotals = classIds.map((cid) => {
    const items = perClassData.filter((d) => d.class_id === cid);
    const className = items[0]?.class_name ?? "";
    const total = items.reduce((sum, item) => sum + item.count, 0);
    return { class_id: cid, class_name: className, total };
  });

  return (
    <div className="chart-card">
      <div className="chart-header">
        <h3 className="chart-title">Assignments by Type</h3>
        <button
          className="chart-toggle-btn"
          onClick={() => setShowPerClass(!showPerClass)}
          type="button"
        >
          {showPerClass ? "Overview" : "By Class"}
        </button>
      </div>

      {!showPerClass ? (
        totalAssignmentsByType > 0 ? (
          <div className="donut-container">
            <div
              className="donut-chart"
              style={{
                background: buildConicGradient(assignmentsByType, totalAssignmentsByType),
              }}
            >
              <div className="donut-center">
                <span className="donut-total">{totalAssignmentsByType}</span>
                <span className="donut-label">Total</span>
              </div>
            </div>
            <div className="donut-legend">
              {assignmentsByType.map((t) => (
                <div className="legend-item" key={t.assignment_type}>
                  <span
                    className="legend-dot"
                    style={{ background: TYPE_COLORS[t.assignment_type] ?? "#94a3b8" }}
                  />
                  <span className="legend-text">
                    {TYPE_LABELS[t.assignment_type] ?? t.assignment_type}
                  </span>
                  <span className="legend-count">{t.count}</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="chart-empty">No published assignments</div>
        )
      ) : (
        <div className="per-class-breakdown">
          <div className="class-filter-chips">
            <button
              className={`class-chip ${selectedClass === null ? "class-chip-active" : ""}`}
              onClick={() => setSelectedClass(null)}
              type="button"
            >
              All Classes
            </button>
            {classTotals.map((ct) => (
              <button
                className={`class-chip ${selectedClass === ct.class_id ? "class-chip-active" : ""}`}
                key={ct.class_id}
                onClick={() => setSelectedClass(ct.class_id)}
                type="button"
              >
                {ct.class_name} ({ct.total})
              </button>
            ))}
          </div>
          <div className="type-breakdown-bars">
            {(["quiz", "task", "upload"] as const).map((type) => {
              const item = filteredData.find((d) => d.assignment_type === type);
              const count = item?.count ?? 0;
              const maxCount = Math.max(...filteredData.map((d) => d.count), 1);
              return (
                <div className="bar-row" key={type}>
                  <span className="bar-label">{TYPE_LABELS[type]}</span>
                  <div className="bar-track">
                    <div
                      className="bar-fill"
                      style={{
                        width: `${(count / maxCount) * 100}%`,
                        background: TYPE_COLORS[type],
                      }}
                    />
                  </div>
                  <span className="bar-value">{count}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function DetailModal({
  type,
  periodId,
  onClose,
}: {
  type: ModalType;
  periodId: number | null;
  onClose: () => void;
}) {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [onClose]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">{getModalTitle(type)}</h2>
          <button className="modal-close" onClick={onClose} type="button">
            &times;
          </button>
        </div>
        <div className="modal-body">
          {loading && <div className="modal-loading">Loading...</div>}
          {type === "students" && <StudentsDetail periodId={periodId} onLoaded={() => setLoading(false)} />}
          {type === "teachers" && <TeachersDetail onLoaded={() => setLoading(false)} />}
          {type === "classes" && <ClassesDetail periodId={periodId} onLoaded={() => setLoading(false)} />}
          {type === "subjects" && <SubjectsDetail periodId={periodId} onLoaded={() => setLoading(false)} />}
          {type === "assignments" && <AssignmentsDetail periodId={periodId} onLoaded={() => setLoading(false)} />}
          {type === "attitudes" && <AttitudesDetail periodId={periodId} onLoaded={() => setLoading(false)} />}
        </div>
      </div>
    </div>
  );
}

function getModalTitle(type: ModalType): string {
  switch (type) {
    case "students": return "All Students";
    case "teachers": return "All Teachers";
    case "classes": return "All Classes";
    case "subjects": return "All Subjects";
    case "assignments": return "Published Assignments";
    case "attitudes": return "Attitude Score Details";
    default: return "";
  }
}

function StudentsDetail({ periodId, onLoaded }: { periodId: number | null; onLoaded: () => void }) {
  const [students, setStudents] = useState<StudentDetail[]>([]);
  const [search, setSearch] = useState("");
  const [classFilter, setClassFilter] = useState("");

  useEffect(() => {
    const params = new URLSearchParams();
    if (periodId) params.set("academic_period_id", String(periodId));
    if (search) params.set("search", search);
    if (classFilter) params.set("class_id", classFilter);

    const query = params.toString();
    fetch(apiUrl(`/api/headmaster/students${query ? `?${query}` : ""}`), {
      credentials: "include",
    })
      .then((r) => r.json())
      .then((json: { students: StudentDetail[] }) => {
        setStudents(json.students);
        onLoaded();
      })
      .catch(() => onLoaded());
  }, [periodId, search, classFilter, onLoaded]);

  const classNames = [...new Set(students.map((s) => s.class_name))].sort();

  return (
    <div>
      <div className="detail-filters">
        <input
          className="detail-search"
          placeholder="Search by name, username, or NIS..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="detail-select"
          value={classFilter}
          onChange={(e) => setClassFilter(e.target.value)}
        >
          <option value="">All Classes</option>
          {classNames.map((cn) => (
            <option key={cn} value={cn}>{cn}</option>
          ))}
        </select>
      </div>
      <div className="detail-table-wrap">
        <table className="detail-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>NIS</th>
              <th>Username</th>
              <th>Class</th>
            </tr>
          </thead>
          <tbody>
            {students.map((s) => (
              <tr key={s.id}>
                <td className="cell-bold">{s.name}</td>
                <td>{s.nis}</td>
                <td>{s.username}</td>
                <td>{s.class_name}</td>
              </tr>
            ))}
            {students.length === 0 && (
              <tr><td colSpan={4} className="detail-empty">No students found</td></tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="detail-count">{students.length} student{students.length !== 1 ? "s" : ""} found</div>
    </div>
  );
}

function TeachersDetail({ onLoaded }: { onLoaded: () => void }) {
  const [teachers, setTeachers] = useState<TeacherDetail[]>([]);

  useEffect(() => {
    fetch(apiUrl("/api/headmaster/teachers"), { credentials: "include" })
      .then((r) => r.json())
      .then((json: { teachers: TeacherDetail[] }) => {
        setTeachers(json.teachers);
        onLoaded();
      })
      .catch(() => onLoaded());
  }, [onLoaded]);

  return (
    <div>
      <div className="detail-table-wrap">
        <table className="detail-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Username</th>
              <th>Subjects</th>
              <th>Classes</th>
            </tr>
          </thead>
          <tbody>
            {teachers.map((t) => (
              <tr key={t.id}>
                <td className="cell-bold">{t.name}</td>
                <td>{t.username}</td>
                <td>{t.subjects ?? "—"}</td>
                <td>{t.classes ?? "—"}</td>
              </tr>
            ))}
            {teachers.length === 0 && (
              <tr><td colSpan={4} className="detail-empty">No teachers found</td></tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="detail-count">{teachers.length} teacher{teachers.length !== 1 ? "s" : ""}</div>
    </div>
  );
}

function ClassesDetail({ periodId, onLoaded }: { periodId: number | null; onLoaded: () => void }) {
  const [classes, setClasses] = useState<ClassDetail[]>([]);

  useEffect(() => {
    const params = periodId ? `?academic_period_id=${periodId}` : "";
    fetch(apiUrl(`/api/headmaster/classes${params}`), { credentials: "include" })
      .then((r) => r.json())
      .then((json: { classes: ClassDetail[] }) => {
        setClasses(json.classes);
        onLoaded();
      })
      .catch(() => onLoaded());
  }, [periodId, onLoaded]);

  return (
    <div>
      <div className="detail-table-wrap">
        <table className="detail-table">
          <thead>
            <tr>
              <th>Class</th>
              <th>Grade</th>
              <th>Homeroom Teacher</th>
              <th>Students</th>
            </tr>
          </thead>
          <tbody>
            {classes.map((c) => (
              <tr key={c.id}>
                <td className="cell-bold">{c.name}</td>
                <td>{c.grade_level}</td>
                <td>{c.homeroom_teacher ?? "—"}</td>
                <td>{c.student_count}</td>
              </tr>
            ))}
            {classes.length === 0 && (
              <tr><td colSpan={4} className="detail-empty">No classes found</td></tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="detail-count">{classes.length} class{classes.length !== 1 ? "es" : ""}</div>
    </div>
  );
}

function SubjectsDetail({ periodId, onLoaded }: { periodId: number | null; onLoaded: () => void }) {
  const [subjects, setSubjects] = useState<SubjectDetail[]>([]);

  useEffect(() => {
    const params = periodId ? `?academic_period_id=${periodId}` : "";
    fetch(apiUrl(`/api/headmaster/subjects${params}`), { credentials: "include" })
      .then((r) => r.json())
      .then((json: { subjects: SubjectDetail[] }) => {
        setSubjects(json.subjects);
        onLoaded();
      })
      .catch(() => onLoaded());
  }, [periodId, onLoaded]);

  return (
    <div>
      <div className="detail-table-wrap">
        <table className="detail-table">
          <thead>
            <tr>
              <th>Subject</th>
              <th>Code</th>
              <th>Teachers</th>
            </tr>
          </thead>
          <tbody>
            {subjects.map((s) => (
              <tr key={s.id}>
                <td className="cell-bold">{s.name}</td>
                <td>{s.code}</td>
                <td>{s.teachers ?? "—"}</td>
              </tr>
            ))}
            {subjects.length === 0 && (
              <tr><td colSpan={3} className="detail-empty">No subjects found</td></tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="detail-count">{subjects.length} subject{subjects.length !== 1 ? "s" : ""}</div>
    </div>
  );
}

function AssignmentsDetail({ periodId, onLoaded }: { periodId: number | null; onLoaded: () => void }) {
  const [assignments, setAssignments] = useState<AssignmentDetail[]>([]);
  const [typeFilter, setTypeFilter] = useState("");
  const [classFilter, setClassFilter] = useState("");

  useEffect(() => {
    const params = new URLSearchParams();
    if (periodId) params.set("academic_period_id", String(periodId));
    if (typeFilter) params.set("type", typeFilter);
    if (classFilter) params.set("class_id", classFilter);

    fetch(apiUrl(`/api/headmaster/assignments?${params.toString()}`), {
      credentials: "include",
    })
      .then((r) => r.json())
      .then((json: { assignments: AssignmentDetail[] }) => {
        setAssignments(json.assignments);
        onLoaded();
      })
      .catch(() => onLoaded());
  }, [periodId, typeFilter, classFilter, onLoaded]);

  const classNames = [...new Set(assignments.map((a) => a.class_name))].sort();

  return (
    <div>
      <div className="detail-filters">
        <select
          className="detail-select"
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
        >
          <option value="">All Types</option>
          <option value="quiz">Quiz</option>
          <option value="task">Task</option>
          <option value="upload">Upload</option>
        </select>
        <select
          className="detail-select"
          value={classFilter}
          onChange={(e) => setClassFilter(e.target.value)}
        >
          <option value="">All Classes</option>
          {classNames.map((cn) => (
            <option key={cn} value={cn}>{cn}</option>
          ))}
        </select>
      </div>
      <div className="detail-table-wrap">
        <table className="detail-table">
          <thead>
            <tr>
              <th>Title</th>
              <th>Type</th>
              <th>Subject</th>
              <th>Class</th>
              <th>Teacher</th>
              <th>Due Date</th>
              <th>Submissions</th>
            </tr>
          </thead>
          <tbody>
            {assignments.map((a) => (
              <tr key={a.id}>
                <td className="cell-bold">{a.title}</td>
                <td>
                  <span
                    className="type-badge"
                    style={{ background: TYPE_COLORS[a.assignment_type] ?? "#94a3b8" }}
                  >
                    {TYPE_LABELS[a.assignment_type] ?? a.assignment_type}
                  </span>
                </td>
                <td>{a.subject_name}</td>
                <td>{a.class_name}</td>
                <td>{a.teacher_name}</td>
                <td>{formatDate(a.due_at)}</td>
                <td>{a.submission_count}</td>
              </tr>
            ))}
            {assignments.length === 0 && (
              <tr><td colSpan={7} className="detail-empty">No assignments found</td></tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="detail-count">{assignments.length} assignment{assignments.length !== 1 ? "s" : ""}</div>
    </div>
  );
}

function AttitudesDetail({ periodId, onLoaded }: { periodId: number | null; onLoaded: () => void }) {
  const [attitudes, setAttitudes] = useState<AttitudeDetail[]>([]);
  const [summary, setSummary] = useState<AttitudeSummary[]>([]);
  const [classFilter, setClassFilter] = useState("");
  const [view, setView] = useState<"summary" | "detail">("summary");

  useEffect(() => {
    const params = new URLSearchParams();
    if (periodId) params.set("academic_period_id", String(periodId));
    if (classFilter) params.set("class_id", classFilter);

    fetch(apiUrl(`/api/headmaster/attitudes?${params.toString()}`), {
      credentials: "include",
    })
      .then((r) => r.json())
      .then((json: { attitudes: AttitudeDetail[]; summary: AttitudeSummary[] }) => {
        setAttitudes(json.attitudes);
        setSummary(json.summary);
        onLoaded();
      })
      .catch(() => onLoaded());
  }, [periodId, classFilter, onLoaded]);

  const overallAvg = summary.length > 0
    ? summary.reduce((sum, s) => sum + (s.avg_score ?? 0) * s.record_count, 0) /
      summary.reduce((sum, s) => sum + s.record_count, 0)
    : null;

  return (
    <div>
      <div className="attitude-summary-cards">
        <div className="attitude-summary-card">
          <span className="attitude-summary-label">Overall Average</span>
          <span className="attitude-summary-value" style={{ color: attitudeBarColor(overallAvg) }}>
            {formatAttitudeScore(overallAvg)}
          </span>
        </div>
        <div className="attitude-summary-card">
          <span className="attitude-summary-label">Total Records</span>
          <span className="attitude-summary-value">
            {summary.reduce((sum, s) => sum + s.record_count, 0)}
          </span>
        </div>
        <div className="attitude-summary-card">
          <span className="attitude-summary-label">Grade A Count</span>
          <span className="attitude-summary-value" style={{ color: "#22c55e" }}>
            {summary.reduce((sum, s) => sum + s.count_a, 0)}
          </span>
        </div>
        <div className="attitude-summary-card">
          <span className="attitude-summary-label">Grade B Count</span>
          <span className="attitude-summary-value" style={{ color: "#f59e0b" }}>
            {summary.reduce((sum, s) => sum + s.count_b, 0)}
          </span>
        </div>
      </div>

      <div className="detail-filters">
        <div className="view-toggle">
          <button
            className={`view-toggle-btn ${view === "summary" ? "view-toggle-active" : ""}`}
            onClick={() => setView("summary")}
            type="button"
          >
            By Class
          </button>
          <button
            className={`view-toggle-btn ${view === "detail" ? "view-toggle-active" : ""}`}
            onClick={() => setView("detail")}
            type="button"
          >
            All Records
          </button>
        </div>
        <select
          className="detail-select"
          value={classFilter}
          onChange={(e) => setClassFilter(e.target.value)}
        >
          <option value="">All Classes</option>
          {summary.map((s) => (
            <option key={s.class_id} value={s.class_id}>{s.class_name}</option>
          ))}
        </select>
      </div>

      {view === "summary" ? (
        <div className="detail-table-wrap">
          <table className="detail-table">
            <thead>
              <tr>
                <th>Class</th>
                <th>Avg Score</th>
                <th>Records</th>
                <th>A</th>
                <th>B</th>
                <th>C</th>
                <th>D</th>
              </tr>
            </thead>
            <tbody>
              {summary.map((s) => (
                <tr key={s.class_id}>
                  <td className="cell-bold">{s.class_name}</td>
                  <td>
                    <span
                      className="attitude-badge"
                      style={{ background: attitudeBarColor(s.avg_score) }}
                    >
                      {formatAttitudeScore(s.avg_score)}
                    </span>
                  </td>
                  <td>{s.record_count}</td>
                  <td>{s.count_a}</td>
                  <td>{s.count_b}</td>
                  <td>{s.count_c}</td>
                  <td>{s.count_d}</td>
                </tr>
              ))}
              {summary.length === 0 && (
                <tr><td colSpan={7} className="detail-empty">No data</td></tr>
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="detail-table-wrap">
          <table className="detail-table">
            <thead>
              <tr>
                <th>Student</th>
                <th>NIS</th>
                <th>Class</th>
                <th>Score</th>
                <th>Description</th>
                <th>Teacher</th>
              </tr>
            </thead>
            <tbody>
              {attitudes.map((a) => (
                <tr key={a.id}>
                  <td className="cell-bold">{a.student_name}</td>
                  <td>{a.nis}</td>
                  <td>{a.class_name}</td>
                  <td>
                    <span
                      className="attitude-badge"
                      style={{ background: attitudeBarColor(a.score === "A" ? 4 : a.score === "B" ? 3 : a.score === "C" ? 2 : 1) }}
                    >
                      {a.score}
                    </span>
                  </td>
                  <td>{a.description}</td>
                  <td>{a.teacher_name}</td>
                </tr>
              ))}
              {attitudes.length === 0 && (
                <tr><td colSpan={6} className="detail-empty">No records found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
      <div className="detail-count">
        {attitudes.length} record{attitudes.length !== 1 ? "s" : ""} total
      </div>
    </div>
  );
}

function buildConicGradient(segments: AssignmentsByType[], total: number): string {
  let accumulated = 0;
  const stops: string[] = [];
  for (const seg of segments) {
    const pct = (seg.count / total) * 100;
    const color = TYPE_COLORS[seg.assignment_type] ?? "#94a3b8";
    stops.push(`${color} ${accumulated}% ${accumulated + pct}%`);
    accumulated += pct;
  }
  return `conic-gradient(${stops.join(", ")})`;
}
