
import { NextRequest, NextResponse } from "next/server";
import { getAdminUser } from "@/lib/admin-auth";
import { supabase } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function parseLimit(value: string | null, fallback: number, max: number) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) return fallback;
  return Math.min(parsed, max);
}

export async function GET(request: NextRequest) {
  try {
    // Never return private candidate information to unauthorized users.
    const admin = await getAdminUser();

    if (!admin) {
      return NextResponse.json(
        { error: "Unauthorized. Admin access is required." },
        { status: 401 }
      );
    }

    const params = request.nextUrl.searchParams;
    const search = (params.get("search") ?? "").trim().slice(0, 100);
    const page = parseLimit(params.get("page"), 1, 1_000_000);
    const limit = parseLimit(params.get("limit"), 20, 100);
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let candidateQuery = supabase
      .from("candidates")
      .select(
        "id, full_name, email, phone, state, age, created_at, updated_at",
        { count: "exact" }
      )
      .order("created_at", { ascending: false })
      .range(from, to);

    if (search) {
      const safeSearch = search.replace(/[,%()]/g, " ").trim();

      if (safeSearch) {
        candidateQuery = candidateQuery.or(
          `full_name.ilike.%${safeSearch}%,email.ilike.%${safeSearch}%,phone.ilike.%${safeSearch}%,state.ilike.%${safeSearch}%`
        );
      }
    }

    const [
      candidatesResult,
      paidSessionsResult,
      freeSessionsResult,
    ] = await Promise.all([
      candidateQuery,

      supabase
        .from("candidate_sessions")
        .select("id", { count: "exact", head: true })
        .eq("access_type", "paid"),

      supabase
        .from("candidate_sessions")
        .select("id", { count: "exact", head: true })
        .eq("access_type", "free"),
    ]);

    if (candidatesResult.error) {
      console.error("Candidate list error:", candidatesResult.error);
      return NextResponse.json(
        { error: "Could not load candidates." },
        { status: 500 }
      );
    }

    if (paidSessionsResult.error || freeSessionsResult.error) {
      console.error(
        "Candidate statistics error:",
        paidSessionsResult.error ?? freeSessionsResult.error
      );

      return NextResponse.json(
        { error: "Could not load candidate statistics." },
        { status: 500 }
      );
    }

    const candidates = candidatesResult.data ?? [];
    const candidateIds = candidates.map((candidate) => candidate.id);

    // Fetch associated records only for candidates on this page.
    const [paymentsResult, attemptsResult, sessionsResult] =
      candidateIds.length > 0
        ? await Promise.all([
            supabase
              .from("candidate_payments")
              .select(
                "id, candidate_id, candidate_session_id, paystack_reference, amount_kobo, currency, status, attempts_granted, created_at, paid_at"
              )
              .in("candidate_id", candidateIds)
              .order("created_at", { ascending: false }),

            supabase
              .from("exam_attempts")
              .select(
                "id, candidate_id, candidate_session_id, score, total_questions, status, access_type, attempt_number, started_at, submitted_at, created_at"
              )
              .in("candidate_id", candidateIds)
              .order("created_at", { ascending: false }),

            supabase
              .from("candidate_sessions")
              .select(
                "id, candidate_id, access_type, payment_status, paid_attempts_allowed, paid_attempts_used, free_attempts_used, created_at"
              )
              .in("candidate_id", candidateIds)
              .order("created_at", { ascending: false }),
          ])
        : [
            { data: [], error: null },
            { data: [], error: null },
            { data: [], error: null },
          ];

    if (
      paymentsResult.error ||
      attemptsResult.error ||
      sessionsResult.error
    ) {
      console.error("Candidate history error:", {
        payments: paymentsResult.error,
        attempts: attemptsResult.error,
        sessions: sessionsResult.error,
      });

      return NextResponse.json(
        { error: "Could not load candidate payment and exam history." },
        { status: 500 }
      );
    }

    const payments = paymentsResult.data ?? [];
    const attempts = attemptsResult.data ?? [];
    const sessions = sessionsResult.data ?? [];

    const data = candidates.map((candidate) => {
      const candidatePayments = payments.filter(
        (payment) => payment.candidate_id === candidate.id
      );

      const candidateAttempts = attempts.filter(
        (attempt) => attempt.candidate_id === candidate.id
      );

      const candidateSessions = sessions.filter(
        (session) => session.candidate_id === candidate.id
      );

      const completedAttempts = candidateAttempts.filter(
        (attempt) => attempt.status === "submitted"
      );

      const scores = completedAttempts
        .map((attempt) => attempt.score)
        .filter((score): score is number => score !== null);

      const successfulPayments = candidatePayments.filter(
        (payment) => payment.status === "success"
      );

      return {
        ...candidate,

        summary: {
          session_count: candidateSessions.length,
          paid_session_count: candidateSessions.filter(
            (session) => session.access_type === "paid"
          ).length,
          free_session_count: candidateSessions.filter(
            (session) => session.access_type === "free"
          ).length,
          attempt_count: candidateAttempts.length,
          completed_attempt_count: completedAttempts.length,
          best_score: scores.length > 0 ? Math.max(...scores) : null,
          total_successful_payments_kobo: successfulPayments.reduce(
            (total, payment) => total + payment.amount_kobo,
            0
          ),
         paid_attempts_allowed: candidateSessions.reduce(
  (total, session) => total + (session.paid_attempts_allowed ?? 0),
  0
),
paid_attempts_used: candidateSessions.reduce(
  (total, session) => total + (session.paid_attempts_used ?? 0),
  0
),
paid_attempts_remaining: candidateSessions.reduce(
  (total, session) =>
    total +
    Math.max(
      0,
      (session.paid_attempts_allowed ?? 0) -
        (session.paid_attempts_used ?? 0)
    ),
  0
),
free_attempts_used: candidateSessions.reduce(
  (total, session) => total + (session.free_attempts_used ?? 0),
  0
),
latest_payment_status: candidatePayments[0]?.status ?? "none",
latest_exam_status: candidateAttempts[0]?.status ?? "not_started",
        },

        payments: candidatePayments,
        attempts: candidateAttempts,
        sessions: candidateSessions,
      };
    });

    return NextResponse.json({
      candidates: data,
      pagination: {
        page,
        limit,
        total: candidatesResult.count ?? 0,
        total_pages: Math.ceil((candidatesResult.count ?? 0) / limit),
      },
      statistics: {
        paid_sessions: paidSessionsResult.count ?? 0,
        free_sessions: freeSessionsResult.count ?? 0,
      },
    });
  } catch (error) {
    console.error("Admin candidates API error:", error);

    return NextResponse.json(
      { error: "An unexpected error occurred while loading candidates." },
      { status: 500 }
    );
  }
}
