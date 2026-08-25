import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiUrl } from "../auth/api";

interface DashboardData {
  profile: {
    student_name: string;
    nis: string;
    class_name: string;
    grade_level: number;
    school_year: string;
    semester: number;
  };
  averageScore: number | null;
  gradedCount: number;
  notDoneCount: number;
  upcoming: {
    id: number;
    title: string;
    assignment_type: string;
    start_at: string | null;
    due_at: string | null;
    subject_name: string;
    teacher_name: string;
    submission_status: string | null;
  }[];
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

export default function DashboardPage() {
  const navigate = useNavigate();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void fetch(apiUrl("/api/student/dashboard"), { credentials: "include" })
      .then(async (r) => {
        if (!active) return;
        if (!r.ok) throw new Error("Failed to load dashboard");
        return r.json();
      })
      .then((d) => {
        if (active && d) setData(d);
      })
      .catch((e) => {
        if (active) setError(e.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  if (loading) return <div className="loading-screen"><div className="loading-orb" /><p>Loading dashboard...</p></div>;
  if (error) return <section className="page-content"><p className="form-error">{error}</p></section>;
  if (!data) return null;

  const avg = data.averageScore !== null ? Math.round(data.averageScore * 10) / 10 : null;

  return (
    <section className="page-content">
      <div className="page-heading">
        <div>
          <span className="eyebrow">Student / Dashboard</span>
          <h1>Dashboard</h1>
          <p>Welcome back, {data.profile.student_name}</p>
        </div>
      </div>

      <div className="dash-grid">
        <article className="dash-card dash-card-profile" onClick={() => navigate("/student/profile")}>
          <div className="dash-card-icon">◎</div>
          <div>
            <span className="eyebrow">Student Identity</span>
            <h2>{data.profile.student_name}</h2>
            <p>NIS: {data.profile.nis}</p>
            <p>Class: {data.profile.class_name} (Grade {data.profile.grade_level})</p>
            <p>Period: {data.profile.school_year} / Semester {data.profile.semester}</p>
          </div>
        </article>

        <article className="dash-card dash-card-score">
          <div className="dash-card-icon">✦</div>
          <div>
            <span className="eyebrow">Average Score</span>
            <h2>{avg !== null ? avg : "No scores yet"}</h2>
            {avg !== null && <p>Based on all graded submissions</p>}
          </div>
        </article>

        <article
          className="dash-card dash-card-completed"
          onClick={() => navigate("/student/assignments?status=graded")}
        >
          <div className="dash-card-icon">✓</div>
          <div>
            <span className="eyebrow">Graded</span>
            <h2>{data.gradedCount}</h2>
            <p>Graded assignments</p>
          </div>
        </article>

        <article
          className="dash-card dash-card-pending"
          onClick={() => navigate("/student/assignments?status=not_yet_done")}
        >
          <div className="dash-card-icon">○</div>
          <div>
            <span className="eyebrow">Not Done Yet</span>
            <h2>{data.notDoneCount}</h2>
            <p>Assignments to complete</p>
          </div>
        </article>
      </div>

      {data.upcoming.length > 0 && (
        <div className="dash-section">
          <h2>Upcoming Assignments</h2>
          <div className="dash-upcoming-list">
            {data.upcoming.map((a) => (
              <article
                key={a.id}
                className="upcoming-card"
                onClick={() => navigate(`/student/assignments/${a.id}`)}
              >
                <div className="upcoming-card-header">
                  <h3>{a.title}</h3>
                  <span className="type-pill">{typeLabel(a.assignment_type)}</span>
                </div>
                <div className="upcoming-card-meta">
                  <span>{a.subject_name}</span>
                  <span>{a.teacher_name}</span>
                </div>
                <div className="upcoming-card-footer">
                  <span className="upcoming-due">Due: {formatDate(a.due_at)}</span>
                </div>
              </article>
            ))}
          </div>
        </div>
      )}

      {data.upcoming.length === 0 && data.notDoneCount === 0 && (
        <div className="dash-section">
          <div className="empty-state">
            <span className="empty-state-icon">✦</span>
            <h3>All caught up!</h3>
            <p>No pending assignments at the moment.</p>
          </div>
        </div>
      )}
    </section>
  );
}
