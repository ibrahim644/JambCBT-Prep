
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

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ attemptId: string }> }
) {
  try {
    const token = request.cookies.get("candidate_session")?.value;

    if (!token) {
      return NextResponse.json(
        { error: "Your candidate session is missing." },
        { status: 401 }
      );
    }

    const { attemptId } = await context.params;

    const { data: candidate, error: candidateError } = await supabase
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
        { error: "Your permanent candidate profile could not be verified." },
        { status: 409 }
      );
    }

    if (
      candidate.access_type !== "free" &&
      candidate.payment_status !== "paid"
    ) {
      return NextResponse.json(
        { error: "Payment is required to submit the full JAMB exam." },
        { status: 402 }
      );
    }

    const { data: attempt, error: attemptError } = await supabase
      .from("exam_attempts")
      .select(
        "id, candidate_id, candidate_session_id, question_ids, ends_at, status"
      )
      .eq("id", attemptId)
      .eq("candidate_session_id", candidate.id)
      .eq("candidate_id", candidate.candidate_id)
      .maybeSingle();

    if (attemptError || !attempt) {
      return NextResponse.json(
        { error: "Exam attempt not found for this candidate." },
        { status: 404 }
      );
    }

    if (attempt.status === "submitted") {
      return NextResponse.json({
        ok: true,
        already_submitted: true,
        result_url: `/exam/${attempt.id}/result`,
      });
    }

    if (attempt.status !== "in_progress") {
      return NextResponse.json(
        { error: "This exam attempt is no longer active." },
        { status: 409 }
      );
    }

    const questionIds = attempt.question_ids as string[];

    if (!Array.isArray(questionIds) || questionIds.length === 0) {
      return NextResponse.json(
        { error: "This exam has no assigned questions." },
        { status: 500 }
      );
    }

    const { data: questions, error: questionsError } = await supabase
      .from("questions")
      .select("id, correct_option")
      .in("id", questionIds);

    if (
      questionsError ||
      !questions ||
      questions.length !== questionIds.length
    ) {
      console.error("Result question lookup failed:", questionsError);

      return NextResponse.json(
        { error: "Unable to calculate your result. Please try again." },
        { status: 500 }
      );
    }

    const { data: answers, error: answersError } = await supabase
      .from("exam_answers")
      .select("question_id, selected_option")
      .eq("attempt_id", attempt.id);

    if (answersError) {
      console.error("Result answer lookup failed:", answersError);

      return NextResponse.json(
        { error: "Unable to retrieve your saved answers." },
        { status: 500 }
      );
    }

    const answerMap = new Map(
      (answers ?? []).map((answer) => [
        answer.question_id,
        normalizeOption(answer.selected_option),
      ])
    );

    const questionMap = new Map(
      questions.map((question) => [
        question.id,
        normalizeOption(question.correct_option),
      ])
    );

    let score = 0;

    for (const questionId of questionIds) {
      const selected = answerMap.get(questionId) ?? "";
      const correct = questionMap.get(questionId) ?? "";

      if (selected && correct && selected === correct) {
        score++;
      }
    }

    // Only one concurrent submission can change this attempt
    // from in_progress to submitted.
    const { data: updatedAttempt, error: updateError } = await supabase
      .from("exam_attempts")
      .update({
        status: "submitted",
        submitted_at: new Date().toISOString(),
        score,
        total_questions: questionIds.length,
      })
      .eq("id", attempt.id)
      .eq("candidate_session_id", candidate.id)
      .eq("candidate_id", candidate.candidate_id)
      .eq("status", "in_progress")
      .select("id")
      .maybeSingle();

    if (updateError) {
      console.error("Submit exam error:", updateError);

      return NextResponse.json(
        { error: "Unable to submit your exam. Please try again." },
        { status: 500 }
      );
    }

    if (!updatedAttempt) {
      // Another request may have completed submission first.
      const { data: latestAttempt } = await supabase
        .from("exam_attempts")
        .select("id, status")
        .eq("id", attempt.id)
        .eq("candidate_id", candidate.candidate_id)
        .maybeSingle();

      if (latestAttempt?.status === "submitted") {
        return NextResponse.json({
          ok: true,
          already_submitted: true,
          result_url: `/exam/${attempt.id}/result`,
        });
      }

      return NextResponse.json(
        { error: "This exam attempt could not be finalized. Please try again." },
        { status: 409 }
      );
    }

    // Return the registration to ready status so the candidate can
    // use any remaining attempts. The attempt itself stays submitted.
    const { error: candidateUpdateError } = await supabase
      .from("candidate_sessions")
      .update({ session_status: "ready" })
      .eq("id", candidate.id)
      .eq("candidate_id", candidate.candidate_id)
      .eq("session_status", "in_progress");

    if (candidateUpdateError) {
      console.error(
        "Candidate session status update error:",
        candidateUpdateError
      );
    }

    return NextResponse.json({
      ok: true,
      score,
      total_questions: questionIds.length,
      percentage: Math.round((score / questionIds.length) * 100),
      result_url: `/exam/${attempt.id}/result`,
    });
  } catch (error) {
    console.error("Exam submission API error:", error);

    return NextResponse.json(
      { error: "An unexpected error occurred during submission." },
      { status: 500 }
    );
  }
}
