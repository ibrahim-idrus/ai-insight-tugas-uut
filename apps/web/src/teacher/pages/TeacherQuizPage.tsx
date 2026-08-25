import { useEffect, useState, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import { TeacherApiError } from "../api";
import { createTeacherQuizQuestion, deleteTeacherQuizQuestion, getTeacherQuiz, reorderTeacherQuizQuestions, updateTeacherQuizQuestion } from "../quiz-api";
import type { QuizQuestionInput, QuizQuestionType, TeacherQuiz } from "../quiz-api";
import { TeacherBreadcrumbs } from "../components/TeacherBreadcrumbs";
import { parseTeacherRouteId } from "../route";

const questionTypeLabels: Record<QuizQuestionType, string> = {
  multiple_choice: "Multiple choice",
  true_false: "True / false",
  short_answer: "Short answer",
  essay: "Essay",
};

const emptyForm: QuizQuestionInput = { questionText: "", questionType: "multiple_choice", points: 10, answerKey: "" };

export function TeacherQuizPage() {
  const { assignmentId } = useParams<{ assignmentId: string }>();
  const id = parseTeacherRouteId(assignmentId);
  const [quiz, setQuiz] = useState<TeacherQuiz | null>(null);
  const [form, setForm] = useState<QuizQuestionInput>(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [loadError, setLoadError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setQuiz(null);
    setError("");
    setLoadError("");
    if (!id) {
      setError("Quiz not found");
      return;
    }
    let active = true;
    void getTeacherQuiz(id)
      .then((value) => { if (active) setQuiz(value); })
      .catch((requestError: unknown) => {
        if (!active) return;
        if (requestError instanceof TeacherApiError && requestError.status === 404) setError("Quiz not found");
        else setLoadError(requestError instanceof Error ? requestError.message : "Unable to load quiz");
      });
    return () => { active = false; };
  }, [id]);

  function editQuestion(questionId: number) {
    const question = quiz?.questions.find((item) => item.id === questionId);
    if (!question) return;
    setEditingId(questionId);
    setForm({ questionText: question.questionText, questionType: question.questionType, points: question.points, answerKey: question.answerKey ?? "" });
    setError("");
  }

  async function refresh() {
    if (id) setQuiz(await getTeacherQuiz(id));
  }

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!id) return;
    if (!form.questionText.trim()) { setError("Question text is required"); return; }
    setError("");
    setIsSubmitting(true);
    try {
      if (editingId === null) await createTeacherQuizQuestion(id, { ...form, questionText: form.questionText.trim(), answerKey: (form.answerKey ?? "").trim() });
      else await updateTeacherQuizQuestion(id, editingId, { ...form, questionText: form.questionText.trim(), answerKey: (form.answerKey ?? "").trim() });
      await refresh();
      setForm(emptyForm);
      setEditingId(null);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to save question");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete(questionId: number) {
    if (!id || (typeof window !== "undefined" && !window.confirm("Delete this question?"))) return;
    setIsSubmitting(true);
    setError("");
    try {
      await deleteTeacherQuizQuestion(id, questionId);
      if (editingId === questionId) { setEditingId(null); setForm(emptyForm); }
      await refresh();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to delete question");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function moveQuestion(questionId: number, direction: -1 | 1) {
    if (!id || !quiz) return;
    const ids = quiz.questions.map((question) => question.id);
    const index = ids.indexOf(questionId);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= ids.length) return;
    [ids[index], ids[target]] = [ids[target], ids[index]];
    setIsSubmitting(true);
    try { setQuiz(await reorderTeacherQuizQuestions(id, ids)); }
    catch (requestError) { setError(requestError instanceof Error ? requestError.message : "Unable to reorder questions"); }
    finally { setIsSubmitting(false); }
  }

  const breadcrumbs = [
    { label: "Teacher", to: "/teacher/dashboard" },
    { label: "Assignments", to: "/teacher/assignments" },
    { label: quiz?.assignment.title ?? "Quiz" , to: id ? `/teacher/assignments/${id}` : "/teacher/assignments" },
    { label: "Quiz builder" },
  ];

  if (error === "Quiz not found") {
    return <section className="page-content"><TeacherBreadcrumbs items={breadcrumbs.slice(0, 2).concat({ label: "Quiz not found" })} /><div className="page-heading"><div><span className="eyebrow">Academic portal / Assignments</span><h1>Quiz not found</h1></div><Link className="role-pill" to="/teacher/assignments">Assignments</Link></div><p className="form-error" role="alert">Quiz not found</p></section>;
  }

  return (
    <section className="page-content">
      <TeacherBreadcrumbs items={breadcrumbs} />
      <div className="page-heading">
        <div><span className="eyebrow">Academic portal / Quiz builder</span><h1>{quiz?.assignment.title ?? "Quiz builder"}</h1><p>{quiz ? `${quiz.assignment.context.class.name} · ${quiz.assignment.context.subject.name}` : "Manage questions, answer keys, and points."}</p></div>
        {quiz ? <strong className="teacher-total-points">{`Total points: ${quiz.totalPoints}`}</strong> : null}
      </div>
      {!quiz && !error && !loadError ? <p>Loading quiz…</p> : null}
      {loadError ? <p className="form-error" role="alert">{loadError}</p> : null}
      {error ? <p className="form-error" role="alert">{error}</p> : null}
      {quiz ? (
        <>
          <section className="teacher-panel teacher-quiz-panel">
            <div className="teacher-panel-heading"><div><span className="eyebrow">Question list</span><h2>{quiz.questions.length} questions</h2></div><Link to={`/teacher/assignments/${quiz.assignment.id}/results`}>View results</Link></div>
            {quiz.questions.length === 0 ? <p>No questions have been added yet.</p> : (
              <div className="teacher-quiz-list">
                {quiz.questions.map((question, index) => (
                  <article className="teacher-quiz-question" key={question.id}>
                    <div className="teacher-quiz-question-main"><span className="teacher-question-number">{question.questionOrder}</span><div><strong>{question.questionText}</strong><small>{questionTypeLabels[question.questionType]} · {question.points} points · Answer: {question.answerKey || "Not set"}</small></div></div>
                    <div className="teacher-quiz-actions"><button disabled={isSubmitting || index === 0} onClick={() => void moveQuestion(question.id, -1)} type="button" title="Move up">↑</button><button disabled={isSubmitting || index === quiz.questions.length - 1} onClick={() => void moveQuestion(question.id, 1)} type="button" title="Move down">↓</button><button disabled={isSubmitting} onClick={() => editQuestion(question.id)} type="button">Edit</button><button className="danger-button" disabled={isSubmitting} onClick={() => void handleDelete(question.id)} type="button">Delete</button></div>
                  </article>
                ))}
              </div>
            )}
          </section>

          <form className="login-form assignment-form teacher-question-form" onSubmit={(event) => void handleSave(event)}>
            <div className="teacher-panel-heading"><div><span className="eyebrow">Question editor</span><h2>{editingId === null ? "Add question" : "Edit question"}</h2></div>{editingId !== null ? <button onClick={() => { setEditingId(null); setForm(emptyForm); }} type="button">Cancel edit</button> : null}</div>
            <label htmlFor="quiz-question-text">Question</label>
            <textarea id="quiz-question-text" onChange={(event) => setForm((current) => ({ ...current, questionText: event.target.value }))} required value={form.questionText} />
            <label htmlFor="quiz-question-type">Question type</label>
            <select id="quiz-question-type" onChange={(event) => setForm((current) => ({ ...current, questionType: event.target.value as QuizQuestionType }))} value={form.questionType}>
              {(Object.keys(questionTypeLabels) as QuizQuestionType[]).map((type) => <option key={type} value={type}>{questionTypeLabels[type]}</option>)}
            </select>
            <label htmlFor="quiz-question-points">Points</label>
            <input id="quiz-question-points" min="0" onChange={(event) => setForm((current) => ({ ...current, points: Number(event.target.value) }))} type="number" value={form.points} />
            <label htmlFor="quiz-question-answer">Answer key / options</label>
            <textarea id="quiz-question-answer" onChange={(event) => setForm((current) => ({ ...current, answerKey: event.target.value }))} placeholder="Correct answer; for choices you may enter one option per line" value={form.answerKey ?? ""} />
            {error ? <p className="form-error" role="alert">{error}</p> : null}
            <button className="primary-button" disabled={isSubmitting} type="submit">{isSubmitting ? "Saving…" : editingId === null ? "Add question" : "Save question"}</button>
          </form>
        </>
      ) : null}
    </section>
  );
}
