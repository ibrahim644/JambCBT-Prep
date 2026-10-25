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
      .select("id, payment_status, expires_at")
      .eq("session_token", hashToken(token))
      .gt("expires_at", new Date().toISOString())
      .maybeSingle();

    if (candidateError || !candidate) {
      return NextResponse.json(
        { error: "Your candidate session has expired." },
        { status: 401 }
      );
    }

    if (candidate.payment_status !== "paid") {
      return NextResponse.json(
        { error: "Payment has not been confirmed." },
        { status: 403 }
      );
    }

    const { data: attempt, error: attemptError } = await supabase
      .from("exam_attempts")
      .select("id, candidate_session_id, question_ids, ends_at, status")
      .eq("id", attemptId)
      .eq("candidate_session_id", candidate.id)
      .maybeSingle();

    if (attemptError || !attempt) {
      return NextResponse.json(
        { error: "Exam attempt not found." },
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

    if (!questionIds?.length) {
      return NextResponse.json(
        { error: "This exam has no assigned questions." },
        { status: 500 }
      );
    }

    const { data: questions, error: questionsError } = await supabase
      .from("questions")
      .select("id, correct_option")
      .in("id", questionIds);

    if (questionsError || !questions || questions.length !== questionIds.length) {
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

    const now = new Date().toISOString();

    const { data: updatedAttempt, error: updateError } = await supabase
      .from("exam_attempts")
      .update({
        status: "submitted",
        submitted_at: now,
        score,
        total_questions: questionIds.length,
      })
      .eq("id", attempt.id)
      .eq("candidate_session_id", candidate.id)
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
      return NextResponse.json(
        { error: "This exam has already been submitted." },
        { status: 409 }
      );
    }

    const { error: candidateUpdateError } = await supabase
      .from("candidate_sessions")
      .update({ session_status: "completed" })
      .eq("id", candidate.id)
      .eq("session_status", "in_progress");

    if (candidateUpdateError) {
      console.error("Candidate completion update error:", candidateUpdateError);
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
