"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type Question = {
  id: string;
  subject_id: string;
  subject_name?: string | null;
  subject_code?: string | null;
  question_text: string;
  options: Record<string, string> | string[] | unknown;
};

type SavedAnswer = {
  question_id: string;
  selected_option: string | null;
  is_flagged: boolean;
};

type ExamData = {
  ok: boolean;
  attempt_id: string;
  ends_at: string;
  total_questions: number;
  questions: Question[];
  answers: SavedAnswer[];
};

type Props = {
  attemptId: string;
};

function formatTime(seconds: number) {
  const safe = Math.max(0, seconds);
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const remainingSeconds = safe % 60;

  return [hours, minutes, remainingSeconds]
    .map((part) => String(part).padStart(2, "0"))
    .join(":");
}

function getOptions(
  options: Question["options"]
): { key: string; text: string }[] {
  if (Array.isArray(options)) {
    return options.map((item, index) => {
      const key = String.fromCharCode(65 + index);

      if (typeof item === "string") {
        return { key, text: item };
      }

      if (item && typeof item === "object") {
        const value = item as Record<string, unknown>;

        return {
          key: typeof value.key === "string" ? value.key : key,
          text: String(value.text ?? value.label ?? value.value ?? ""),
        };
      }

      return { key, text: String(item ?? "") };
    });
  }

  if (options && typeof options === "object") {
    return Object.entries(options as Record<string, unknown>).map(
      ([key, value]) => ({
        key: key.toUpperCase(),
        text:
          value && typeof value === "object"
            ? String(
                (value as Record<string, unknown>).text ??
                  (value as Record<string, unknown>).label ??
                  ""
              )
            : String(value ?? ""),
      })
    );
  }

  return [];
}

function getSubjectName(question: Question) {
  return (
    question.subject_name?.trim() ||
    question.subject_code?.trim() ||
    "Current subject"
  );
}

