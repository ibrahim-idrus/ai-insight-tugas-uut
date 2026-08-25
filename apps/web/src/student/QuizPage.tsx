import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { apiUrl } from "../auth/api";

interface Question {
  id: number;
  question_text: string;
  question_type: string;
  points: number;
  question_order: number;
  savedAnswer: string | null;
  options?: string[];
}

interface QuizState {
  submissionId: number;
  assignmentType: string;
  questions: Question[];
}

export default function QuizPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [quiz, setQuiz] = useState<QuizState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [currentQ, setCurrentQ] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    let active = true;
    void fetch(apiUrl(`/api/student/assignments/${id}/start`), {
      method: "POST",
      credentials: "include",
    })
      .then(async (r) => {
        if (!active) return;
        if (!r.ok) {
          const body = await r.json().catch(() => null);
          throw new Error(body?.error ?? "Failed to start quiz");
        }
        return r.json();
      })
      .then((d) => {
        if (active && d) {
          setQuiz(d);
          const initial: Record<number, string> = {};
          for (const q of d.questions) {
            initial[q.id] = q.savedAnswer ?? "";
          }
          setAnswers(initial);
        }
      })
      .catch((e) => {
        if (active) setError(e.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [id]);

  function setAnswer(questionId: number, value: string) {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  }

  async function handleSubmit() {
    setSubmitting(true);
    setSubmitError(null);
    try {
      const answerArray = Object.entries(answers).map(([questionId, answer]) => ({
        questionId: Number(questionId),
        answer,
      }));

      const res = await fetch(apiUrl(`/api/student/assignments/${id}/submit`), {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers: answerArray }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Failed to submit quiz");

      navigate(`/student/assignments/${id}/result`);
    } catch (e: any) {
      setSubmitError(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <div className="loading-screen"><div className="loading-orb" /><p>Loading quiz...</p></div>;
  if (error) return (
    <section className="page-content">
      <button className="back-button" onClick={() => navigate(`/student/assignments/${id}`)} type="button">
        ← Back to Assignment
      </button>
      <p className="form-error">{error}</p>
    </section>
  );
  if (!quiz) return null;

  const questions = quiz.questions;
  const q = questions[currentQ];
  const answeredCount = Object.values(answers).filter((a) => a.trim() !== "").length;
  const totalQuestions = questions.length;

  return (
    <section className="page-content">
      <button className="back-button" onClick={() => navigate(`/student/assignments/${id}`)} type="button">
        ← Back to Assignment
      </button>

      <div className="quiz-container">
        <div className="quiz-progress">
          <span>Question {currentQ + 1} of {totalQuestions}</span>
          <span>{answeredCount} answered</span>
        </div>

        <div className="quiz-progress-bar">
          <div className="quiz-progress-fill" style={{ width: `${((currentQ + 1) / totalQuestions) * 100}%` }} />
        </div>

        <article className="quiz-question">
          <div className="quiz-question-header">
            <span className="quiz-question-number">Q{currentQ + 1}</span>
            <span className="quiz-question-points">{q.points} pts</span>
          </div>
          <p className="quiz-question-text">{q.question_text}</p>

          {q.question_type === "multiple_choice" && q.options ? (
            <div className="quiz-options">
              {q.options.map((opt, i) => (
                <label key={i} className={`quiz-option ${answers[q.id] === opt ? "quiz-option-selected" : ""}`}>
                  <input
                    type="radio"
                    name={`q-${q.id}`}
                    checked={answers[q.id] === opt}
                    onChange={() => setAnswer(q.id, opt)}
                  />
                  <span>{opt}</span>
                </label>
              ))}
            </div>
          ) : q.question_type === "true_false" ? (
            <div className="quiz-options">
              {["True", "False"].map((opt) => (
                <label key={opt} className={`quiz-option ${answers[q.id] === opt ? "quiz-option-selected" : ""}`}>
                  <input
                    type="radio"
                    name={`q-${q.id}`}
                    checked={answers[q.id] === opt}
                    onChange={() => setAnswer(q.id, opt)}
                  />
                  <span>{opt}</span>
                </label>
              ))}
            </div>
          ) : q.question_type === "essay" ? (
            <textarea
              className="quiz-textarea"
              placeholder="Type your answer here..."
              value={answers[q.id] ?? ""}
              onChange={(e) => setAnswer(q.id, e.target.value)}
              rows={6}
            />
          ) : (
            <input
              className="quiz-input"
              type="text"
              placeholder="Type your answer..."
              value={answers[q.id] ?? ""}
              onChange={(e) => setAnswer(q.id, e.target.value)}
            />
          )}
        </article>

        <div className="quiz-nav">
          <button
            className="quiz-nav-btn"
            disabled={currentQ === 0}
            onClick={() => setCurrentQ((c) => c - 1)}
            type="button"
          >
            Previous
          </button>

          <div className="quiz-dots">
            {questions.map((_, i) => (
              <button
                key={i}
                className={`quiz-dot ${i === currentQ ? "quiz-dot-active" : ""} ${answers[questions[i].id]?.trim() ? "quiz-dot-answered" : ""}`}
                onClick={() => setCurrentQ(i)}
                type="button"
                aria-label={`Question ${i + 1}`}
              />
            ))}
          </div>

          {currentQ < totalQuestions - 1 ? (
            <button
              className="quiz-nav-btn quiz-nav-btn-primary"
              onClick={() => setCurrentQ((c) => c + 1)}
              type="button"
            >
              Next
            </button>
          ) : (
            <button
              className="quiz-nav-btn quiz-nav-btn-primary"
              onClick={() => setShowConfirm(true)}
              type="button"
            >
              Submit Quiz
            </button>
          )}
        </div>
      </div>

      {showConfirm && (
        <div className="modal-overlay" onClick={() => setShowConfirm(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h2>Submit Quiz?</h2>
            <p>You have answered {answeredCount} of {totalQuestions} questions.</p>
            {submitError && <p className="form-error">{submitError}</p>}
            <div className="modal-actions">
              <button className="modal-btn" onClick={() => setShowConfirm(false)} type="button">
                Cancel
              </button>
              <button
                className="primary-button"
                disabled={submitting}
                onClick={() => void handleSubmit()}
                type="button"
              >
                {submitting ? "Submitting..." : "Confirm Submit"}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
