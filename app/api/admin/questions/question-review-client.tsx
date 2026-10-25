
"use client";

import { useState } from "react";

export type ReviewQuestion = {
  id: string;
  question_text: string;
  options: { A: string; B: string; C: string; D: string };
  correct_option: "A" | "B" | "C" | "D" | null;
  explanation: string | null;
  source_file: string | null;
  needs_review: boolean;
  review_note: string | null;
  is_published: boolean;
};

type Props = {
  initialQuestions: ReviewQuestion[];
};

export default function QuestionReviewClient({
  initialQuestions,
}: Props) {
  const [questions, setQuestions] = useState(initialQuestions);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  function updateQuestion(
    id: string,
    changes: Partial<ReviewQuestion>
  ) {
    setQuestions((current) =>
      current.map((question) =>
        question.id === id ? { ...question, ...changes } : question
      )
    );
  }

  function updateOption(
    question: ReviewQuestion,
    letter: "A" | "B" | "C" | "D",
    value: string
  ) {
    updateQuestion(question.id, {
      options: { ...question.options, [letter]: value },
    });
  }

  async function submitQuestion(
    question: ReviewQuestion,
    action: "save" | "publish"
  ) {
    setBusyId(question.id);
    setErrors((current) => ({ ...current, [question.id]: "" }));
    setMessages((current) => ({ ...current, [question.id]: "" }));

    try {
      const response = await fetch(`/api/admin/questions/${question.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          question_text: question.question_text,
          options: question.options,
          correct_option: question.correct_option,
          explanation: question.explanation,
          review_note: question.review_note,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Could not save this question.");
      }

      if (action === "publish") {
        setQuestions((current) =>
          current.filter((item) => item.id !== question.id)
        );
        setMessages((current) => ({
          ...current,
          [question.id]: "Published successfully.",
        }));
      } else {
        updateQuestion(question.id, result.question);
        setMessages((current) => ({
          ...current,
          [question.id]: "Draft saved. This question remains unpublished.",
        }));
      }
    } catch (error) {
      setErrors((current) => ({
        ...current,
        [question.id]:
          error instanceof Error ? error.message : "An unexpected error occurred.",
      }));
    } finally {
      setBusyId(null);
    }
  }

  if (questions.length === 0) {
    return (
      <div className="rounded-2xl border border-[#E1E9E2] bg-white px-6 py-16 text-center shadow-sm">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#EAF5EC] text-2xl">
          ✓
        </div>
        <h2 className="mt-4 text-xl font-bold">No unpublished questions in this batch</h2>
        <p className="mt-2 text-sm text-[#718076]">
          There may be more questions to review. Reload the page to check again.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="mt-5 rounded-xl bg-[#174B33] px-5 py-3 text-sm font-semibold text-white hover:bg-[#103D29]"
        >
          Refresh questions
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {questions.map((question, index) => (
        <article
          key={question.id}
          className="overflow-hidden rounded-2xl border border-[#E2E9E3] bg-white shadow-sm"
        >
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#EDF1ED] bg-[#FAFCFA] px-5 py-4 sm:px-6">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-[#728176]">
                Question {index + 1}
              </span>
              <p className="mt-1 max-w-xl truncate text-xs text-[#8A968D]" title={question.source_file ?? ""}>
                Source: {question.source_file || "Unknown PDF"}
              </p>
            </div>
            <span
              className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                question.needs_review
                  ? "bg-amber-100 text-amber-800"
                  : "bg-[#EAF5EC] text-[#286344]"
              }`}
            >
              {question.needs_review ? "Needs review" : "Unpublished"}
            </span>
          </div>

          <div className="space-y-5 p-5 sm:p-6">
            <div>
              <label className="mb-2 block text-sm font-semibold">
                Question text
              </label>
              <textarea
                value={question.question_text}
                onChange={(event) =>
                  updateQuestion(question.id, {
                    question_text: event.target.value,
                  })
                }
                rows={4}
                className="w-full rounded-xl border border-[#DCE5DD] bg-white p-3 text-sm leading-6 outline-none focus:border-[#398052] focus:ring-2 focus:ring-[#398052]/15"
              />
            </div>

            <div>
              <label className="mb-3 block text-sm font-semibold">
                Answer options
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                {(["A", "B", "C", "D"] as const).map((letter) => (
                  <div key={letter}>
                    <label className="mb-1.5 block text-xs font-semibold text-[#637469]">
                      Option {letter}
                    </label>
                    <textarea
                      value={question.options?.[letter] ?? ""}
                      onChange={(event) =>
                        updateOption(question, letter, event.target.value)
                      }
                      rows={2}
                      className="w-full rounded-xl border border-[#DCE5DD] p-3 text-sm outline-none focus:border-[#398052] focus:ring-2 focus:ring-[#398052]/15"
                    />
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold">
                Correct answer
              </label>
              <div className="flex flex-wrap gap-2">
                {(["A", "B", "C", "D"] as const).map((letter) => (
                  <button
                    key={letter}
                    type="button"
                    onClick={() =>
                      updateQuestion(question.id, { correct_option: letter })
                    }
                    className={`flex h-11 w-12 items-center justify-center rounded-xl border text-sm font-bold ${
                      question.correct_option === letter
                        ? "border-[#174B33] bg-[#174B33] text-white"
                        : "border-[#DCE5DD] bg-white text-[#43584A] hover:bg-[#F2F8F3]"
                    }`}
                    aria-pressed={question.correct_option === letter}
                  >
                    {letter}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold">
                Explanation (optional)
              </label>
              <textarea
                value={question.explanation ?? ""}
                onChange={(event) =>
                  updateQuestion(question.id, {
                    explanation: event.target.value,
                  })
                }
                rows={3}
                placeholder="Explain why the selected answer is correct..."
                className="w-full rounded-xl border border-[#DCE5DD] p-3 text-sm leading-6 outline-none focus:border-[#398052] focus:ring-2 focus:ring-[#398052]/15"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold">
                Review note
              </label>
              <textarea
                value={question.review_note ?? ""}
                onChange={(event) =>
                  updateQuestion(question.id, {
                    review_note: event.target.value,
                  })
                }
                rows={2}
                placeholder="Record any issue or verification note..."
                className="w-full rounded-xl border border-[#DCE5DD] p-3 text-sm outline-none focus:border-[#398052] focus:ring-2 focus:ring-[#398052]/15"
              />
            </div>

            {errors[question.id] && (
              <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
                {errors[question.id]}
              </p>
            )}

            {messages[question.id] && (
              <p role="status" className="rounded-lg bg-[#EAF5EC] p-3 text-sm text-[#286344]">
                {messages[question.id]}
              </p>
            )}

            <div className="flex flex-wrap justify-end gap-3 border-t border-[#EDF1ED] pt-5">
              <button
                type="button"
                disabled={busyId !== null}
                onClick={() => submitQuestion(question, "save")}
                className="rounded-xl border border-[#D5E0D6] px-4 py-3 text-sm font-semibold text-[#355641] hover:bg-[#F5F8F5] disabled:opacity-50"
              >
                {busyId === question.id ? "Saving..." : "Save draft"}
              </button>

              <button
                type="button"
                disabled={busyId !== null}
                onClick={() => {
                  if (
                    window.confirm(
                      "Have you checked this question against the original source and verified the correct answer? It will become available for publication."
                    )
                  ) {
                    void submitQuestion(question, "publish");
                  }
                }}
                className="rounded-xl bg-[#174B33] px-5 py-3 text-sm font-semibold text-white hover:bg-[#103D29] disabled:opacity-50"
              >
                Approve & publish
              </button>
            </div>
          </div>
        </article>
      ))}

      <p className="text-center text-xs leading-5 text-[#7A8980]">
        Showing up to 25 unpublished questions. Published questions are removed
        from this review queue.
      </p>
    </div>
  );
}
