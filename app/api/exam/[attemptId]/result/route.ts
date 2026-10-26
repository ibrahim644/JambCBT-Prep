
import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export const runtime = "nodejs";

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function normalizeOption(value: unknown): string {
  return typeof value === "string" ? value.trim().toUpperCase() : "";
}

function formatOptions(
  options: unknown
): { key: string; text: string }[] {
  if (Array.isArray(options)) {
    return options.map((item, index) => {
      const defaultKey = String.fromCharCode(65 + index);

      if (typeof item === "string") {
        return { key: defaultKey, text: item };
      }

      if (item && typeof item === "object") {
        const option = item as Record<string, unknown>;

        return {
          key:
            normalizeOption(
              option.key ?? option.value ?? option.label
            ) || defaultKey,
          text: String(
            option.text ?? option.label ?? option.value ?? ""
          ),
        };
      }

      return {
        key: defaultKey,
        text: String(item ?? ""),
      };
    });
  }

  if (options && typeof options === "object") {
    return Object.entries(
      options as Record<string, unknown>
    ).map(([key, value]) => ({
      key: normalizeOption(key),
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

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ attemptId: string }> }
) {
  try {
    const token =
      request.cookies.get("candidate_session")?.value;

    if (!token) {
      return NextResponse.json(
        { error: "Your candidate session is missing." },
        { status: 401 }
      );
    }

    const { attemptId } = await context.params;

    // Verify the active candidate session and permanent profile.
    const { data: candidate, error: candidateError } =
      await supabase
        .from("candidate_sessions")
        .select(
          "id, candidate_id, access_type, payment_status, expires_at"
        )
        .eq("session_token", hashToken(token))
        .gt("expires_at", new Date().toISOString())
        .maybeSingle();

    if (candidateError || !candidate) {
      return NextResponse.json(
        { error: "Your candidate session has expired." },
        { status: 401 }
      );
    }

    if (!candidate.candidate_id) {
      return NextResponse.json(
        {
          error:
            "Your permanent candidate profile could not be verified.",
        },
        { status: 409 }
      );
    }

    if (
      candidate.access_type !== "free" &&
      candidate.payment_status !== "paid"
    ) {
      return NextResponse.json(
        {
          error:
            "Payment is required to access full JAMB results.",
        },
        { status: 402 }
      );
    }

    // The attempt must belong to BOTH this session and this profile.
    const { data: attempt, error: attemptError } =
      await supabase
        .from("exam_attempts")
        .select(
          "id, candidate_id, candidate_session_id, question_ids, status, score, total_questions, started_at, submitted_at, attempt_number, access_type"
        )
        .eq("id", attemptId)
        .eq("candidate_session_id", candidate.id)
        .eq("candidate_id", candidate.candidate_id)
        .maybeSingle();

    if (attemptError || !attempt) {
      return NextResponse.json(
        { error: "Exam result not found for this candidate." },
        { status: 404 }
      );
    }

    if (attempt.status !== "submitted") {
      return NextResponse.json(
        {
          error:
            "Submit your examination before viewing the answers.",
        },
        { status: 403 }
      );
    }

    if (attempt.score === null || attempt.score === undefined) {
      return NextResponse.json(
        {
          error:
            "This attempt has no saved score. Please contact support.",
        },
        { status: 409 }
      );
    }

    const questionIds = attempt.question_ids as string[];

    if (
      !Array.isArray(questionIds) ||
      questionIds.length === 0 ||
      new Set(questionIds).size !== questionIds.length
    ) {
      return NextResponse.json(
        { error: "The question list for this attempt is invalid." },
        { status: 500 }
      );
    }

    const { data: questions, error: questionsError } =
      await supabase
        .from("questions")
        .select(
          "id, subject_id, question_text, options, correct_option, explanation"
        )
        .in("id", questionIds);

    if (
      questionsError ||
      !questions ||
      questions.length !== questionIds.length
    ) {
      console.error(
        "Result question lookup failed:",
        questionsError
      );

      return NextResponse.json(
        {
          error:
            "Unable to load all questions for your result.",
        },
        { status: 500 }
      );
    }

    const { data: answers, error: answersError } =
      await supabase
        .from("exam_answers")
        .select("question_id, selected_option, is_flagged")
        .eq("attempt_id", attempt.id);

    if (answersError) {
      console.error(
        "Result answer lookup failed:",
        answersError
      );

      return NextResponse.json(
        { error: "Unable to load your submitted answers." },
        { status: 500 }
      );
    }

    const questionMap = new Map(
      questions.map((question) => [question.id, question])
    );

    const answerMap = new Map(
      (answers ?? []).map((answer) => [
        answer.question_id,
        answer,
      ])
    );

    // Keep the original exam question order.
    const review = questionIds.map((id, index) => {
      const question = questionMap.get(id)!;
      const answer = answerMap.get(id);

      const selectedOption = normalizeOption(
        answer?.selected_option
      );

      const correctOption = normalizeOption(
        question.correct_option
      );

      const correct = Boolean(
        selectedOption &&
          correctOption &&
          selectedOption === correctOption
      );

      return {
        number: index + 1,
        id: question.id,
        subject_id: question.subject_id,
        question_text: question.question_text,
        options: formatOptions(question.options),
        selected_option: selectedOption || null,
        correct_option: correctOption,
        is_correct: correct,
        is_flagged: Boolean(answer?.is_flagged),
        explanation: question.explanation ?? "",
      };
    });

    // The persisted submission score is authoritative.
    const score = Number(attempt.score);
    const total = questionIds.length;

    if (
      !Number.isFinite(score) ||
      score < 0 ||
      score > total
    ) {
      return NextResponse.json(
        { error: "The saved score is invalid." },
        { status: 500 }
      );
    }

    // Detect inconsistencies without silently rewriting past results.
    const reviewScore = review.filter(
      (question) => question.is_correct
    ).length;

    if (reviewScore !== score) {
      console.error("Saved score and answer review differ:", {
        attemptId: attempt.id,
        savedScore: score,
        reviewScore,
      });
    }

    return NextResponse.json({
      ok: true,
      attempt_id: attempt.id,
      attempt_number: attempt.attempt_number,
      access_type: attempt.access_type,
      score,
      total_questions: total,
      percentage: Math.round((score / total) * 100),
      started_at: attempt.started_at,
      submitted_at: attempt.submitted_at,
      questions: review,
    });
  } catch (error) {
    console.error("Exam result API error:", error);

    return NextResponse.json(
      {
        error:
          "An unexpected error occurred while loading your result.",
      },
      { status: 500 }
    );
  }
}
