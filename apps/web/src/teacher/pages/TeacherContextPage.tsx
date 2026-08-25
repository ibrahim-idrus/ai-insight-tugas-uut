import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getTeacherClass } from "../api";
import { TeacherBreadcrumbs } from "../components/TeacherBreadcrumbs";
import { parseTeacherRouteId } from "../route";
import type { TeacherContextDetails } from "../types";

function formatUpdatedDate(value: string): string {
  return new Date(value).toLocaleDateString();
}

export function TeacherContextPage() {
  const { contextId } = useParams<{ contextId: string }>();
  const [context, setContext] = useState<TeacherContextDetails | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    setContext(null);
    setError("");

    const id = parseTeacherRouteId(contextId);
    if (id === null) {
      setError("Class context not found");
      return;
    }

    let active = true;
    void getTeacherClass(id)
      .then((details) => {
        if (active) setContext(details);
      })
      .catch((requestError: unknown) => {
        if (active) setError(requestError instanceof Error ? requestError.message : "Unable to load class context");
      });

    return () => {
      active = false;
    };
  }, [contextId]);

  return (
    <section className="page-content">
      <TeacherBreadcrumbs items={[
        { label: "Teacher", to: "/teacher/dashboard" },
        { label: "Classes", to: "/teacher/classes" },
        { label: context ? `${context.class.name} · ${context.subject.name}` : "Class details" },
      ]} />
      <div className="page-heading">
        <div>
          <span className="eyebrow">Academic portal / Classes</span>
          <h1>{context ? `${context.class.name} · ${context.subject.name}` : "Class details"}</h1>
          {context ? (
            <p>
              {context.subject.code} · Grade {context.class.gradeLevel} · {context.academicPeriod.schoolYear} · Semester {context.academicPeriod.semester}
            </p>
          ) : null}
        </div>
        <Link className="role-pill" to="/teacher/classes">
          Classes
        </Link>
      </div>

      {!context && !error ? <p>Loading class details…</p> : null}
      {error ? <p className="form-error" role="alert">{error}</p> : null}

      {context ? (
        <>
          <section>
            <div className="page-heading">
              <div>
                <span className="eyebrow">Class roster</span>
                <h2>Students</h2>
              </div>
            </div>
            {context.students.length === 0 ? <p>No students are assigned to this class yet.</p> : (
              <table>
                <thead>
                  <tr><th>Name</th><th>NIS</th></tr>
                </thead>
                <tbody>
                  {context.students.map((student) => (
                    <tr key={student.id}>
                      <td data-label="Name">{student.name}</td>
                      <td data-label="NIS">{student.nis}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>

          <section>
            <div className="page-heading">
              <div>
                <span className="eyebrow">Learning resources</span>
                <h2>Materials</h2>
              </div>
              <Link className="primary-button" to={`/teacher/classes/${context.id}/materials/new`}>New material</Link>
            </div>
            {context.materials.length === 0 ? <p>No materials have been created for this class yet.</p> : (
              <table>
                <thead>
                  <tr><th>Title</th><th>Updated</th><th>Actions</th></tr>
                </thead>
                <tbody>
                  {context.materials.map((material) => (
                    <tr key={material.id}>
                      <td data-label="Title">{material.title}</td>
                      <td data-label="Updated">{formatUpdatedDate(material.updatedAt)}</td>
                      <td data-label="Actions">
                        <Link to={`/teacher/classes/${context.id}/materials/${material.id}`}>View</Link>{" "}
                        <Link to={`/teacher/classes/${context.id}/materials/${material.id}/edit`}>Edit</Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        </>
      ) : null}
    </section>
  );
}
