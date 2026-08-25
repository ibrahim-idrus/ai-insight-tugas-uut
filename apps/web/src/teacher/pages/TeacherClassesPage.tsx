import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { listTeacherClasses } from "../api";
import type { TeacherContextSummary } from "../types";

function pluralize(count: number, noun: string): string {
  return `${count} ${noun}${count === 1 ? "" : "s"}`;
}

export function TeacherClassesPage() {
  const [classes, setClasses] = useState<TeacherContextSummary[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    void listTeacherClasses()
      .then((contexts) => {
        if (active) setClasses(contexts);
      })
      .catch((requestError: unknown) => {
        if (active) setError(requestError instanceof Error ? requestError.message : "Unable to load classes");
      });

    return () => {
      active = false;
    };
  }, []);

  const periods = useMemo(() => {
    const grouped = new Map<number, { label: string; contexts: TeacherContextSummary[] }>();
    for (const context of classes ?? []) {
      const period = grouped.get(context.academicPeriod.id) ?? {
        label: `${context.academicPeriod.schoolYear} · Semester ${context.academicPeriod.semester}`,
        contexts: [],
      };
      period.contexts.push(context);
      grouped.set(context.academicPeriod.id, period);
    }
    return [...grouped.entries()];
  }, [classes]);

  return (
    <section className="page-content">
      <div className="page-heading">
        <div>
          <span className="eyebrow">Academic portal / Classes</span>
          <h1>Classes</h1>
          <p>Choose a class to view its students and learning materials.</p>
        </div>
        <span className="role-pill">Teacher workspace</span>
      </div>

      {classes === null && !error ? <p>Loading classes…</p> : null}
      {error ? <p className="form-error" role="alert">{error}</p> : null}
      {classes?.length === 0 ? <p>No classes are assigned to you yet.</p> : null}

      {periods.map(([periodId, period]) => (
        <section key={periodId}>
          <span className="eyebrow">{period.label}</span>
          <div className="placeholder-grid">
            {period.contexts.map((context) => (
              <Link className="placeholder-card placeholder-card-primary" key={context.id} to={`/teacher/classes/${context.id}`}>
                <span className="placeholder-icon" aria-hidden="true">◇</span>
                <div>
                  <span className="eyebrow">{context.subject.code}</span>
                  <h2>{context.class.name}</h2>
                  <p>{context.subject.name}</p>
                  <p>{pluralize(context.studentCount, "student")} · {pluralize(context.materialCount, "material")}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      ))}
    </section>
  );
}
