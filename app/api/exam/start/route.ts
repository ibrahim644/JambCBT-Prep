
import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export const runtime = "nodejs";

const FREE_ATTEMPT_LIMIT = 3;
const EXAM_DURATION_MINUTES = 120;

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function shuffle<T>(items: T[]): T[] {
  const result = [...items];

  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }

  return result;
}

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get("candidate_session")?.value;

    if (!token) {
      return NextResponse.json(
        { error: "Candidate session not found. Please register again." },
        { status: 401 }
      );
    }

    const { data: candidate, error: candidateError } = await supabase
      .from("candidate_sessions")
      .select(
        "id, candidate_id, selected_subject_ids, access_type, payment_status, session_status, paid_attempts_allowed, paid_attempts_used, free_attempts_used, expires_at"
      )
      .eq("session_token", hashToken(token))
      .gt("expires_at", new Date().toISOString())
      .maybeSingle();

    if (candidateError || !candidate) {
      return NextResponse.json(
        { error: "Your session is invalid or expired. Please register again." },
        { status: 401 }
      );
    }

    const isFree = candidate.access_type === "free";
    const selectedSubjectIds = candidate.selected_subject_ids;

    if (!Array.isArray(selectedSubjectIds)) {
      return NextResponse.json(
        { error: "Your selected subjects are invalid. Please register again." },
        { status: 400 }
      );
    }

    if (isFree && selectedSubjectIds.length !== 1) {
      return NextResponse.json(
        { error: "Free practice is limited to Use of English." },
        { status: 400 }
      );
    }

    if (!isFree && selectedSubjectIds.length !== 4) {
      return NextResponse.json(
        { error: "Select English and three other subjects for the full exam." },
        { status: 400 }
      );
    }

    if (!isFree && candidate.payment_status !== "paid") {
      return NextResponse.json(
        { error: "Payment is required before you can start the full exam." },
        { status: 402 }
      );
    }

    const { data: subjects, error: subjectsError } = await supabase
      .from("subjects")
      .select("id, name, code")
      .in("id", selectedSubjectIds)
      .eq("is_active", true);

    if (subjectsError || !subjects || subjects.length !== selectedSubjectIds.length) {
      console.error("Exam subject lookup failed:", subjectsError);

      return NextResponse.json(
        { error: "One or more selected subjects are unavailable." },
        { status: 400 }
      );
    }

    const hasEnglish = subjects.some(
      (subject) =>
        String(subject.code ?? "").toLowerCase() === "eng" ||
        String(subject.code ?? "").toLowerCase() === "english" ||
        String(subject.name ?? "").toLowerCase() === "use of english"
    );

    if (!hasEnglish) {
      return NextResponse.json(
        { error: "Use of English must be included in every JAMB exam." },
        { status: 400 }
      );
    }

    const now = new Date();
    const endsAt = new Date(
      now.getTime() + EXAM_DURATION_MINUTES * 60 * 1000
    );

    const questionIds: string[] = [];

    for (const subject of subjects) {
      const isEnglish =
        String(subject.code ?? "").toLowerCase() === "eng" ||
        String(subject.code ?? "").toLowerCase() === "english" ||
        String(subject.name ?? "").toLowerCase() === "use of english";

      const requiredCount = isEnglish ? 60 : 40;

      const { data: questions, error: questionsError } = await supabase
        .from("questions")
        .select("id")
        .eq("subject_id", subject.id)
        .eq("is_published", true)
        .eq("needs_review", false);

      if (questionsError || !questions || questions.length < requiredCount) {
        console.error(
          `Question loading failed for ${subject.name}:`,
          questionsError
        );

        return NextResponse.json(
          {
            error: `Not enough approved questions are available for ${subject.name}. Please contact the administrator.`,
          },
          { status: 400 }
        );
      }

      const selectedQuestions = shuffle(questions).slice(0, requiredCount);
      questionIds.push(...selectedQuestions.map((question) => question.id));
    }

    if (isFree && questionIds.length !== 60) {
      return NextResponse.json(
        { error: "English practice could not be prepared correctly." },
        { status: 500 }
      );
    }

    const { data: reservation, error: reservationError } = await supabase.rpc(
      "reserve_candidate_attempt",
      {
        p_candidate_session_id: candidate.id,
        p_question_ids: questionIds,
        p_started_at: now.toISOString(),
        p_ends_at: endsAt.toISOString(),
        p_total_questions: questionIds.length,
        p_access_type: isFree ? "free" : "paid",
      }
    );

    if (reservationError || !reservation?.ok) {
      const message = reservationError?.message ?? "Unable to reserve an attempt.";
      const lowerMessage = message.toLowerCase();

      if (lowerMessage.includes("no attempts remaining")) {
        const used = isFree
          ? Number(candidate.free_attempts_used ?? 0)
          : Number(candidate.paid_attempts_used ?? 0);

        const allowed = isFree
          ? FREE_ATTEMPT_LIMIT
          : Number(candidate.paid_attempts_allowed ?? 0);

        return NextResponse.json(
          {
            error: "You have used all your available attempts.",
            attempts_remaining: Math.max(0, allowed - used),
          },
          { status: 409 }
        );
      }

      if (lowerMessage.includes("payment is required")) {
        return NextResponse.json(
          { error: "Payment is required before starting the full exam." },
          { status: 402 }
        );
      }

      console.error("Attempt reservation failed:", reservationError);

      return NextResponse.json(
        { error: "Unable to start your exam. Please try again." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      attempt_id: reservation.attempt_id,
      ends_at: reservation.ends_at,
      total_questions: reservation.resumed
        ? undefined
        : questionIds.length,
      duration_minutes: EXAM_DURATION_MINUTES,
      access_type: isFree ? "free" : "paid",
      attempt_number: reservation.attempt_number ?? null,
      attempts_remaining: reservation.attempts_remaining ?? null,
      resumed: Boolean(reservation.resumed),
    });
  } catch (error) {
    console.error("Exam start error:", error);

    return NextResponse.json(
      { error: "An unexpected error occurred while starting your exam." },
      { status: 500 }
    );
  }
}
