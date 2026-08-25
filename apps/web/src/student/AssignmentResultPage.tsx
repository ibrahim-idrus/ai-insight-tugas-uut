import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { apiUrl } from "../auth/api";

interface ResultData {
  assignment: {
    id: number;
    title: string;
    assignment_type: string;
    subject_name: string;
    teacher_name: string;
  };
  submission: {
    status: string;
    totalScore: number | null;
    maxScore: number;
    submittedAt: string | null;
    hasPendingEssay: boolean;
  };
  results: {
    question_text: string;
    question_type: string;
    points: number;
    answer: string | null;
    score: number | null;
    is_correct: number | null;
  }[];
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

export default function AssignmentResultPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<ResultData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void fetch(apiUrl(`/api/student/assignments/${id}/result`), { credentials: "include" })
      .then(async (r) => {
        if (!active) return;
        if (!r.ok) throw new Error("No result found");
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
  }, [id]);

  if (loading) return <div className="loading-screen"><div className="loading-orb" /><p>Loading result...</p></div>;
  if (error) return (
    <section className="page-content">
      <button className="back-button" onClick={() => navigate(`/student/assignments/${id}`)} type="button">
        ← Back to Assignment
      </button>
      <p className="form-error">{error}</p>
    </section>
  );
  if (!data) return null;

  const { assignment, submission, results } = data;
  const percentage = submission.maxScore > 0
    ? submission.totalScore !== null
      ? Math.round((submission.totalScore / submission.maxScore) * 100)
      : null
    : null;

  return (
    <section className="page-content">
      <button className="back-button" onClick={() => navigate("/student/assignments")} type="button">
        ← Back to Assignments
      </button>

      <div className="result-container">
        <div className="page-heading">
          <div>
            <span className="eyebrow">Assignment / Result</span>
            <h1>{assignment.title}</h1>
            <div className="assignment-detail-meta">
              <span>{assignment.subject_name}</span>
              <span>{assignment.teacher_name}</span>
            </div>
          </div>
        </div>

        <div className="result-score-card">
          <div className="result-score-main">
            {submission.totalScore !== null ? (
              <>
                <span className="result-score-number">{submission.totalScore}</span>
                <span className="result-score-max">/ {submission.maxScore}</span>
                {percentage !== null && (
                  <span className="result-score-percent">{percentage}%</span>
                )}
              </>
            ) : (
              <span className="result-score-pending">Pending Review</span>
            )}
          </div>
          <div className="result-score-meta">
            <span>Status: {submission.status === "graded" ? "Graded" : "Submitted"}</span>
            {submission.submittedAt && (
              <span>Submitted: {formatDate(submission.submittedAt)}</span>
            )}
            {submission.hasPendingEssay && (
              <span className="result-pending-note">Some questions are pending teacher review</span>
            )}
          </div>
        </div>

        {results.length > 0 && (
          <div className="result-questions">
            <h2>Question Results</h2>
            {results.map((r, i) => (
              <article key={i} className="result-question-card">
                <div className="result-question-header">
                  <span className="result-question-num">Q{i + 1}</span>
                  <span className="result-question-type">{r.question_type.replace("_", " ")}</span>
                  <span className="result-question-points">
                    {r.score !== null ? `${r.score}` : "-"}/{r.points} pts
                  </span>
                </div>
                <p className="result-question-text">{r.question_text}</p>
                <div className="result-question-answer">
                  <label>Your answer:</label>
                  <span>{r.answer || "(no answer)"}</span>
                </div>
                {r.question_type !== "essay" && (
                  <div className={`result-question-verdict ${r.is_correct === 1 ? "result-correct" : r.is_correct === 0 ? "result-incorrect" : ""}`}>
                    {r.is_correct === 1 ? "✓ Correct" : r.is_correct === 0 ? "✗ Incorrect" : "Pending review"}
                  </div>
                )}
                {r.question_type === "essay" && r.score === null && (
                  <div className="result-question-verdict result-pending">
                    Pending teacher review
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
