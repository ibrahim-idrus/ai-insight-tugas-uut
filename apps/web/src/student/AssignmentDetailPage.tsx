import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { apiUrl } from "../auth/api";

interface AssignmentDetail {
  id: number;
  title: string;
  description: string | null;
  assignment_type: string;
  start_at: string | null;
  due_at: string | null;
  assignment_status: string;
  subject_name: string;
  teacher_name: string;
  submission_id: number | null;
  submission_status: string | null;
  total_score: number | null;
  submitted_at: string | null;
  status: string;
}

function formatDate(iso: string | null): string {
  if (!iso) return "-";
  return new Date(iso).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
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

export default function AssignmentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [assignment, setAssignment] = useState<AssignmentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void fetch(apiUrl(`/api/student/assignments/${id}`), { credentials: "include" })
      .then(async (r) => {
        if (!active) return;
        if (!r.ok) throw new Error("Assignment not found");
        return r.json();
      })
      .then((d) => {
        if (active && d?.assignment) setAssignment(d.assignment);
      })
      .catch((e) => {
        if (active) setError(e.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [id]);

  async function handleStart() {
    setStarting(true);
    setStartError(null);
    try {
      const res = await fetch(apiUrl(`/api/student/assignments/${id}/start`), {
        method: "POST",
        credentials: "include",
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Failed to start assignment");

      if (assignment?.assignment_type === "quiz") {
        navigate(`/student/assignments/${id}/quiz`);
      } else if (assignment?.assignment_type === "upload") {
        navigate(`/student/assignments/${id}/upload`);
      }
    } catch (e: any) {
      setStartError(e.message);
    } finally {
      setStarting(false);
    }
  }

  if (loading) return <div className="loading-screen"><div className="loading-orb" /><p>Loading assignment...</p></div>;
  if (error) return <section className="page-content"><p className="form-error">{error}</p></section>;
  if (!assignment) return null;

  const canStart = assignment.status !== "graded" && (assignment.submission_status === null || assignment.submission_status === "in_progress");
  const isGraded = assignment.status === "graded";

  return (
    <section className="page-content">
      <button className="back-button" onClick={() => navigate("/student/assignments")} type="button">
        ← Back to Assignments
      </button>

      <article className="assignment-detail">
        <div className="page-heading">
          <div>
            <span className="eyebrow">Assignment / {typeLabel(assignment.assignment_type)}</span>
            <h1>{assignment.title}</h1>
            <div className="assignment-detail-meta">
              <span>{assignment.subject_name}</span>
              <span>{assignment.teacher_name}</span>
              <span className={`status-pill status-${assignment.status}`}>{statusLabel(assignment.status)}</span>
            </div>
          </div>
        </div>

        {assignment.description && (
          <div className="assignment-detail-section">
            <h2>Instructions</h2>
            <p>{assignment.description}</p>
          </div>
        )}

        <div className="assignment-detail-section">
          <h2>Schedule</h2>
          <div className="detail-fields">
            <div className="detail-field">
              <label>Start Date</label>
              <span>{formatDate(assignment.start_at)}</span>
            </div>
            <div className="detail-field">
              <label>Due Date</label>
              <span>{formatDate(assignment.due_at)}</span>
            </div>
          </div>
        </div>

        <div className="assignment-detail-section">
          <h2>Assignment Type</h2>
          <p>{typeLabel(assignment.assignment_type)}</p>
        </div>

        {isGraded && (
          <div className="assignment-detail-section">
            <h2>Submission</h2>
            <div className="detail-fields">
              <div className="detail-field">
                <label>Status</label>
                <span>{statusLabel(assignment.status)}</span>
              </div>
              {assignment.total_score !== null && (
                <div className="detail-field">
                  <label>Score</label>
                  <span>{assignment.total_score}</span>
                </div>
              )}
              {assignment.submitted_at && (
                <div className="detail-field">
                  <label>Submitted At</label>
                  <span>{formatDate(assignment.submitted_at)}</span>
                </div>
              )}
            </div>
            <button
              className="primary-button"
              onClick={() => navigate(`/student/assignments/${id}/result`)}
              type="button"
            >
              View Result
              <span aria-hidden="true">→</span>
            </button>
          </div>
        )}

        {canStart && (
          <div className="assignment-detail-section">
            {startError && <p className="form-error">{startError}</p>}
            <button
              className="primary-button"
              disabled={starting}
              onClick={() => void handleStart()}
              type="button"
            >
              {starting ? "Starting..." : "Start Assignment"}
              <span aria-hidden="true">→</span>
            </button>
          </div>
        )}
      </article>
    </section>
  );
}
