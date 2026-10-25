"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type Question = {
  id: string;
  subject_id: string;
  question_text: string;
  options: unknown;
};

type SavedAnswer = {
  question_id: string;
  selected_option: string | null;
  is_flagged: boolean;
};

type ExamQuestion = Question & {
  selected_option: string | null;
  is_flagged: boolean;
};

function getOptions(options: unknown): { key: string; text: string }[] {
  if (Array.isArray(options)) {
    return options.map((item, index) => {
      const key = String.fromCharCode(65 + index);

      if (typeof item === "string") {
        return { key, text: item };
      }

      if (item && typeof item === "object") {
        const value = item as Record<string, unknown>;
        return {
          key: String(value.key ?? value.value ?? value.label ?? key).toUpperCase(),
          text: String(value.text ?? value.label ?? value.value ?? ""),
        };
      }

      return { key, text: String(item ?? "") };
    });
  }

  if (options && typeof options === "object") {
    return Object.entries(options as Record<string, unknown>).map(([key, value]) => ({
      key: key.toUpperCase(),
      text:
        value && typeof value === "object"
          ? String(
              (value as Record<string, unknown>).text ??
                (value as Record<string, unknown>).label ??
                ""
            )
          : String(value ?? ""),
    }));
  }

  return [];
}

function formatTime(seconds: number) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  return [hours, minutes, secs]
    .map((value) => String(value).padStart(2, "0"))
    .join(":");
}

