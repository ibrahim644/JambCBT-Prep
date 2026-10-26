import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export const runtime = "nodejs";

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function getOptionKeys(options: unknown): string[] {
  if (Array.isArray(options)) {
    return options.map((option, index) => {
      if (option && typeof option === "object") {
        const item = option as Record<string, unknown>;
        const key = item.key ?? item.value ?? item.label;
        if (typeof key === "string" && /^[A-D]$/i.test(key)) {
          return key.toUpperCase();
        }
      }

      return String.fromCharCode(65 + index);
    });
  }

  if (options && typeof options === "object") {
    return Object.keys(options as Record<string, unknown>).map((key) =>
      key.toUpperCase()
    );
  }

  return [];
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
    const body = await request.json();

    const questionId =
      typeof body.question_id === "string" ? body.question_id : "";

    const selectedOption =
      body.selected_option === null || body.selected_option === ""
        ? null
        : typeof body.selected_option === "string"
          ? body.selected_option.trim().toUpperCase()
          : undefined;

    const isFlagged = body.is_flagged;

    if (
      !questionId ||
      selectedOption === undefined ||
      typeof isFlagged !== "boolean"
    ) {
      return NextResponse.json(
        { error: "Invalid answer data." },
        { status: 400 }
      );
    }

    const { data: candidate, error: candidateError } = await supabase
      .from("candidate_sessions")
      .select("id, access_type, payment_status, expires_at")
      .eq("session_token", hashToken(token))
      .gt("expires_at", new Date().toISOString())
      .maybeSingle();

    if (candidateError || !candidate) {
      return NextResponse.json(
        { error: "Your candidate session has expired." },
        { status: 401 }
      );
    }

    if (
  candidate.access_type !== "free" &&
  candidate.payment_status !== "paid"
) {
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

    if (attempt.status !== "in_progress") {
      return NextResponse.json(
        { error: "This exam is no longer active." },
        { status: 409 }
      );
    }

    if (new Date(attempt.ends_at).getTime() <= Date.now()) {
      return NextResponse.json(
        { error: "Exam time has ended. Submit your exam to see your result." },
        { status: 410 }
      );
    }

    const questionIds = attempt.question_ids as string[];

    if (!questionIds.includes(questionId)) {
      return NextResponse.json(
        { error: "This question does not belong to your exam." },
        { status: 403 }
      );
    }

    if (selectedOption !== null) {
      const { data: question, error: questionError } = await supabase
        .from("questions")
        .select("options")
        .eq("id", questionId)
        .maybeSingle();

      if (questionError || !question) {
        return NextResponse.json(
          { error: "Question not found." },
          { status: 404 }
        );
      }

      const allowedKeys = getOptionKeys(question.options);

      if (!allowedKeys.includes(selectedOption)) {
        return NextResponse.json(
          { error: "That answer option is not valid for this question." },
          { status: 400 }
        );
      }
    }

    const now = new Date().toISOString();

    const { error: saveError } = await supabase
      .from("exam_answers")
      .upsert(
        {
          attempt_id: attempt.id,
          question_id: questionId,
          selected_option: selectedOption,
          is_flagged: isFlagged,
          answered_at: selectedOption ? now : null,
          updated_at: now,
        },
        { onConflict: "attempt_id,question_id" }
      );

    if (saveError) {
      console.error("Save exam answer error:", saveError);

      return NextResponse.json(
        { error: "Unable to save your answer. Please try again." },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, saved_at: now });
  } catch (error) {
    console.error("Answer API error:", error);

    return NextResponse.json(
      { error: "An unexpected error occurred while saving your answer." },
      { status: 500 }
    );
  }
}
