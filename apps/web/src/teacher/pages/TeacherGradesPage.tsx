import { useEffect, useState } from "react";
import { getTeacherGrades, type TeacherGradeFilters, type TeacherGradesResponse } from "../analytics-api";
import { TeacherBreadcrumbs } from "../components/TeacherBreadcrumbs";

const initialFilters: TeacherGradeFilters = { contextId: null, assignmentType: "", search: "" };

function formatPercent(value: number | null): string {
  return value === null ? "—" : `${value.toFixed(1)}%`;
}

export function TeacherGradesPage() {
  const [filters, setFilters] = useState<TeacherGradeFilters>(initialFilters);
  const [data, setData] = useState<TeacherGradesResponse | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    setData(null);
    setError("");
    void getTeacherGrades(filters)
      .then((value) => { if (active) setData(value); })
      .catch((requestError: unknown) => { if (active) setError(requestError instanceof Error ? requestError.message : "Unable to load grades"); });
    return () => { active = false; };
  }, [filters]);

  return (
    <section className="page-content">
      <TeacherBreadcrumbs items={[{ label: "Teacher", to: "/teacher/dashboard" }, { label: "Grades" }]} />
      <div className="page-heading"><div><span className="eyebrow">Academic portal / Grades</span><h1>Teacher grades</h1><p>Compare dynamically calculated averages across your owned assignments.</p></div><span className="role-pill">Normalized percentages</span></div>
      <div className="teacher-filter-bar">
        <label htmlFor="grade-context">Class / subject</label>
        <select id="grade-context" onChange={(event) => setFilters((current) => ({ ...current, contextId: event.target.value ? Number(event.target.value) : null }))} value={filters.contextId ?? ""}>
          <option value="">All teaching contexts</option>
          {data?.contexts.map((context) => <option key={context.id} value={context.id}>{context.class.name} · {context.subject.name}</option>)}
        </select>
        <label htmlFor="grade-type">Assignment type</label>
        <select id="grade-type" onChange={(event) => setFilters((current) => ({ ...current, assignmentType: event.target.value }))} value={filters.assignmentType}>
          <option value="">All types</option><option value="quiz">Quiz</option><option value="task">Task</option><option value="upload">Upload</option>
        </select>
        <label htmlFor="grade-search">Search students</label>
        <input id="grade-search" onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))} placeholder="Search students" value={filters.search} />
      </div>
      {!data && !error ? <p>Loading grades…</p> : null}
      {error ? <p className="form-error" role="alert">{error}</p> : null}
      {data ? (
        data.grades.length === 0 ? <p>No grade records match these filters.</p> : (
          <div className="table-wrap teacher-results-table-wrap"><table className="data-table"><thead><tr><th>Student</th><th>Class</th><th>Average</th><th>Assignments</th><th>Coverage</th></tr></thead><tbody>
            {data.grades.map((grade) => <tr key={grade.studentId}><td><strong>{grade.studentName}</strong><small className="table-secondary">{grade.nis}</small></td><td>{grade.className}</td><td className="teacher-grade-score">{formatPercent(grade.averageScore)}</td><td>{grade.assignmentCount}</td><td>{`${grade.gradedCount} graded · ${grade.submittedCount} submitted`}</td></tr>)}
          </tbody></table></div>
        )
      ) : null}
    </section>
  );
}
