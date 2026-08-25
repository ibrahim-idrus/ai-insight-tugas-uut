import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  closeTeacherAssignment,
  createTeacherAssignment,
  deleteTeacherAssignment,
  getTeacherAssignment,
  listTeacherAssignmentContexts,
  publishTeacherAssignment,
  updateTeacherAssignment,
} from "../assignment-api";
import type { AssignmentFormInput, AssignmentStatus, AssignmentType, TeacherAssignment, TeacherAssignmentContext } from "../assignment-types";
import { TeacherApiError } from "../api";
import { TeacherBreadcrumbs } from "../components/TeacherBreadcrumbs";
import { parseTeacherRouteId } from "../route";

type AssignmentPageMode = "create" | "view" | "edit";

interface TeacherAssignmentPageProps { mode: AssignmentPageMode; }

const emptyForm: AssignmentFormInput = {
  subjectTeacherAssignmentId: null,
  title: "",
  description: "",
  assignmentType: "quiz",
  startAt: "",
  dueAt: "",
};

const typeLabels: Record<AssignmentType, string> = { quiz: "Quiz", task: "Regular task", upload: "Upload / evidence task" };
const statusLabels: Record<AssignmentStatus, string> = { draft: "Draft", published: "Published", closed: "Closed" };

function inputDate(value: string | null): string {
  return value ? value.replace(" ", "T").slice(0, 16) : "";
}

function formFromAssignment(assignment: TeacherAssignment): AssignmentFormInput {
  return {
    subjectTeacherAssignmentId: assignment.subjectTeacherAssignmentId,
    title: assignment.title,
    description: assignment.description ?? "",
    assignmentType: assignment.assignmentType,
    startAt: inputDate(assignment.startAt),
    dueAt: inputDate(assignment.dueAt),
  };
}

function contextLabel(context: TeacherAssignmentContext): string {
  return `${context.class.name} · ${context.subject.name} · ${context.academicPeriod.schoolYear} S${context.academicPeriod.semester}`;
}

