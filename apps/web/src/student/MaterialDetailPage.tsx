import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { apiUrl } from "../auth/api";

interface Material {
  id: number;
  title: string;
  description: string | null;
  content: string | null;
  created_at: string;
  subject_name: string;
  teacher_name: string;
}

export default function MaterialDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [material, setMaterial] = useState<Material | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void fetch(apiUrl(`/api/student/materials/${id}`), { credentials: "include" })
      .then(async (r) => {
        if (!active) return;
        if (!r.ok) throw new Error("Material not found");
        return r.json();
      })
      .then((d) => {
        if (active && d?.material) setMaterial(d.material);
      })
      .catch((e) => {
        if (active) setError(e.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [id]);

  if (loading) return <div className="loading-screen"><div className="loading-orb" /><p>Loading material...</p></div>;
  if (error) return <section className="page-content"><p className="form-error">{error}</p></section>;
  if (!material) return null;

  return (
    <section className="page-content">
      <button className="back-button" onClick={() => navigate("/student/materials")} type="button">
        ← Back to Materials
      </button>

      <article className="material-detail">
        <div className="page-heading">
          <div>
            <span className="eyebrow">Material</span>
            <h1>{material.title}</h1>
            <div className="material-detail-meta">
              <span>{material.teacher_name}</span>
              <span>{material.subject_name}</span>
            </div>
          </div>
        </div>

        {material.description && (
          <p className="material-detail-desc">{material.description}</p>
        )}

        {material.content && (
          <div className="material-detail-content">
            {material.content}
          </div>
        )}
      </article>
    </section>
  );
}
