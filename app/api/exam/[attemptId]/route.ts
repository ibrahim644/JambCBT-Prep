import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export const runtime = "nodejs";

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ attemptId: string }> }
) {
  try {
    const token = request.cookies.get("candidate_session")?.value;

    if (!token) {
      return NextResponse.json(
        { error: "Please register and pay before accessing the exam." },
        { status: 401 }
      );
    }

    const { attemptId } = await context.params;

    const { data: candidate, error: candidateError } = await supabase
      .from("candidate_sessions")
      .select("id, payment_status, session_status, expires_at")
      .eq("session_token", hashToken(token))
      .gt("expires_at", new Date().toISOString())
      .maybeSingle();

    if (candidateError || !candidate) {
      return NextResponse.json(
        { error: "Your candidate session has expired. Please register again." },
        { status: 401 }
      );
    }

    if (candidate.payment_status !== "paid") {
      return NextResponse.json(
        { error: "Payment must be confirmed before starting the exam." },
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
        { error: "This exam has already been submitted or expired." },
        { status: 409 }
      );
    }

    if (new Date(attempt.ends_at).getTime() <= Date.now()) {
      await supabase
        .from("exam_attempts")
        .update({ status: "expired" })
        .eq("id", attempt.id)
        .eq("status", "in_progress");

      await supabase
        .from("candidate_sessions")
        .update({ session_status: "expired" })
        .eq("id", candidate.id)
        .eq("session_status", "in_progress");

      return NextResponse.json(
        { error: "Your exam time has ended." },
        { status: 410 }
      );
    }

    const questionIds = attempt.question_ids as string[];

    if (!questionIds?.length) {
      return NextResponse.json(
        { error: "No questions were assigned to this exam." },
        { status: 500 }
      );
    }

    const { data: questions, error: questionsError } = await supabase
      .from("questions")
      .select("id, subject_id, question_text, options")
      .in("id", questionIds);

    if (questionsError || !questions) {
      console.error("Load exam questions failed:", questionsError?.message);
      return NextResponse.json(
        { error: "Unable to load exam questions." },
        { status: 500 }
      );
    }

    const subjectIds = [
      ...new Set(questions.map((question) => question.subject_id)),
    ];

    const { data: subjects, error: subjectsError } = await supabase
      .from("subjects")
      .select("id, name, code")
      .in("id", subjectIds);

    if (subjectsError || !subjects) {
      console.error("Load exam subjects failed:", subjectsError?.message);
      return NextResponse.json(
        { error: "Unable to load subject names for this exam." },
        { status: 500 }
      );
    }

    const subjectMap = new Map(
      subjects.map((subject) => [
        subject.id,
        { name: subject.name, code: subject.code },
      ])
    );

    const questionMap = new Map(
      questions.map((question) => {
        const subject = subjectMap.get(question.subject_id);

        return [
          question.id,
          {
            ...question,
            subject_name: subject?.name ?? "Unknown subject",
            subject_code: subject?.code ?? "",
          },
        ];
      })
    );

    const orderedQuestions = questionIds.map((id) => questionMap.get(id));

    if (orderedQuestions.some((question) => !question)) {
      return NextResponse.json(
        {
          error:
            "Some exam questions are unavailable. Please contact support.",
        },
        { status: 500 }
      );
    }

    const { data: answers, error: answersError } = await supabase
      .from("exam_answers")
      .select("question_id, selected_option, is_flagged")
      .eq("attempt_id", attempt.id);

    if (answersError) {
      return NextResponse.json(
        { error: "Unable to load your saved answers." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      attempt_id: attempt.id,
      ends_at: attempt.ends_at,
      total_questions: questionIds.length,
      questions: orderedQuestions,
      answers: answers ?? [],
    });
  } catch (error) {
    console.error("Load exam error:", error);

    return NextResponse.json(
      { error: "An unexpected error occurred while loading the exam." },
      { status: 500 }
    );
  }
}
