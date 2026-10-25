"use client";

import { useEffect, useState } from "react";

type ReviewQuestion = {
  number: number;
  id: string;
  subject_id: string;
  question_text: string;
  options: { key: string; text: string }[];
  selected_option: string | null;
  correct_option: string;
  is_correct: boolean;
  is_flagged: boolean;
  explanation: string;
};

type ExamResult = {
  attempt_id: string;
  score: number;
  total_questions: number;
  percentage: number;
  started_at: string;
  submitted_at: string | null;
  questions: ReviewQuestion[];
};

export default function ResultInterface({ attemptId }: { attemptId: string }) {
  const [result, setResult] = useState<ExamResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("all");
  const [expanded, setExpanded] = useState<number[]>([]);
  const [showReview, setShowReview] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadResult() {
      try {
        const response = await fetch(`/api/exam/${attemptId}/result`, {
          cache: "no-store",
        });
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error ?? "Unable to load your examination result.");
        }

        if (active) setResult(data);
      } catch (err) {
        if (active) {
          setError(
            err instanceof Error ? err.message : "Something went wrong. Please try again."
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    loadResult();
    return () => {
      active = false;
    };
  }, [attemptId]);

  if (loading) {
    return (
      <main className="result-page">
        <div className="result-loading">
          <div className="result-spinner" />
          <h2>Preparing your results</h2>
          <p>We’re reviewing your submitted answers.</p>
        </div>
      </main>
    );
  }

  if (error || !result) {
    return (
      <main className="result-page">
        <section className="result-error-card">
          <div className="result-error-icon">!</div>
          <h1>Results unavailable</h1>
          <p>{error || "We couldn’t find your examination result."}</p>
          <button className="result-primary-button" onClick={() => window.location.reload()}>
            Try again
          </button>
        </section>
      </main>
    );
  }

  const correct = result.questions.filter((q) => q.is_correct).length;
  const wrong = result.questions.filter((q) => q.selected_option && !q.is_correct).length;
  const unanswered = result.questions.filter((q) => !q.selected_option).length;

  const filteredQuestions = result.questions.filter((question) => {
    if (filter === "correct") return question.is_correct;
    if (filter === "wrong") return Boolean(question.selected_option) && !question.is_correct;
    if (filter === "unanswered") return !question.selected_option;
    return true;
  });

  function toggleExpanded(number: number) {
    setExpanded((current) =>
      current.includes(number)
        ? current.filter((item) => item !== number)
        : [...current, number]
    );
  }

  function formatDate(value: string | null) {
    if (!value) return "—";
    return new Date(value).toLocaleString("en-NG", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  }

  return (
    <main className="result-page">
      <div className="result-container">
        <header className="result-topbar">
          <a href="/" className="result-brand">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-[#315D3B] bg-[#173F2B] text-[#FFFFFF] shadow-md shadow-[#173F2B]/20">
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    className="h-7 w-7"
    aria-hidden="true"
  >
    <path
      d="m2.5 8.5 9.5-5 9.5 5-9.5 5-9.5-5Z"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M6 10.5v5c3.5 2.5 8.5 2.5 12 0v-5M21.5 9v6"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
</span>
            <span>JAMB<span className="result-brand-light"> READY</span></span>
          </a>
          <span className="result-completed-pill">
            <span /> Examination submitted
          </span>
        </header>

        <section className="result-hero">
          <div className="result-hero-copy">
            <span className="result-eyebrow">YOUR EXAMINATION REPORT</span>
            <h1>
              {result.percentage >= 70
                ? "Excellent effort!"
                : result.percentage >= 50
                  ? "Good work. Keep improving."
                  : "Every attempt is a chance to improve."}
            </h1>
            <p>
              Your examination has been marked. Review your performance and learn
              from every question below.
            </p>
            <div className="result-date">
              <span>Submitted</span>
              <strong>{formatDate(result.submitted_at)}</strong>
            </div>
          </div>

          <div className="result-score-card">
            <div
              className="result-score-ring"
              style={{
                background: `conic-gradient(#16845b ${result.percentage}%, #e7eee9 ${result.percentage}% 100%)`,
              }}
            >
              <div className="result-score-ring-inner">
                <strong>{result.percentage}%</strong>
                <span>Overall score</span>
              </div>
            </div>
            <div className="result-score-fraction">
              <strong>{result.score}</strong>
              <span> / {result.total_questions} marks</span>
            </div>
            <p>One mark for each correct answer</p>
          </div>
        </section>

        <section className="result-stats-grid">
          <article className="result-stat-card">
            <div className="result-stat-icon result-green-icon">✓</div>
            <span>Correct answers</span>
            <strong>{correct}</strong>
            <small>Questions answered correctly</small>
          </article>
          <article className="result-stat-card">
            <div className="result-stat-icon result-red-icon">×</div>
            <span>Incorrect answers</span>
            <strong>{wrong}</strong>
            <small>Questions to learn from</small>
          </article>
          <article className="result-stat-card">
            <div className="result-stat-icon result-amber-icon">—</div>
            <span>Unanswered</span>
            <strong>{unanswered}</strong>
            <small>Questions left blank</small>
          </article>
          <article className="result-stat-card">
            <div className="result-stat-icon result-blue-icon">◎</div>
            <span>Completion rate</span>
            <strong>
              {result.total_questions
                ? Math.round(((result.total_questions - unanswered) / result.total_questions) * 100)
                : 0}%
            </strong>
            <small>Questions you attempted</small>
          </article>
        </section>

        <section className="result-review-heading">
          <div>
            <span className="result-eyebrow">LEARN FROM YOUR ATTEMPT</span>
            <h2>Review your answers</h2>
            <p>Check the correct options and read explanations to strengthen your understanding.</p>
          </div>
          <button
            className="result-secondary-button"
            onClick={() => {
              setShowReview(!showReview);
              if (!showReview) setFilter("all");
            }}
          >
            {showReview ? "Hide question review" : "Review all questions"}
            <span>{showReview ? "↑" : "↓"}</span>
          </button>
        </section>

        <section className="result-review-panel">
          <div className="result-filter-bar">
            {[
              { id: "all", label: "All questions", count: result.total_questions },
              { id: "correct", label: "Correct", count: correct },
              { id: "wrong", label: "Incorrect", count: wrong },
              { id: "unanswered", label: "Unanswered", count: unanswered },
            ].map((item) => (
              <button
                key={item.id}
                className={`result-filter-button ${filter === item.id ? "active" : ""}`}
                onClick={() => {
                  setFilter(item.id);
                  setShowReview(true);
                }}
              >
                {item.label} <span>{item.count}</span>
              </button>
            ))}
          </div>

          {showReview && (
            <div className="result-question-list">
              {filteredQuestions.length === 0 ? (
                <div className="result-empty-review">No questions in this category.</div>
              ) : (
                filteredQuestions.map((question) => {
                  const isOpen = expanded.includes(question.number);
                  const status = question.is_correct
                    ? "correct"
                    : question.selected_option
                      ? "wrong"
                      : "unanswered";

                  return (
                    <article className="result-question-card" key={question.id}>
                      <button
                        className="result-question-toggle"
                        onClick={() => toggleExpanded(question.number)}
                        aria-expanded={isOpen}
                      >
                        <span className={`result-question-number ${status}`}>
                          {question.number}
                        </span>
                        <span className="result-question-summary">
                          <strong>Question {question.number}</strong>
                          <small>
                            {status === "correct"
                              ? "Answered correctly"
                              : status === "wrong"
                                ? "Incorrect answer"
                                : "Not answered"}
                          </small>
                        </span>
                        <span className={`result-status-pill ${status}`}>
                          {status === "correct"
                            ? "Correct"
                            : status === "wrong"
                              ? "Incorrect"
                              : "Unanswered"}
                        </span>
                        <span className="result-chevron">{isOpen ? "−" : "+"}</span>
                      </button>

                      {isOpen && (
                        <div className="result-question-details">
                          <p className="result-question-text">{question.question_text}</p>

                          <div className="result-options-list">
                            {question.options.map((option) => {
                              const isCorrect = option.key === question.correct_option;
                              const isSelected = option.key === question.selected_option;

                              return (
                                <div
                                  key={option.key}
                                  className={[
                                    "result-option",
                                    isCorrect ? "is-correct" : "",
                                    isSelected && !isCorrect ? "is-incorrect" : "",
                                  ]
                                    .filter(Boolean)
                                    .join(" ")}
                                >
                                  <span className="result-option-key">{option.key}</span>
                                  <span>{option.text}</span>
                                  <span className="result-option-label">
                                    {isCorrect
                                      ? "Correct answer"
                                      : isSelected
                                        ? "Your answer"
                                        : ""}
                                  </span>
                                </div>
                              );
                            })}
                          </div>

                          <div className="result-answer-summary">
                            <div>
                              <span>Your answer</span>
                              <strong className={question.is_correct ? "text-correct" : "text-incorrect"}>
                                {question.selected_option || "Not answered"}
                              </strong>
                            </div>
                            <div>
                              <span>Correct answer</span>
                              <strong className="text-correct">{question.correct_option || "Unavailable"}</strong>
                            </div>
                          </div>

                          {question.explanation && (
                            <div className="result-explanation">
                              <strong><span>✦</span> Explanation</strong>
                              <p>{question.explanation}</p>
                            </div>
                          )}
                        </div>
                      )}
                    </article>
                  );
                })
              )}
            </div>
          )}
        </section>

        <footer className="result-footer">
          <p>Your result is based on the answers saved for this submitted attempt.</p>
          <button className="result-back-top" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
            Back to top ↑
          </button>
        </footer>
      </div>
    </main>
  );
}
