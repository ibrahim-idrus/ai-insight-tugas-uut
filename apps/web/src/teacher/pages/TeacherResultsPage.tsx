import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { TeacherApiError } from "../api";
import { getTeacherAssignmentResults } from "../analytics-api";
import type { TeacherAssignmentResults } from "../analytics-api";
import { TeacherBreadcrumbs } from "../components/TeacherBreadcrumbs";
import { parseTeacherRouteId } from "../route";

const statusLabels: Record<string, string> = { not_started: "Not started", in_progress: "In progress", submitted: "Submitted", graded: "Graded" };

function formatDate(value: string | null): string {
  if (!value) return "—";
  const date = new Date(value.replace(" ", "T"));
  return Number.isFinite(date.getTime()) ? date.toLocaleString() : value;
}

export function TeacherResultsPage() {
  const { assignmentId } = useParams<{ assignmentId: string }>();
  const id = parseTeacherRouteId(assignmentId);
  const [results, setResults] = useState<TeacherAssignmentResults | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    setResults(null);
    setError("");
    if (!id) { setError("Assignment not found"); return; }
    let active = true;
    void getTeacherAssignmentResults(id)
      .then((value) => { if (active) setResults(value); })
      .catch((requestError: unknown) => {
        if (!active) return;
        if (requestError instanceof TeacherApiError && requestError.status === 404) setError("Assignment not found");
        else setError(requestError instanceof Error ? requestError.message : "Unable to load assignment results");
      });
    return () => { active = false; };
  }, [id]);

  const breadcrumbs = [
    { label: "Teacher", to: "/teacher/dashboard" },
    { label: "Assignments", to: "/teacher/assignments" },
    { label: results?.assignment.title ?? "Assignment", to: id ? `/teacher/assignments/${id}` : "/teacher/assignments" },
    { label: "Results" },
  ];

  if (error === "Assignment not found") {
    return <section className="page-content"><TeacherBreadcrumbs items={breadcrumbs.slice(0, 2).concat({ label: "Assignment not found" })} /><div className="page-heading"><div><span className="eyebrow">Academic portal / Results</span><h1>Assignment not found</h1></div><Link className="role-pill" to="/teacher/assignments">Assignments</Link></div><p className="form-error" role="alert">Assignment not found</p></section>;
  }

  return (
    <section className="page-content">
      <TeacherBreadcrumbs items={breadcrumbs} />
      <div className="page-heading"><div><span className="eyebrow">Academic portal / Assignment results</span><h1>Assignment results</h1><p>{results ? `${results.assignment.title} · ${results.assignment.context.class.name}` : "Review the whole class roster."}</p></div><Link className="role-pill" to={id ? `/teacher/assignments/${id}` : "/teacher/assignments"}>Assignment</Link></div>
      {!results && !error ? <p>Loading assignment results…</p> : null}
      {error ? <p className="form-error" role="alert">{error}</p> : null}
      {results ? (
        <div className="table-wrap teacher-results-table-wrap">
          <table className="data-table">
            <thead><tr><th>Student</th><th>NIS</th><th>Status</th><th>Submitted</th><th>Score</th></tr></thead>
            <tbody>
              {results.students.map((student) => (
                <tr key={student.id}><td className="cell-bold">{student.name}</td><td>{student.nis}</td><td><span className={`status-pill status-${student.status}`}>{statusLabels[student.status] ?? student.status}</span></td><td>{formatDate(student.submittedAt)}</td><td>{student.score === null ? "—" : `${student.score} / ${results.totalPoints}`}</td></tr>
              ))}
            </tbody>
          </table>
          {results.students.length === 0 ? <p className="teacher-table-empty">No students are assigned to this class.</p> : null}
        </div>
      ) : null}
    </section>
  );
}
