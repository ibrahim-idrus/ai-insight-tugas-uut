import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiUrl } from "../auth/api";

interface Material {
  id: number;
  title: string;
  description: string | null;
  created_at: string;
  subject_name: string;
  teacher_name: string;
}

export default function MaterialsPage() {
  const navigate = useNavigate();
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [subjectFilter, setSubjectFilter] = useState<string>("all");

  useEffect(() => {
    let active = true;
    void fetch(apiUrl("/api/student/materials"), { credentials: "include" })
      .then(async (r) => {
        if (!active) return;
        if (!r.ok) throw new Error("Failed to load materials");
        return r.json();
      })
      .then((d) => {
        if (active && d?.materials) setMaterials(d.materials);
      })
      .catch((e) => {
        if (active) setError(e.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  const subjects = useMemo(() => {
    const set = new Set(materials.map((m) => m.subject_name));
    return ["all", ...Array.from(set)];
  }, [materials]);

  const filtered = useMemo(() => {
    return materials.filter((m) => {
      const matchesSearch =
        !search ||
        m.title.toLowerCase().includes(search.toLowerCase()) ||
        m.teacher_name.toLowerCase().includes(search.toLowerCase()) ||
        m.subject_name.toLowerCase().includes(search.toLowerCase());
      const matchesSubject = subjectFilter === "all" || m.subject_name === subjectFilter;
      return matchesSearch && matchesSubject;
    });
  }, [materials, search, subjectFilter]);

  if (loading) return <div className="loading-screen"><div className="loading-orb" /><p>Loading materials...</p></div>;
  if (error) return <section className="page-content"><p className="form-error">{error}</p></section>;

  return (
    <section className="page-content">
      <div className="page-heading">
        <div>
          <span className="eyebrow">Student / Materials</span>
          <h1>Learning Materials</h1>
          <p>Browse materials for your class</p>
        </div>
      </div>

      <div className="filter-bar">
        <input
          className="search-input"
          placeholder="Search materials..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="filter-tabs">
          {subjects.map((s) => (
            <button
              key={s}
              className={`filter-tab ${subjectFilter === s ? "filter-tab-active" : ""}`}
              onClick={() => setSubjectFilter(s)}
              type="button"
            >
              {s === "all" ? "All" : s}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state">
          <span className="empty-state-icon">◇</span>
          <h3>No materials found</h3>
          <p>There are no materials matching your search.</p>
        </div>
      ) : (
        <div className="card-grid">
          {filtered.map((m) => (
            <article
              key={m.id}
              className="material-card"
              onClick={() => navigate(`/student/materials/${m.id}`)}
            >
              <div className="material-card-header">
                <h3>{m.title}</h3>
              </div>
              <div className="material-card-meta">
                <span className="meta-subject">{m.subject_name}</span>
                <span className="meta-teacher">{m.teacher_name}</span>
              </div>
              {m.description && (
                <p className="material-card-desc">{m.description}</p>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
