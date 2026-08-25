import { useEffect, useState, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import { TeacherApiError } from "../api";
import { getTeacherHomeroom, listTeacherHomerooms, saveTeacherAttitude } from "../analytics-api";
import type { TeacherHomeroomDetail, TeacherHomeroomSummary, TeacherAttitude } from "../analytics-api";
import { TeacherBreadcrumbs } from "../components/TeacherBreadcrumbs";
import { parseTeacherRouteId } from "../route";

export function TeacherHomeroomPage() {
  const [homerooms, setHomerooms] = useState<TeacherHomeroomSummary[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    void listTeacherHomerooms()
      .then((value) => { if (active) setHomerooms(value); })
      .catch((requestError: unknown) => { if (active) setError(requestError instanceof Error ? requestError.message : "Unable to load homerooms"); });
    return () => { active = false; };
  }, []);

  return (
    <section className="page-content">
      <TeacherBreadcrumbs items={[{ label: "Teacher", to: "/teacher/dashboard" }, { label: "Homeroom" }]} />
      <div className="page-heading"><div><span className="eyebrow">Academic portal / Homeroom</span><h1>Homeroom classes</h1><p>Manage your assigned class roster and attitude scores.</p></div><span className="role-pill">Teacher access only</span></div>
      {!homerooms && !error ? <p>Loading homerooms…</p> : null}
      {error ? <p className="form-error" role="alert">{error}</p> : null}
      {homerooms ? homerooms.length === 0 ? <p>You do not have a homeroom assignment yet.</p> : (
        <div className="card-grid teacher-homeroom-grid">
          {homerooms.map((homeroom) => <Link className="teacher-homeroom-card" key={homeroom.id} to={`/teacher/homeroom/${homeroom.id}`}><span className="eyebrow">{homeroom.academicPeriod.schoolYear} · Semester {homeroom.academicPeriod.semester}</span><h2>{homeroom.class.name}</h2><p>Grade {homeroom.class.gradeLevel}</p><strong>{homeroom.scoredCount} / {homeroom.studentCount} scores recorded →</strong></Link>)}
        </div>
      ) : null}
    </section>
  );
}

interface StudentFormState { score: TeacherAttitude["score"]; description: string; }

export function TeacherHomeroomDetailPage() {
  const { homeroomId } = useParams<{ homeroomId: string }>();
  const id = parseTeacherRouteId(homeroomId);
  const [detail, setDetail] = useState<TeacherHomeroomDetail | null>(null);
  const [forms, setForms] = useState<Record<number, StudentFormState>>({});
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState<number | null>(null);

  useEffect(() => {
    setDetail(null);
    setError("");
    if (!id) { setError("Homeroom not found"); return; }
    let active = true;
    void getTeacherHomeroom(id)
      .then((value) => {
        if (!active) return;
        setDetail(value);
        setForms(Object.fromEntries(value.students.map((student) => [student.id, { score: student.attitude?.score ?? "A", description: student.attitude?.description ?? "" }])));
      })
      .catch((requestError: unknown) => {
        if (!active) return;
        if (requestError instanceof TeacherApiError && requestError.status === 404) setError("Homeroom not found");
        else setError(requestError instanceof Error ? requestError.message : "Unable to load homeroom");
      });
    return () => { active = false; };
  }, [id]);

  function updateForm(studentId: number, update: Partial<StudentFormState>) {
    setForms((current) => ({ ...current, [studentId]: { ...current[studentId], ...update } }));
  }

  async function handleSave(event: FormEvent<HTMLFormElement>, studentId: number) {
    event.preventDefault();
    if (!id) return;
    const form = forms[studentId];
    if (!form) return;
    setIsSaving(studentId);
    setError("");
    try {
      const attitude = await saveTeacherAttitude(id, studentId, form.score, form.description);
      setDetail((current) => current ? { ...current, students: current.students.map((student) => student.id === studentId ? { ...student, attitude } : student) } : current);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to save attitude score");
    } finally {
      setIsSaving(null);
    }
  }

  const breadcrumbs = [{ label: "Teacher", to: "/teacher/dashboard" }, { label: "Homeroom", to: "/teacher/homeroom" }, { label: detail?.homeroom.class.name ?? "Homeroom details" }];
  if (error === "Homeroom not found") return <section className="page-content"><TeacherBreadcrumbs items={breadcrumbs.slice(0, 2).concat({ label: "Homeroom not found" })} /><div className="page-heading"><div><span className="eyebrow">Academic portal / Homeroom</span><h1>Homeroom not found</h1></div><Link className="role-pill" to="/teacher/homeroom">Homeroom</Link></div><p className="form-error" role="alert">Homeroom not found</p></section>;

  return (
    <section className="page-content">
      <TeacherBreadcrumbs items={breadcrumbs} />
      <div className="page-heading"><div><span className="eyebrow">Academic portal / Homeroom</span><h1>{detail?.homeroom.class.name ?? "Homeroom details"}</h1><p>{detail ? `${detail.homeroom.academicPeriod.schoolYear} · Semester ${detail.homeroom.academicPeriod.semester}` : "Update student attitude records."}</p></div><Link className="role-pill" to="/teacher/homeroom">All homerooms</Link></div>
      {!detail && !error ? <p>Loading homeroom…</p> : null}
      {error ? <p className="form-error" role="alert">{error}</p> : null}
      {detail ? (
        <div className="teacher-roster-list">
          {detail.students.length === 0 ? <p>No students are assigned to this homeroom.</p> : detail.students.map((student) => {
            const form = forms[student.id] ?? { score: "A" as const, description: "" };
            return <form className="teacher-roster-row" key={student.id} onSubmit={(event) => void handleSave(event, student.id)}><div><strong>{student.name}</strong><small>{student.nis} · Current score: {student.attitude?.score ?? "Not set"}</small></div><select aria-label={`Attitude score for ${student.name}`} id={`attitude-score-${student.id}`} onChange={(event) => updateForm(student.id, { score: event.target.value as StudentFormState["score"] })} value={form.score}><option value="A">A</option><option value="B">B</option><option value="C">C</option><option value="D">D</option></select><input aria-label={`Attitude description for ${student.name}`} onChange={(event) => updateForm(student.id, { description: event.target.value })} placeholder="Description" value={form.description} /><button className="primary-button" disabled={isSaving === student.id} type="submit">{isSaving === student.id ? "Saving…" : "Save attitude"}</button></form>;
          })}
        </div>
      ) : null}
    </section>
  );
}