export default function ExamClient({ attemptId }: { attemptId: string }) {
  const [questions, setQuestions] = useState<ExamQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [endsAt, setEndsAt] = useState<string | null>(null);
  const [remaining, setRemaining] = useState(7200);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showSubmit, setShowSubmit] = useState(false);
  const [filter, setFilter] = useState<"all" | "unanswered" | "flagged">("all");

  useEffect(() => {
    let cancelled = false;

    async function loadExam() {
      try {
        const response = await fetch(`/api/exam/${attemptId}`, {
          cache: "no-store",
        });
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Unable to load your exam.");
        }

        if (cancelled) return;

        const saved = new Map<string, SavedAnswer>(
          (data.answers as SavedAnswer[]).map((answer) => [
            answer.question_id,
            answer,
          ])
        );

        setQuestions(
          (data.questions as Question[]).map((question) => {
            const answer = saved.get(question.id);

            return {
              ...question,
              selected_option: answer?.selected_option ?? null,
              is_flagged: answer?.is_flagged ?? false,
            };
          })
        );

        setEndsAt(data.ends_at);
        setRemaining(
          Math.max(
            0,
            Math.floor((new Date(data.ends_at).getTime() - Date.now()) / 1000)
          )
        );
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Unable to load your exam."
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadExam();

    return () => {
      cancelled = true;
    };
  }, [attemptId]);

  const submitExam = useCallback(
    async (automatic = false) => {
      if (submitting) return;

      if (!automatic && !window.confirm("Are you sure you want to submit your exam?")) {
        return;
      }

      setSubmitting(true);
      setError("");

      try {
        const response = await fetch(`/api/exam/${attemptId}/submit`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ automatic }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Unable to submit your exam.");
        }

        window.location.assign(`/exam/${attemptId}/result`);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Submission failed. Please try again."
        );
        setSubmitting(false);
      }
    },
    [attemptId, submitting]
  );

  useEffect(() => {
    if (!endsAt || loading || error) return;

    const updateTimer = () => {
      const seconds = Math.max(
        0,
        Math.floor((new Date(endsAt).getTime() - Date.now()) / 1000)
      );

      setRemaining(seconds);

      if (seconds <= 0) {
        void submitExam(true);
      }
    };

    updateTimer();
    const timer = window.setInterval(updateTimer, 1000);

    return () => window.clearInterval(timer);
  }, [endsAt, loading, error, submitExam]);

  const currentQuestion = questions[currentIndex];

  const counts = useMemo(
    () => ({
      answered: questions.filter((question) => question.selected_option !== null).length,
      unanswered: questions.filter((question) => question.selected_option === null).length,
      flagged: questions.filter((question) => question.is_flagged).length,
    }),
    [questions]
  );

  const visibleIndexes = useMemo(
    () =>
      questions
        .map((question, index) => ({ question, index }))
        .filter(({ question }) => {
          if (filter === "unanswered") return question.selected_option === null;
          if (filter === "flagged") return question.is_flagged;
          return true;
        })
        .map(({ index }) => index),
    [questions, filter]
  );

  async function saveAnswer(
    question: ExamQuestion,
    selectedOption: string | null,
    isFlagged: boolean
  ) {
    setError("");
    setSaving(true);

    setQuestions((previous) =>
      previous.map((item) =>
        item.id === question.id
          ? {
              ...item,
              selected_option: selectedOption,
              is_flagged: isFlagged,
            }
          : item
      )
    );

    try {
      const response = await fetch(`/api/exam/${attemptId}/answer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question_id: question.id,
          selected_option: selectedOption,
          is_flagged: isFlagged,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Could not save your answer.");
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? `${err.message} Your latest change may not have been saved.`
          : "Your answer could not be saved."
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent" />
          <p className="font-medium text-slate-700">Preparing your examination...</p>
        </div>
      </main>
    );
  }

  if (error && questions.length === 0) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
        <div className="w-full max-w-lg rounded-2xl border border-red-100 bg-white p-8 text-center shadow-sm">
          <h1 className="text-xl font-bold text-slate-900">Unable to open exam</h1>
          <p className="mt-3 text-sm text-red-600">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-6 rounded-xl bg-emerald-700 px-5 py-3 font-semibold text-white hover:bg-emerald-800"
          >
            Try again
          </button>
        </div>
      </main>
    );
  }

  if (!currentQuestion) return null;

  const options = getOptions(currentQuestion.options);

  return (
    <main className="min-h-screen bg-slate-100 text-slate-900">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white shadow-sm">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-700">
              JAMB CBT PRACTICE
            </p>
            <h1 className="mt-1 text-lg font-bold sm:text-xl">Examination Hall</h1>
          </div>

          <div className="flex items-center gap-3 sm:gap-5">
            <div className="hidden text-right sm:block">
              <p className="text-xs text-slate-500">Progress</p>
              <p className="font-bold">
                {counts.answered}/{questions.length} answered
              </p>
            </div>

            <div
              className={`rounded-xl border px-4 py-2 text-center ${
                remaining <= 300
                  ? "border-red-200 bg-red-50 text-red-700"
                  : "border-emerald-100 bg-emerald-50 text-emerald-800"
              }`}
            >
              <p className="text-[10px] font-bold uppercase tracking-wider">Time left</p>
              <p className="font-mono text-lg font-bold tabular-nums sm:text-xl">
                {formatTime(remaining)}
              </p>
            </div>

            <button
              onClick={() => setShowSubmit(true)}
              disabled={submitting}
              className="rounded-xl bg-emerald-700 px-4 py-3 text-sm font-bold text-white hover:bg-emerald-800 disabled:opacity-50"
            >
              Submit
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-5 px-4 py-6 sm:px-6 lg:grid-cols-[minmax(0,1fr)_310px]">
        <section className="min-w-0">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-slate-500">
                Question {currentIndex + 1} of {questions.length}
              </p>
              <h2 className="mt-1 text-lg font-bold sm:text-xl">
                Question {String(currentIndex + 1).padStart(3, "0")}
              </h2>
            </div>

            <button
              onClick={() =>
                void saveAnswer(
                  currentQuestion,
                  currentQuestion.selected_option,
                  !currentQuestion.is_flagged
                )
              }
              className={`rounded-xl border px-4 py-2.5 text-sm font-semibold ${
                currentQuestion.is_flagged
                  ? "border-amber-300 bg-amber-50 text-amber-800"
                  : "border-slate-200 bg-white text-slate-600 hover:border-amber-300"
              }`}
            >
              {currentQuestion.is_flagged ? "★ Flagged for review" : "☆ Flag for review"}
            </button>
          </div>

          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
            <div className="mb-6 flex items-center gap-2">
              <span className="rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-800">
                QUESTION {currentIndex + 1}
              </span>
              {currentQuestion.is_flagged && (
                <span className="rounded-lg bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-800">
                  MARKED FOR REVIEW
                </span>
              )}
            </div>

            <div className="whitespace-pre-wrap text-base font-medium leading-8 text-slate-800 sm:text-lg">
              {currentQuestion.question_text}
            </div>

            <div className="mt-8 space-y-3">
              {options.map((option) => {
                const selected = currentQuestion.selected_option === option.key;

                return (
                  <button
                    key={option.key}
                    onClick={() =>
                      void saveAnswer(
                        currentQuestion,
                        option.key,
                        currentQuestion.is_flagged
                      )
                    }
                    className={`flex w-full items-start gap-4 rounded-xl border-2 p-4 text-left transition ${
                      selected
                        ? "border-emerald-600 bg-emerald-50"
                        : "border-slate-200 bg-white hover:border-emerald-300 hover:bg-slate-50"
                    }`}
                  >
                    <span
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sm font-bold ${
                        selected
                          ? "bg-emerald-700 text-white"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {option.key}
                    </span>
                    <span className="whitespace-pre-wrap pt-1 text-sm leading-6 sm:text-base">
                      {option.text}
                    </span>
                    {selected && (
                      <span className="ml-auto pt-1 font-bold text-emerald-700">✓</span>
                    )}
                  </button>
                );
              })}
            </div>

            {options.length === 0 && (
              <p className="mt-5 rounded-xl bg-amber-50 p-4 text-sm text-amber-800">
                This question has no readable answer options. Please contact the administrator.
              </p>
            )}

            {error && (
              <p role="alert" className="mt-5 rounded-xl bg-red-50 p-3 text-sm text-red-700">
                {error}
              </p>
            )}

            <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-6">
              <button
                onClick={() => setCurrentIndex((index) => Math.max(0, index - 1))}
                disabled={currentIndex === 0}
                className="rounded-xl border border-slate-200 px-5 py-3 font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                ← Previous
              </button>

              <span className="text-xs text-slate-500">
                {saving ? "Saving answer..." : "Answer progress is saved"}
              </span>

              <button
                onClick={() =>
                  setCurrentIndex((index) => Math.min(questions.length - 1, index + 1))
                }
                disabled={currentIndex === questions.length - 1}
                className="rounded-xl bg-emerald-700 px-5 py-3 font-semibold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Next →
              </button>
            </div>
          </article>
        </section>

        <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:sticky lg:top-28">
          <h2 className="text-lg font-bold">Question navigator</h2>
          <p className="mt-1 text-sm text-slate-500">
            Select any number to move to that question.
          </p>

          <div className="mt-5 grid grid-cols-3 gap-2">
            <div className="rounded-xl bg-emerald-50 p-3 text-center">
              <p className="text-xl font-bold text-emerald-700">{counts.answered}</p>
              <p className="text-[10px] font-semibold text-emerald-800">Answered</p>
            </div>
            <div className="rounded-xl bg-slate-100 p-3 text-center">
              <p className="text-xl font-bold text-slate-700">{counts.unanswered}</p>
              <p className="text-[10px] font-semibold text-slate-600">Unanswered</p>
            </div>
            <div className="rounded-xl bg-amber-50 p-3 text-center">
              <p className="text-xl font-bold text-amber-700">{counts.flagged}</p>
              <p className="text-[10px] font-semibold text-amber-800">Flagged</p>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            {([
              ["all", "All"],
              ["unanswered", "Unanswered"],
              ["flagged", "Flagged"],
            ] as const).map(([value, label]) => (
              <button
                key={value}
                onClick={() => setFilter(value)}
                className={`rounded-lg px-3 py-2 text-xs font-semibold ${
                  filter === value
                    ? "bg-slate-900 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="mt-4 grid max-h-[380px] grid-cols-5 gap-2 overflow-y-auto pr-1 sm:grid-cols-7 lg:grid-cols-5">
            {visibleIndexes.map((index) => {
              const question = questions[index];
              const active = currentIndex === index;

              return (
                <button
                  key={question.id}
                  onClick={() => setCurrentIndex(index)}
                  aria-label={`Go to question ${index + 1}`}
                  className={`relative flex aspect-square items-center justify-center rounded-lg border text-sm font-bold ${
                    active
                      ? "border-emerald-700 bg-emerald-700 text-white ring-2 ring-emerald-200"
                      : question.is_flagged
                        ? "border-amber-300 bg-amber-50 text-amber-800"
                        : question.selected_option
                          ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                          : "border-slate-200 bg-white text-slate-600 hover:border-slate-400"
                  }`}
                >
                  {index + 1}
                  {question.is_flagged && !active && (
                    <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-amber-500" />
                  )}
                </button>
              );
            })}
          </div>

          <div className="mt-5 space-y-2 border-t border-slate-100 pt-4 text-xs text-slate-500">
            <p>● Green: answered</p>
            <p>● Amber: flagged for review</p>
            <p>● White: not answered</p>
          </div>

          <button
            onClick={() => setShowSubmit(true)}
            disabled={submitting}
            className="mt-6 w-full rounded-xl bg-emerald-700 px-4 py-3.5 font-bold text-white hover:bg-emerald-800 disabled:opacity-50"
          >
            Finish examination
          </button>
        </aside>
      </div>

      {showSubmit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="submit-title"
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl sm:p-8"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-xl text-emerald-700">
              ✓
            </div>
            <h2 id="submit-title" className="mt-5 text-xl font-bold">
              Submit your examination?
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              You have answered {counts.answered} of {questions.length} questions.
              {" "}{counts.unanswered} remain unanswered and {counts.flagged} are flagged.
              Once submitted, you cannot change your answers.
            </p>

            {error && (
              <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>
            )}

            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setShowSubmit(false)}
                disabled={submitting}
                className="flex-1 rounded-xl border border-slate-200 px-4 py-3 font-semibold text-slate-700"
              >
                Continue exam
              </button>
              <button
                onClick={() => void submitExam(false)}
                disabled={submitting}
                className="flex-1 rounded-xl bg-emerald-700 px-4 py-3 font-semibold text-white disabled:opacity-50"
              >
                {submitting ? "Submitting..." : "Submit now"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