export function TeacherAssignmentPage({ mode }: TeacherAssignmentPageProps) {
  const { assignmentId } = useParams<{ assignmentId: string }>();
  const navigate = useNavigate();
  const assignmentNumber = parseTeacherRouteId(assignmentId);
  const [assignment, setAssignment] = useState<TeacherAssignment | null>(null);
  const [contexts, setContexts] = useState<TeacherAssignmentContext[] | null>(mode === "view" ? [] : null);
  const [form, setForm] = useState<AssignmentFormInput>(emptyForm);
  const [error, setError] = useState("");
  const [loadError, setLoadError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setAssignment(null);
    setContexts(mode === "view" ? [] : null);
    setForm(emptyForm);
    setError("");
    setLoadError("");

    if (mode !== "create" && !assignmentNumber) {
      setError("Assignment not found");
      return;
    }

    let active = true;
    async function load() {
      try {
        if (mode !== "view") {
          const ownedContexts = await listTeacherAssignmentContexts();
          if (active) {
            setContexts(ownedContexts);
            if (mode === "create" && ownedContexts[0]) {
              setForm((current) => current.subjectTeacherAssignmentId
                ? current
                : { ...current, subjectTeacherAssignmentId: ownedContexts[0].id });
            }
          }
        }
        if (mode !== "create") {
          const loadedAssignment = await getTeacherAssignment(assignmentNumber!);
          if (!active) return;
          setAssignment(loadedAssignment);
          setForm(formFromAssignment(loadedAssignment));
        }
      } catch (requestError) {
        if (!active) return;
        if (requestError instanceof TeacherApiError && requestError.status === 404) setError("Assignment not found");
        else setLoadError(requestError instanceof Error ? requestError.message : "Unable to load assignment");
      }
    }
    void load();
    return () => { active = false; };
  }, [assignmentId, assignmentNumber, mode]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (!form.subjectTeacherAssignmentId) { setError("Teaching context is required"); return; }
    if (!form.title.trim()) { setError("Title is required"); return; }
    if (mode === "edit" && !assignmentNumber) { setError("Assignment not found"); return; }

    const input: AssignmentFormInput = {
      ...form,
      title: form.title.trim(),
      description: form.description.trim(),
      startAt: form.startAt.trim(),
      dueAt: form.dueAt.trim(),
    };
    setIsSubmitting(true);
    try {
      const saved = mode === "create"
        ? await createTeacherAssignment(input)
        : await updateTeacherAssignment(assignmentNumber!, input);
      navigate(`/teacher/assignments/${saved.id}`);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to save assignment");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!assignmentNumber || (typeof window !== "undefined" && !window.confirm("Delete this assignment?"))) return;
    setError("");
    setIsSubmitting(true);
    try {
      await deleteTeacherAssignment(assignmentNumber);
      navigate("/teacher/assignments");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to delete assignment");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleTransition(nextStatus: "published" | "closed") {
    if (!assignmentNumber) return;
    setError("");
    setIsSubmitting(true);
    try {
      const updated = nextStatus === "published"
        ? await publishTeacherAssignment(assignmentNumber)
        : await closeTeacherAssignment(assignmentNumber);
      setAssignment(updated);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : `Unable to ${nextStatus} assignment`);
    } finally {
      setIsSubmitting(false);
    }
  }

  const breadcrumbLabel = mode === "create" ? "New assignment" : mode === "edit" ? "Edit assignment" : assignment?.title ?? "Assignment";
  const breadcrumbs = [
    { label: "Teacher", to: "/teacher/dashboard" },
    { label: "Assignments", to: "/teacher/assignments" },
    { label: breadcrumbLabel },
  ];

  if (error === "Assignment not found") {
    return <section className="page-content"><TeacherBreadcrumbs items={[...breadcrumbs.slice(0, 2), { label: "Assignment not found" }]} /><div className="page-heading"><div><span className="eyebrow">Academic portal / Assignments</span><h1>Assignment not found</h1></div><Link className="role-pill" to="/teacher/assignments">Assignments</Link></div><p className="form-error" role="alert">Assignment not found</p></section>;
  }

  if (mode === "view") {
    return (
      <section className="page-content">
        <TeacherBreadcrumbs items={breadcrumbs} />
        <div className="page-heading"><div><span className="eyebrow">Academic portal / Assignments</span><h1>{assignment ? assignment.title : "Assignment"}</h1><p>{assignment ? `${assignment.context.class.name} · ${assignment.context.subject.name}` : ""}</p></div><Link className="role-pill" to="/teacher/assignments">Assignments</Link></div>
        {!assignment && !error && !loadError ? <p>Loading assignment…</p> : null}
        {loadError ? <p className="form-error" role="alert">{loadError}</p> : null}
        {error ? <p className="form-error" role="alert">{error}</p> : null}
        {assignment ? (
          <article className="assignment-detail">
            <div className="assignment-detail-heading"><span className={`assignment-status assignment-status-${assignment.status}`}>{statusLabels[assignment.status]}</span><span className="role-pill">{typeLabels[assignment.assignmentType]}</span></div>
            <p>{assignment.description || "No description provided."}</p>
            <dl className="assignment-meta-grid"><div><dt>Teaching context</dt><dd>{contextLabel(assignment.context)}</dd></div><div><dt>Starts</dt><dd>{assignment.startAt || "Not scheduled"}</dd></div><div><dt>Due</dt><dd>{assignment.dueAt || "No due date"}</dd></div></dl>
            <div className="assignment-actions">
              <Link className="primary-button" to={`/teacher/assignments/${assignment.id}/edit`}>Edit assignment</Link>
              {assignment.status === "draft" ? <button disabled={isSubmitting} onClick={() => void handleTransition("published")} type="button">{isSubmitting ? "Publishing…" : "Publish assignment"}</button> : null}
              {assignment.status === "published" ? <button disabled={isSubmitting} onClick={() => void handleTransition("closed")} type="button">{isSubmitting ? "Closing…" : "Close assignment"}</button> : null}
              <button className="danger-button" disabled={isSubmitting} onClick={() => void handleDelete()} type="button">Delete assignment</button>
            </div>
          </article>
        ) : null}
      </section>
    );
  }

  const isLoading = mode === "edit" ? !assignment && !loadError : !contexts && !loadError;
  return (
    <section className="page-content">
      <TeacherBreadcrumbs items={breadcrumbs} />
      <div className="page-heading"><div><span className="eyebrow">Academic portal / Assignments</span><h1>{mode === "create" ? "New assignment" : "Edit assignment"}</h1><p>Keep the assignment connected to one of your teaching contexts.</p></div><Link className="role-pill" to="/teacher/assignments">Assignments</Link></div>
      {isLoading ? <p>Loading assignment form…</p> : null}
      {loadError ? <p className="form-error" role="alert">{loadError}</p> : null}
      {!isLoading && !loadError && contexts?.length === 0 ? <p>No teaching contexts are assigned to you yet.</p> : null}
      {!isLoading && !loadError && contexts && contexts.length > 0 && (mode === "create" || assignment) ? (
        <form className="login-form assignment-form" onSubmit={(event) => void handleSubmit(event)}>
          <label htmlFor="assignment-context">Teaching context</label>
          <select id="assignment-context" onChange={(event) => setForm((current) => ({ ...current, subjectTeacherAssignmentId: Number(event.target.value) }))} value={form.subjectTeacherAssignmentId === null ? "" : String(form.subjectTeacherAssignmentId)}>
            <option disabled value="">Select a class and subject</option>
            {contexts.map((context) => <option key={context.id} value={context.id}>{contextLabel(context)}</option>)}
          </select>
          <label htmlFor="assignment-title">Title</label>
          <input id="assignment-title" onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} required value={form.title} />
          <label htmlFor="assignment-description">Description</label>
          <textarea id="assignment-description" onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} value={form.description} />
          <label htmlFor="assignment-type">Type</label>
          <select id="assignment-type" onChange={(event) => setForm((current) => ({ ...current, assignmentType: event.target.value as AssignmentType }))} value={form.assignmentType}>
            <option value="quiz">Quiz</option><option value="task">Regular task</option><option value="upload">Upload / evidence task</option>
          </select>
          <label htmlFor="assignment-start-at">Start</label>
          <input id="assignment-start-at" onChange={(event) => setForm((current) => ({ ...current, startAt: event.target.value }))} type="datetime-local" value={form.startAt} />
          <label htmlFor="assignment-due-at">Due</label>
          <input id="assignment-due-at" onChange={(event) => setForm((current) => ({ ...current, dueAt: event.target.value }))} type="datetime-local" value={form.dueAt} />
          {error ? <p className="form-error" role="alert">{error}</p> : null}
          <button className="primary-button" disabled={isSubmitting} type="submit">{isSubmitting ? "Saving assignment…" : "Save assignment"}</button>
          {mode === "edit" ? <button className="danger-button" disabled={isSubmitting} onClick={() => void handleDelete()} type="button">Delete assignment</button> : null}
        </form>
      ) : null}
    </section>
  );
}
