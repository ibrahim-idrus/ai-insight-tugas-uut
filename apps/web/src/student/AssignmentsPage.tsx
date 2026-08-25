import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { apiUrl } from "../auth/api";

interface Assignment {
  id: number;
  title: string;
  assignment_type: string;
  start_at: string | null;
  due_at: string | null;
  subject_name: string;
  teacher_name: string;
  submission_status: string | null;
  total_score: number | null;
  status: string;
}

function formatDate(iso: string | null): string {
  if (!iso) return "-";
  return new Date(iso).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function typeLabel(t: string): string {
  if (t === "quiz") return "Quiz";
  if (t === "upload") return "Upload";
  return t;
}

function statusLabel(s: string): string {
  if (s === "graded") return "Graded";
  return "Not Yet Done";
}

export default function AssignmentsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [subjectFilter, setSubjectFilter] = useState<string>("all");
  const statusFilter = searchParams.get("status") ?? "all";

  useEffect(() => {
    let active = true;
    void fetch(apiUrl("/api/student/assignments"), { credentials: "include" })
      .then(async (r) => {
        if (!active) return;
        if (!r.ok) throw new Error("Failed to load assignments");
        return r.json();
      })
      .then((d) => {
        if (active && d?.assignments) setAssignments(d.assignments);
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
    const set = new Set(assignments.map((a) => a.subject_name));
    return ["all", ...Array.from(set)];
  }, [assignments]);

  const filtered = useMemo(() => {
    return assignments.filter((a) => {
      const matchesSearch =
        !search ||
        a.title.toLowerCase().includes(search.toLowerCase()) ||
        a.subject_name.toLowerCase().includes(search.toLowerCase()) ||
        a.teacher_name.toLowerCase().includes(search.toLowerCase());
      const matchesSubject = subjectFilter === "all" || a.subject_name === subjectFilter;
      const matchesStatus = statusFilter === "all" || a.status === statusFilter;
      return matchesSearch && matchesSubject && matchesStatus;
    });
  }, [assignments, search, subjectFilter, statusFilter]);

  function setStatusFilter(s: string) {
    if (s === "all") {
      searchParams.delete("status");
    } else {
      searchParams.set("status", s);
    }
    setSearchParams(searchParams);
  }

  if (loading) return <div className="loading-screen"><div className="loading-orb" /><p>Loading assignments...</p></div>;
  if (error) return <section className="page-content"><p className="form-error">{error}</p></section>;

  return (
    <section className="page-content">
      <div className="page-heading">
        <div>
          <span className="eyebrow">Student / Assignments</span>
          <h1>Assignments</h1>
          <p>View and complete your assignments</p>
        </div>
      </div>

      <div className="filter-bar">
        <input
          className="search-input"
          placeholder="Search assignments..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="filter-row">
          <div className="filter-tabs">
            {subjects.map((s) => (
              <button
                key={s}
                className={`filter-tab ${subjectFilter === s ? "filter-tab-active" : ""}`}
                onClick={() => setSubjectFilter(s)}
                type="button"
              >
                {s === "all" ? "All Subjects" : s}
              </button>
            ))}
          </div>
          <div className="filter-tabs">
            {["all", "not_yet_done", "graded"].map((s) => (
              <button
                key={s}
                className={`filter-tab ${statusFilter === s ? "filter-tab-active" : ""}`}
                onClick={() => setStatusFilter(s)}
                type="button"
              >
                {s === "all" ? "All Status" : s === "not_yet_done" ? "Not Yet Done" : "Graded"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state">
          <span className="empty-state-icon">▤</span>
          <h3>No assignments found</h3>
          <p>There are no assignments matching your filters.</p>
        </div>
      ) : (
        <div className="card-grid">
          {filtered.map((a) => (
            <article
              key={a.id}
              className="assignment-card"
              onClick={() => navigate(`/student/assignments/${a.id}`)}
            >
              <div className="assignment-card-header">
                <h3>{a.title}</h3>
                <span className={`status-pill status-${a.status}`}>{statusLabel(a.status)}</span>
              </div>
              <div className="assignment-card-meta">
                <span>{a.subject_name}</span>
                <span>{a.teacher_name}</span>
                <span className="type-pill">{typeLabel(a.assignment_type)}</span>
              </div>
              <div className="assignment-card-footer">
                <span>Start: {formatDate(a.start_at)}</span>
                <span>Due: {formatDate(a.due_at)}</span>
              </div>
              {a.status === "graded" && a.total_score !== null && (
                <div className="assignment-card-score">
                  Score: {a.total_score}
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