export default function ExamInterface({ attemptId }: Props) {
  const [exam, setExam] = useState<ExamData | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<
    Record<string, string>
  >({});
  const [flagged, setFlagged] = useState<Record<string, boolean>>({});
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);

  const submitExam = useCallback(async () => {
    if (submitting) return;

    setSubmitting(true);
    setError("");
    setNotice("Submitting your exam...");

    try {
      const response = await fetch(`/api/exam/${attemptId}/submit`, {
        method: "POST",
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error ?? "Unable to submit your exam.");
      }

      window.location.assign(result.result_url);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Submission failed. Please try again."
      );

      setNotice("");
      setSubmitting(false);
    }
  }, [attemptId, submitting]);

  useEffect(() => {
    let cancelled = false;

    async function loadExam() {
      try {
        const response = await fetch(`/api/exam/${attemptId}`, {
          cache: "no-store",
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error ?? "Unable to load the exam.");
        }

        if (cancelled) return;

        const data = result as ExamData;

        setExam(data);

        const answers: Record<string, string> = {};
        const flags: Record<string, boolean> = {};

        for (const answer of data.answers ?? []) {
          if (answer.selected_option) {
            answers[answer.question_id] = answer.selected_option;
          }

          if (answer.is_flagged) {
            flags[answer.question_id] = true;
          }
        }

        setSelectedAnswers(answers);
        setFlagged(flags);

        setSecondsLeft(
          Math.max(
            0,
            Math.floor(
              (new Date(data.ends_at).getTime() - Date.now()) / 1000
            )
          )
        );
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Unable to load the exam."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadExam();

    return () => {
      cancelled = true;
    };
  }, [attemptId]);

  useEffect(() => {
    if (!exam || submitting) return;

    const timer = window.setInterval(() => {
      const remaining = Math.max(
        0,
        Math.floor(
          (new Date(exam.ends_at).getTime() - Date.now()) / 1000
        )
      );

      setSecondsLeft(remaining);

      if (remaining <= 0) {
        window.clearInterval(timer);
        void submitExam();
      }
    }, 1000);

    return () => window.clearInterval(timer);
  }, [exam, submitExam, submitting]);

  const currentQuestion = exam?.questions[currentIndex];

  const currentOptions = useMemo(
    () => (currentQuestion ? getOptions(currentQuestion.options) : []),
    [currentQuestion]
  );

  const answeredCount = exam
    ? exam.questions.filter((question) =>
        Boolean(selectedAnswers[question.id])
      ).length
    : 0;

  const flaggedCount = exam
    ? exam.questions.filter((question) =>
        Boolean(flagged[question.id])
      ).length
    : 0;

  // Current subject information
  const currentSubjectName = currentQuestion
    ? getSubjectName(currentQuestion)
    : "Current subject";

  const currentSubjectQuestions = exam && currentQuestion
    ? exam.questions.filter(
        (question) => question.subject_id === currentQuestion.subject_id
      )
    : [];

  const currentSubjectPosition = exam && currentQuestion
    ? exam.questions
        .slice(0, currentIndex + 1)
        .filter(
          (question) =>
            question.subject_id === currentQuestion.subject_id
        ).length
    : 0;

  const currentSubjectAnswered = exam && currentQuestion
    ? currentSubjectQuestions.filter((question) =>
        Boolean(selectedAnswers[question.id])
      ).length
    : 0;

  const subjectProgress = currentSubjectQuestions.length
    ? Math.round(
        (currentSubjectAnswered / currentSubjectQuestions.length) * 100
      )
    : 0;

  const previousQuestion =
    exam && currentIndex > 0
      ? exam.questions[currentIndex - 1]
      : null;

  const isNewSubject =
    Boolean(currentQuestion) &&
    Boolean(previousQuestion) &&
    previousQuestion?.subject_id !== currentQuestion?.subject_id;

  const saveAnswer = useCallback(
    async (
      questionId: string,
      selectedOption: string | null,
      isFlagged: boolean
    ) => {
      setSaving(true);
      setError("");
      setNotice("");

      try {
        const response = await fetch(`/api/exam/${attemptId}/answer`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            question_id: questionId,
            selected_option: selectedOption,
            is_flagged: isFlagged,
          }),
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error ?? "Unable to save your answer.");
        }

        setNotice("All changes saved");
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Answer saving failed."
        );
      } finally {
        setSaving(false);
      }
    },
    [attemptId]
  );

  function chooseOption(option: string) {
    if (!currentQuestion || submitting) return;

    setSelectedAnswers((previous) => ({
      ...previous,
      [currentQuestion.id]: option,
    }));

    void saveAnswer(
      currentQuestion.id,
      option,
      Boolean(flagged[currentQuestion.id])
    );
  }

  function toggleFlag() {
    if (!currentQuestion || submitting) return;

    const nextFlagged = !flagged[currentQuestion.id];

    setFlagged((previous) => ({
      ...previous,
      [currentQuestion.id]: nextFlagged,
    }));

    void saveAnswer(
      currentQuestion.id,
      selectedAnswers[currentQuestion.id] ?? null,
      nextFlagged
    );
  }

  if (loading) {
    return (
      <main className="exam-loading">
        <div className="exam-spinner" />
        <h2>Preparing your examination</h2>
        <p>Loading your questions and saved answers...</p>
      </main>
    );
  }

  if (error && !exam) {
    return (
      <main className="exam-loading">
        <div className="exam-error-icon">!</div>
        <h2>Unable to open your exam</h2>
        <p>{error}</p>

        <button
          className="exam-primary-button"
          onClick={() => window.location.reload()}
        >
          Try again
        </button>
      </main>
    );
  }

  if (!exam || !currentQuestion) return null;

  const letters = ["A", "B", "C", "D", "E", "F"];

  const progressPercent =
    (answeredCount / Math.max(exam.total_questions, 1)) * 100;

  return (
    <main className="cbt-shell">
      <header className="cbt-topbar">
        <a href="/" className="cbt-brand">
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
          <span>
            JAMB<span className="cbt-brand-muted">READY</span>
          </span>
        </a>

        <div className="cbt-exam-label">
          <span className="cbt-live-dot" />
          Computer-Based Test
        </div>

        <div
          className={`cbt-timer ${
            secondsLeft <= 300 ? "cbt-timer-warning" : ""
          }`}
        >
          <span className="cbt-timer-icon">◷</span>

          <div>
            <small>TIME REMAINING</small>
            <strong>{formatTime(secondsLeft)}</strong>
          </div>
        </div>
      </header>

      <section className="cbt-summary">
        <div>
          <p className="cbt-eyebrow">YOUR EXAMINATION</p>
          <h1>Practice examination</h1>
          <p className="cbt-summary-copy">
            Read each question carefully and select the best answer.
          </p>
        </div>

        <div className="cbt-progress-card">
          <div className="cbt-progress-heading">
            <span>Exam progress</span>
            <strong>
              {answeredCount}/{exam.total_questions}
            </strong>
          </div>

          <div className="cbt-progress-track">
            <div
              className="cbt-progress-fill"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          <small>{Math.round(progressPercent)}% answered</small>
        </div>
      </section>

      {error && (
        <div className="cbt-alert cbt-alert-error" role="alert">
          {error}
        </div>
      )}

      <div className="cbt-workspace">
        <section className="cbt-question-panel">
          {/* CURRENT SUBJECT BANNER */}
          <div
            aria-live="polite"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: "16px",
              padding: "20px 24px",
              margin: "0 0 0",
              background: "#0b3d2e",
              color: "#ffffff",
              borderRadius: "12px 12px 0 0",
              borderBottom: "4px solid #a3e635",
            }}
          >
            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  fontSize: "11px",
                  fontWeight: 800,
                  letterSpacing: "2px",
                  textTransform: "uppercase",
                  color: "#bbf7d0",
                  marginBottom: "6px",
                }}
              >
                {isNewSubject ? "You have entered a new subject" : "Currently answering"}
              </div>

              <h2
                style={{
                  margin: 0,
                  fontSize: "clamp(22px, 3vw, 30px)",
                  fontWeight: 800,
                  lineHeight: 1.2,
                  overflowWrap: "anywhere",
                }}
              >
                {currentSubjectName}
              </h2>

              {currentQuestion.subject_code && (
                <div
                  style={{
                    marginTop: "6px",
                    fontSize: "12px",
                    color: "#d1fae5",
                  }}
                >
                  Subject code: {currentQuestion.subject_code}
                </div>
              )}
            </div>

            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "12px",
              }}
            >
              <div
                style={{
                  padding: "12px 16px",
                  minWidth: "125px",
                  borderRadius: "10px",
                  background: "rgba(255,255,255,0.1)",
                  border: "1px solid rgba(255,255,255,0.2)",
                }}
              >
                <div
                  style={{
                    fontSize: "10px",
                    letterSpacing: "1px",
                    color: "#bbf7d0",
                    fontWeight: 700,
                    marginBottom: "5px",
                  }}
                >
                  SUBJECT QUESTION
                </div>

                <strong style={{ fontSize: "20px" }}>
                  {currentSubjectPosition}
                  <span
                    style={{
                      fontSize: "14px",
                      fontWeight: 500,
                      color: "#d1fae5",
                    }}
                  >
                    {" "}
                    / {currentSubjectQuestions.length}
                  </span>
                </strong>
              </div>

              <div
                style={{
                  padding: "12px 16px",
                  minWidth: "125px",
                  borderRadius: "10px",
                  background: "rgba(255,255,255,0.1)",
                  border: "1px solid rgba(255,255,255,0.2)",
                }}
              >
                <div
                  style={{
                    fontSize: "10px",
                    letterSpacing: "1px",
                    color: "#bbf7d0",
                    fontWeight: 700,
                    marginBottom: "5px",
                  }}
                >
                  OVERALL QUESTION
                </div>

                <strong style={{ fontSize: "20px" }}>
                  {currentIndex + 1}
                  <span
                    style={{
                      fontSize: "14px",
                      fontWeight: 500,
                      color: "#d1fae5",
                    }}
                  >
                    {" "}
                    / {exam.total_questions}
                  </span>
                </strong>
              </div>
            </div>
          </div>

          {/* SUBJECT-SPECIFIC ANSWER PROGRESS */}
          <div
            style={{
              padding: "14px 24px",
              background: "#f0fdf4",
              borderBottom: "1px solid #dcfce7",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: "12px",
                flexWrap: "wrap",
                marginBottom: "8px",
                color: "#166534",
                fontSize: "13px",
              }}
            >
              <span>
                Your {currentSubjectName} progress
              </span>

              <strong>
                {currentSubjectAnswered} of {currentSubjectQuestions.length}{" "}
                answered ({subjectProgress}%)
              </strong>
            </div>

            <div
              style={{
                height: "7px",
                borderRadius: "99px",
                background: "#d1fae5",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  height: "100%",
                  width: `${subjectProgress}%`,
                  background: "#15803d",
                  borderRadius: "99px",
                  transition: "width 200ms ease",
                }}
              />
            </div>
          </div>

          <div className="cbt-question-toolbar">
            <div className="cbt-question-number">
              <span>QUESTION</span>

              <strong>
                {String(currentIndex + 1).padStart(2, "0")}
              </strong>

              <span className="cbt-question-total">
                OF {exam.total_questions}
              </span>
            </div>

            <button
              className={`cbt-flag-button ${
                flagged[currentQuestion.id] ? "is-flagged" : ""
              }`}
              onClick={toggleFlag}
              disabled={submitting}
              type="button"
            >
              <span>
                {flagged[currentQuestion.id] ? "⚑" : "⚐"}
              </span>

              {flagged[currentQuestion.id]
                ? "Flagged for review"
                : "Flag for review"}
            </button>
          </div>

          <div className="cbt-question-content">
            <div className="cbt-question-kicker">
              {currentSubjectName.toUpperCase()} · SELECT ONE ANSWER
            </div>

            <h2>{currentQuestion.question_text}</h2>

            <div className="cbt-options-list">
              {currentOptions.map((option, index) => (
                <button
                  key={option.key}
                  type="button"
                  className={`cbt-option ${
                    selectedAnswers[currentQuestion.id] === option.key
                      ? "is-selected"
                      : ""
                  }`}
                  onClick={() => chooseOption(option.key)}
                  disabled={submitting}
                >
                  <span className="cbt-option-letter">
                    {option.key || letters[index]}
                  </span>

                  <span className="cbt-option-text">
                    {option.text}
                  </span>

                  <span className="cbt-option-check">
                    {selectedAnswers[currentQuestion.id] === option.key
                      ? "✓"
                      : ""}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="cbt-question-footer">
            <button
              type="button"
              className="cbt-secondary-button"
              disabled={currentIndex === 0 || submitting}
              onClick={() =>
                setCurrentIndex((index) => index - 1)
              }
            >
              ← Previous
            </button>

            <span className="cbt-save-status">
              <span
                className={
                  saving
                    ? "cbt-save-dot is-saving"
                    : "cbt-save-dot"
                }
              />

              {saving
                ? "Saving..."
                : notice || "Answers save automatically"}
            </span>

            {currentIndex < exam.questions.length - 1 ? (
              <button
                type="button"
                className="cbt-primary-button"
                disabled={submitting}
                onClick={() =>
                  setCurrentIndex((index) => index + 1)
                }
              >
                Next question →
              </button>
            ) : (
              <button
                type="button"
                className="cbt-primary-button"
                disabled={submitting}
                onClick={() => setShowSubmitDialog(true)}
              >
                Finish exam →
              </button>
            )}
          </div>
        </section>

        <aside className="cbt-navigation-panel">
          <div className="cbt-navigation-heading">
            <div>
              <h2>Question navigator</h2>
              <p>Jump to any question</p>
            </div>

            <span className="cbt-nav-count">
              {currentIndex + 1}/{exam.total_questions}
            </span>
          </div>

          <div className="cbt-legend">
            <span>
              <i className="legend-answered" /> Answered
            </span>

            <span>
              <i className="legend-flagged" /> Flagged
            </span>

            <span>
              <i className="legend-current" /> Current
            </span>
          </div>

          <div className="cbt-question-grid">
            {exam.questions.map((question, index) => {
              const isAnswered = Boolean(
                selectedAnswers[question.id]
              );

              const isFlagged = Boolean(flagged[question.id]);
              const isCurrent = index === currentIndex;

              const subjectChanged =
                index === 0 ||
                exam.questions[index - 1]?.subject_id !==
                  question.subject_id;

              return (
                <button
                  key={question.id}
                  type="button"
                  title={`${getSubjectName(question)} — Question ${
                    exam.questions
                      .slice(0, index + 1)
                      .filter(
                        (item) =>
                          item.subject_id === question.subject_id
                      ).length
                  }`}
                  className={[
                    "cbt-grid-number",
                    isAnswered ? "is-answered" : "",
                    isFlagged ? "is-flagged" : "",
                    isCurrent ? "is-current" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  onClick={() => setCurrentIndex(index)}
                  aria-label={`${getSubjectName(question)}, overall question ${
                    index + 1
                  }${isAnswered ? ", answered" : ", unanswered"}${
                    isFlagged ? ", flagged" : ""
                  }`}
                  style={
                    subjectChanged && index > 0
                      ? { marginLeft: "5px" }
                      : undefined
                  }
                >
                  {index + 1}
                </button>
              );
            })}
          </div>

          <div className="cbt-sidebar-stats">
            <div>
              <span>Answered</span>
              <strong>{answeredCount}</strong>
            </div>

            <div>
              <span>Unanswered</span>
              <strong>{exam.total_questions - answeredCount}</strong>
            </div>

            <div>
              <span>Flagged</span>
              <strong>{flaggedCount}</strong>
            </div>
          </div>

          <button
            type="button"
            className="cbt-submit-button"
            disabled={submitting}
            onClick={() => setShowSubmitDialog(true)}
          >
            {submitting ? "Submitting..." : "Submit examination"}
            <span>→</span>
          </button>

          <p className="cbt-submit-hint">
            Review your answers before submitting. Submission is final.
          </p>
        </aside>
      </div>

      {showSubmitDialog && (
        <div className="cbt-modal-backdrop" role="presentation">
          <section
            className="cbt-confirm-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="cbt-confirm-title"
          >
            <div className="cbt-confirm-icon">?</div>

            <h2 id="cbt-confirm-title">
              Submit your examination?
            </h2>

            <p>
              You have answered <strong>{answeredCount}</strong> out of{" "}
              <strong>{exam.total_questions}</strong> questions.
            </p>

            {exam.total_questions - answeredCount > 0 && (
              <div className="cbt-unanswered-notice">
                {exam.total_questions - answeredCount} question(s)
                remain unanswered.
              </div>
            )}

            {flaggedCount > 0 && (
              <p className="cbt-dialog-muted">
                You also have {flaggedCount} question(s) flagged for
                review.
              </p>
            )}

            <div className="cbt-dialog-actions">
              <button
                type="button"
                className="cbt-secondary-button"
                onClick={() => setShowSubmitDialog(false)}
                disabled={submitting}
              >
                Continue exam
              </button>

              <button
                type="button"
                className="cbt-primary-button"
                onClick={() => void submitExam()}
                disabled={submitting}
              >
                {submitting ? "Submitting..." : "Yes, submit exam"}
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}