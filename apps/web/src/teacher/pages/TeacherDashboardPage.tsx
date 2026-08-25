import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getTeacherDashboard } from "../analytics-api";
import type { TeacherDashboard } from "../analytics-api";
import { TeacherBreadcrumbs } from "../components/TeacherBreadcrumbs";

function formatDue(value: string | null): string {
  if (!value) return "No deadline";
  const date = new Date(value.replace(" ", "T"));
  return Number.isFinite(date.getTime()) ? date.toLocaleDateString() : value;
}

export function TeacherDashboardPage() {
  const [dashboard, setDashboard] = useState<TeacherDashboard | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    void getTeacherDashboard()
      .then((value) => { if (active) setDashboard(value); })
      .catch((requestError: unknown) => {
        if (active) setError(requestError instanceof Error ? requestError.message : "Unable to load teacher dashboard");
      });
    return () => { active = false; };
  }, []);

  return (
    <section className="page-content">
      <TeacherBreadcrumbs items={[{ label: "Teacher", to: "/teacher/dashboard" }, { label: "Dashboard" }]} />
      <div className="page-heading">
        <div>
          <span className="eyebrow">Academic portal / Teacher dashboard</span>
          <h1>Teacher dashboard</h1>
          <p>A quick view of your teaching contexts, assessment activity, and class performance.</p>
        </div>
        <span className="role-pill">Teacher workspace</span>
      </div>

      {!dashboard && !error ? <p>Loading teacher dashboard…</p> : null}
      {error ? <p className="form-error" role="alert">{error}</p> : null}
      {dashboard ? (
        <>
          <div className="teacher-metric-grid">
            <article className="teacher-metric-card"><span>Teaching contexts</span><strong>{dashboard.contexts.length}</strong><small>Classes and subjects</small></article>
            <article className="teacher-metric-card"><span>Assignments</span><strong>{dashboard.assignments.total}</strong><small>{dashboard.assignments.published} published · {dashboard.assignments.draft} draft</small></article>
            <article className="teacher-metric-card"><span>Submissions</span><strong>{dashboard.submissions.total}</strong><small>{dashboard.submissions.graded} graded · {dashboard.submissions.inProgress} in progress</small></article>
            <article className="teacher-metric-card"><span>Average performance</span><strong>{dashboard.performance.averageScore === null ? "—" : `${dashboard.performance.averageScore.toFixed(1)}%`}</strong><small>{dashboard.performance.gradedSubmissionCount} graded submissions</small></article>
          </div>

          <div className="teacher-dashboard-columns">
            <section className="teacher-panel">
              <div className="teacher-panel-heading"><div><span className="eyebrow">Your teaching contexts</span><h2>Classes and subjects</h2></div><Link to="/teacher/classes">View all</Link></div>
              {dashboard.contexts.length === 0 ? <p>No teaching contexts are assigned to you yet.</p> : (
                <div className="teacher-context-list">
                  {dashboard.contexts.slice(0, 6).map((context) => (
                    <Link className="teacher-context-row" key={context.id} to={`/teacher/classes/${context.id}`}>
                      <span><strong>{context.class.name}</strong><small>{context.subject.name} · {context.academicPeriod.schoolYear} S{context.academicPeriod.semester}</small></span>
                      <span>{context.studentCount} students →</span>
                    </Link>
                  ))}
                </div>
              )}
            </section>

            <section className="teacher-panel">
              <div className="teacher-panel-heading"><div><span className="eyebrow">Latest activity</span><h2>Recent assignments</h2></div><Link to="/teacher/assignments">View all</Link></div>
              {dashboard.recentAssignments.length === 0 ? <p>No assignments have been created yet.</p> : (
                <div className="teacher-context-list">
                  {dashboard.recentAssignments.map((assignment) => (
                    <Link className="teacher-context-row" key={assignment.id} to={`/teacher/assignments/${assignment.id}`}>
                      <span><strong>{assignment.title}</strong><small>{assignment.className} · {assignment.subjectName} · {assignment.status}</small></span>
                      <span>{formatDue(assignment.dueAt)}</span>
                    </Link>
                  ))}
                </div>
              )}
            </section>
          </div>
        </>
      ) : null}
    </section>
  );
}
