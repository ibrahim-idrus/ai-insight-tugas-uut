import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  TeacherApiError,
  createTeacherMaterial,
  deleteTeacherMaterial,
  getTeacherMaterial,
  updateTeacherMaterial,
} from "../api";
import type { MaterialFormInput, TeacherMaterial } from "../types";

type MaterialPageMode = "create" | "view" | "edit";

interface TeacherMaterialPageProps {
  mode: MaterialPageMode;
}

const emptyForm: MaterialFormInput = { title: "", description: "", content: "" };

function validId(value: string | undefined): number | null {
  if (!value || !/^\d+$/.test(value)) return null;
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function formInput(form: MaterialFormInput): MaterialFormInput {
  return {
    title: form.title.trim(),
    description: form.description || null,
    content: form.content || null,
  };
}

export function TeacherMaterialPage({ mode }: TeacherMaterialPageProps) {
  const { contextId, materialId } = useParams<{ contextId: string; materialId: string }>();
  const navigate = useNavigate();
  const [material, setMaterial] = useState<TeacherMaterial | null>(null);
  const [form, setForm] = useState<MaterialFormInput>(emptyForm);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const contextNumber = validId(contextId);
  const materialNumber = validId(materialId);

  useEffect(() => {
    setMaterial(null);
    setError("");
    setForm(emptyForm);

    if (mode === "create") return;
    if (!contextNumber || !materialNumber) {
      setError("Material not found");
      return;
    }

    let active = true;
    void getTeacherMaterial(contextNumber, materialNumber)
      .then((loadedMaterial) => {
        if (!active) return;
        setMaterial(loadedMaterial);
        setForm({
          title: loadedMaterial.title,
          description: loadedMaterial.description ?? "",
          content: loadedMaterial.content ?? "",
        });
      })
      .catch((requestError: unknown) => {
        if (!active) return;
        setError(requestError instanceof TeacherApiError && requestError.status === 404
          ? "Material not found"
          : requestError instanceof Error ? requestError.message : "Unable to load material");
      });

    return () => {
      active = false;
    };
  }, [contextId, materialId, mode]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!contextNumber || (mode === "edit" && !materialNumber)) {
      setError("Material not found");
      return;
    }

    const input = formInput(form);
    if (!input.title) {
      setError("Title is required");
      return;
    }

    setIsSubmitting(true);
    try {
      const savedMaterial = mode === "create"
        ? await createTeacherMaterial(contextNumber, input)
        : await updateTeacherMaterial(contextNumber, materialNumber!, input);
      navigate(`/teacher/classes/${contextNumber}/materials/${savedMaterial.id}`);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to save material");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!contextNumber || !materialNumber || !window.confirm("Delete this material?")) return;

    setError("");
    setIsSubmitting(true);
    try {
      await deleteTeacherMaterial(contextNumber, materialNumber);
      navigate(`/teacher/classes/${contextNumber}`);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to delete material");
    } finally {
      setIsSubmitting(false);
    }
  }

  const classesLink = <Link className="role-pill" to="/teacher/classes">Classes</Link>;

  if (error === "Material not found") {
    return (
      <section className="page-content">
        <div className="page-heading">
          <div><span className="eyebrow">Academic portal / Classes</span><h1>Material not found</h1></div>
          {classesLink}
        </div>
        <p className="form-error" role="alert">Material not found</p>
      </section>
    );
  }

  if (mode === "view") {
    return (
      <section className="page-content">
        <div className="page-heading">
          <div>
            <span className="eyebrow">Learning resources</span>
            <h1>{material ? material.title : "Material"}</h1>
          </div>
          {material && contextNumber ? <Link className="role-pill" to={`/teacher/classes/${contextNumber}/materials/${material.id}/edit`}>Edit</Link> : classesLink}
        </div>
        {!material && !error ? <p>Loading material…</p> : null}
        {error ? <p className="form-error" role="alert">{error}</p> : null}
        {material ? (
          <article className="placeholder-card">
            <h2>Description</h2>
            <p>{material.description || "No description provided."}</p>
            <h2>Content</h2>
            <p>{material.content || "No content provided."}</p>
          </article>
        ) : null}
      </section>
    );
  }

  const title = mode === "create" ? "New material" : "Edit material";
  return (
    <section className="page-content">
      <div className="page-heading">
        <div><span className="eyebrow">Learning resources</span><h1>{title}</h1></div>
        {classesLink}
      </div>
      {mode === "edit" && !material && !error ? <p>Loading material…</p> : null}
      {(mode === "create" || material) ? (
        <form className="login-form" onSubmit={(event) => void handleSubmit(event)}>
          <label htmlFor="material-title">Title</label>
          <input id="material-title" onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} required value={form.title} />
          <label htmlFor="material-description">Description</label>
          <textarea id="material-description" onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} value={form.description ?? ""} />
          <label htmlFor="material-content">Content</label>
          <textarea id="material-content" onChange={(event) => setForm((current) => ({ ...current, content: event.target.value }))} value={form.content ?? ""} />
          {error ? <p className="form-error" role="alert">{error}</p> : null}
          <button className="primary-button" disabled={isSubmitting} type="submit">{isSubmitting ? "Saving material…" : "Save material"}</button>
          {mode === "edit" ? <button disabled={isSubmitting} onClick={() => void handleDelete()} type="button">Delete material</button> : null}
        </form>
      ) : null}
    </section>
  );
}
