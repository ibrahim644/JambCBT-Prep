import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export const runtime = "nodejs";

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
        { error: "Your registration session is missing. Please register again." },
        { status: 401 }
      );
    }

    const { data: candidate, error: candidateError } = await supabase
      .from("candidate_sessions")
      .select("id, payment_status, session_status, selected_subject_ids, expires_at")
      .eq("session_token", hashToken(token))
      .gt("expires_at", new Date().toISOString())
      .maybeSingle();

    if (candidateError || !candidate) {
      return NextResponse.json(
        { error: "Your registration session has expired or could not be found." },
        { status: 401 }
      );
    }

    if (candidate.payment_status !== "paid") {
      return NextResponse.json(
        { error: "Please complete and verify your ₦1,000 payment before starting the exam." },
        { status: 403 }
      );
    }

    if (candidate.session_status === "completed" ||
        candidate.session_status === "expired") {
      return NextResponse.json(
        { error: "This exam session is no longer available." },
        { status: 409 }
      );
    }

    const { data: existingAttempts, error: attemptLookupError } = await supabase
      .from("exam_attempts")
      .select("id, ends_at, status")
      .eq("candidate_session_id", candidate.id)
      .eq("status", "in_progress")
      .order("started_at", { ascending: false })
      .limit(1);

    if (attemptLookupError) {
      console.error("Attempt lookup failed:", attemptLookupError.message);
      return NextResponse.json(
        { error: "Unable to check your exam session." },
        { status: 500 }
      );
    }

    const existing = existingAttempts?.[0];

    if (existing && new Date(existing.ends_at) > new Date()) {
      return NextResponse.json({
        ok: true,
        attempt_id: existing.id,
        ends_at: existing.ends_at,
        resumed: true,
      });
    }

    if (existing) {
      await supabase
        .from("exam_attempts")
        .update({ status: "expired" })
        .eq("id", existing.id)
        .eq("status", "in_progress");

      await supabase
        .from("candidate_sessions")
        .update({ session_status: "expired" })
        .eq("id", candidate.id);

      return NextResponse.json(
        { error: "Your exam time has expired. This attempt cannot be restarted." },
        { status: 409 }
      );
    }

    if (candidate.session_status !== "ready") {
      return NextResponse.json(
        { error: "Your exam session is not ready to start." },
        { status: 409 }
      );
    }

    const subjectIds = candidate.selected_subject_ids as string[];

    if (!Array.isArray(subjectIds) || subjectIds.length !== 4) {
      return NextResponse.json(
        { error: "Your registration must contain exactly four subjects." },
        { status: 400 }
      );
    }

    const { data: subjects, error: subjectsError } = await supabase
      .from("subjects")
      .select("id, name, code")
      .in("id", subjectIds);

    if (subjectsError || !subjects || subjects.length !== 4) {
      return NextResponse.json(
        { error: "Unable to load your selected subjects." },
        { status: 500 }
      );
    }

    const english = subjects.find((subject) => {
      const code = subject.code.toUpperCase();
      const name = subject.name.toLowerCase();

      return code === "ENG" ||
        name.includes("use of english") ||
        name === "english";
    });

    if (!english) {
      return NextResponse.json(
        { error: "Use of English is compulsory. Please correct your subject combination." },
        { status: 400 }
      );
    }

    const orderedSubjects = [
      english,
      ...subjects.filter((subject) => subject.id !== english.id),
    ];

    const questionIds: string[] = [];

    for (const [index, subject] of orderedSubjects.entries()) {
      const requiredCount = index === 0 ? 60 : 40;

      const { data: questions, error: questionsError } = await supabase
        .from("questions")
        .select("id")
        .eq("subject_id", subject.id)
        .eq("is_published", true)
        .eq("needs_review", false)
        .limit(1000);

      if (questionsError) {
        console.error("Question lookup failed:", questionsError.message);
        return NextResponse.json(
          { error: `Unable to load questions for ${subject.name}.` },
          { status: 500 }
        );
      }

      const available = questions ?? [];

      if (available.length < requiredCount) {
        return NextResponse.json(
          {
            error: `${subject.name} needs at least ${requiredCount} published questions, but only ${available.length} are available. Please contact the administrator.`,
          },
          { status: 409 }
        );
      }

      questionIds.push(
        ...shuffle(available.map((question) => question.id))
          .slice(0, requiredCount)
      );
    }

    const now = new Date();
    const endsAt = new Date(now.getTime() + 120 * 60 * 1000);

    const { data: attempt, error: createError } = await supabase
      .from("exam_attempts")
      .insert({
        candidate_session_id: candidate.id,
        question_ids: questionIds,
        started_at: now.toISOString(),
        ends_at: endsAt.toISOString(),
        total_questions: questionIds.length,
        status: "in_progress",
      })
      .select("id, ends_at")
      .single();

    if (createError || !attempt) {
      console.error("Attempt creation failed:", createError?.message);
      return NextResponse.json(
        { error: "Unable to start the exam. Please try again." },
        { status: 500 }
      );
    }

    const answerRows = questionIds.map((questionId) => ({
      attempt_id: attempt.id,
      question_id: questionId,
      selected_option: null,
      is_flagged: false,
    }));

    const { error: answersError } = await supabase
      .from("exam_answers")
      .insert(answerRows);

    if (answersError) {
      console.error("Answer initialization failed:", answersError.message);

      await supabase
        .from("exam_attempts")
        .delete()
        .eq("id", attempt.id);

      return NextResponse.json(
        { error: "Unable to prepare your answers. Please try again." },
        { status: 500 }
      );
    }

    const { error: updateError } = await supabase
      .from("candidate_sessions")
      .update({ session_status: "in_progress" })
      .eq("id", candidate.id)
      .eq("session_status", "ready");

    if (updateError) {
      console.error("Session status update failed:", updateError.message);
      await supabase
        .from("exam_attempts")
        .delete()
        .eq("id", attempt.id);

      return NextResponse.json(
        { error: "Unable to activate your exam session." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      attempt_id: attempt.id,
      ends_at: attempt.ends_at,
      total_questions: questionIds.length,
      duration_minutes: 120,
      resumed: false,
    });
  } catch (error) {
    console.error("Exam start error:", error);

    return NextResponse.json(
      { error: "An unexpected error occurred while starting the exam." },
      { status: 500 }
    );
  }
}
