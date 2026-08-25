import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { listTeacherAssignments } from "../assignment-api";
import type { AssignmentStatus, AssignmentType, TeacherAssignment } from "../assignment-types";
import { TeacherBreadcrumbs } from "../components/TeacherBreadcrumbs";

const typeLabels: Record<AssignmentType, string> = { quiz: "Quiz", task: "Regular task", upload: "Upload / evidence" };
const statusLabels: Record<AssignmentStatus, string> = { draft: "Draft", published: "Published", closed: "Closed" };

export function TeacherAssignmentsPage() {
  const [assignments, setAssignments] = useState<TeacherAssignment[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    void listTeacherAssignments()
      .then((items) => { if (active) setAssignments(items); })
      .catch((requestError: unknown) => {
        if (active) setError(requestError instanceof Error ? requestError.message : "Unable to load assignments");
      });
    return () => { active = false; };
  }, []);

  return (
    <section className="page-content">
      <TeacherBreadcrumbs items={[{ label: "Teacher", to: "/teacher/dashboard" }, { label: "Assignments" }]} />
      <div className="page-heading">
        <div>
          <span className="eyebrow">Academic portal / Assignments</span>
          <h1>Assignments</h1>
          <p>Create and manage the work connected to your teaching contexts.</p>
        </div>
        <Link className="primary-button assignment-create-link" to="/teacher/assignments/new">New assignment</Link>
      </div>

      {!assignments && !error ? <p>Loading assignments…</p> : null}
      {error ? <p className="form-error" role="alert">{error}</p> : null}
      {assignments?.length === 0 ? <p>No assignments have been created yet.</p> : null}
      {assignments && assignments.length > 0 ? (
        <table className="assignment-list">
          <thead><tr><th>Assignment</th><th>Context</th><th>Type</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            {assignments.map((assignment) => (
              <tr key={assignment.id}>
                <td data-label="Assignment"><strong>{assignment.title}</strong><span className="assignment-description">{assignment.description || "No description"}</span></td>
                <td data-label="Context">{assignment.context.class.name} · {assignment.context.subject.name}</td>
                <td data-label="Type">{typeLabels[assignment.assignmentType]}</td>
                <td data-label="Status"><span className={`assignment-status assignment-status-${assignment.status}`}>{statusLabels[assignment.status]}</span></td>
                <td data-label="Actions"><Link to={`/teacher/assignments/${assignment.id}`}>View</Link>{" "}<Link to={`/teacher/assignments/${assignment.id}/edit`}>Edit</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
    </section>
  );
}
