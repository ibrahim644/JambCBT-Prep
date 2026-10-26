
import { createHash, randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export const runtime = "nodejs";

const PAYMENT_AMOUNT_KOBO = 100000;
const ATTEMPTS_PER_PAYMENT = 3;

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function POST(request: NextRequest) {
  let paymentId: string | null = null;

  try {
    const secret = process.env.PAYSTACK_SECRET_KEY;

    if (!secret) {
      console.error("PAYSTACK_SECRET_KEY is not configured.");
      return NextResponse.json(
        { error: "Payment service is not configured yet." },
        { status: 500 }
      );
    }

    const token = request.cookies.get("candidate_session")?.value;

    if (!token) {
      return NextResponse.json(
        {
          error: "Your registration session has expired. Please register again.",
        },
        { status: 401 }
      );
    }

    const { data: candidate, error: candidateError } = await supabase
      .from("candidate_sessions")
      .select(
        "id, email, access_type, payment_status, paid_attempts_allowed, paid_attempts_used, selected_subject_ids, expires_at"
      )
      .eq("session_token", hashToken(token))
      .gt("expires_at", new Date().toISOString())
      .maybeSingle();

    if (candidateError || !candidate) {
      return NextResponse.json(
        {
          error: "Registration session not found or expired. Please register again.",
        },
        { status: 401 }
      );
    }

    if (candidate.access_type === "free") {
      return NextResponse.json(
        {
          error: "Free English access does not require payment.",
        },
        { status: 400 }
      );
    }

    if (
      !Array.isArray(candidate.selected_subject_ids) ||
      candidate.selected_subject_ids.length !== 4
    ) {
      return NextResponse.json(
        {
          error: "A valid four-subject JAMB registration is required.",
        },
        { status: 400 }
      );
    }

    const allowed = Number(candidate.paid_attempts_allowed ?? 0);
    const used = Number(candidate.paid_attempts_used ?? 0);

    if (used < allowed) {
      return NextResponse.json(
        {
          error: `You still have ${allowed - used} paid attempt(s) remaining.`,
          attempts_remaining: allowed - used,
        },
        { status: 409 }
      );
    }

    if (!candidate.email) {
      return NextResponse.json(
        { error: "Your registration needs an email address." },
        { status: 400 }
      );
    }

    const reference = `CBT-${candidate.id}-${randomBytes(8).toString("hex")}`;
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;

    // Record the purchase before contacting Paystack.
    const { data: payment, error: paymentInsertError } = await supabase
      .from("candidate_payments")
      .insert({
        candidate_session_id: candidate.id,
        paystack_reference: reference,
        amount_kobo: PAYMENT_AMOUNT_KOBO,
        currency: "NGN",
        status: "pending",
        attempts_granted: ATTEMPTS_PER_PAYMENT,
      })
      .select("id")
      .single();

    if (paymentInsertError || !payment) {
      console.error(
        "Could not create payment record:",
        paymentInsertError?.message
      );

      return NextResponse.json(
        { error: "Could not prepare payment. Please try again." },
        { status: 500 }
      );
    }

    paymentId = payment.id;

    const { error: referenceUpdateError } = await supabase
      .from("candidate_sessions")
      .update({ payment_reference: reference })
      .eq("id", candidate.id);

    if (referenceUpdateError) {
      console.error(
        "Could not save payment reference:",
        referenceUpdateError.message
      );

      await supabase
        .from("candidate_payments")
        .update({ status: "failed" })
        .eq("id", payment.id)
        .eq("status", "pending");

      return NextResponse.json(
        { error: "Could not prepare payment. Please try again." },
        { status: 500 }
      );
    }

    const paystackResponse = await fetch(
      "https://api.paystack.co/transaction/initialize",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${secret}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: candidate.email,
          amount: PAYMENT_AMOUNT_KOBO,
          currency: "NGN",
          reference,
          callback_url: `${baseUrl}/api/payments/callback`,
          metadata: {
            candidate_session_id: candidate.id,
            candidate_payment_id: payment.id,
            attempts_granted: ATTEMPTS_PER_PAYMENT,
            purpose: "JAMB CBT Practice - 3 Attempts",
          },
        }),
        cache: "no-store",
      }
    );

    const result = await paystackResponse.json();

    if (
      !paystackResponse.ok ||
      !result.status ||
      !result.data?.authorization_url ||
      result.data.reference !== reference
    ) {
      console.error("Paystack initialization failed:", result.message);

      await supabase
        .from("candidate_payments")
        .update({ status: "failed" })
        .eq("id", payment.id)
        .eq("status", "pending");

      return NextResponse.json(
        { error: "Unable to start payment. Please try again." },
        { status: 502 }
      );
    }

    return NextResponse.json({
      ok: true,
      authorization_url: result.data.authorization_url,
      reference,
      amount_kobo: PAYMENT_AMOUNT_KOBO,
      attempts_granted: ATTEMPTS_PER_PAYMENT,
    });
  } catch (error) {
    console.error("Payment initialization error:", error);

    if (paymentId) {
      await supabase
        .from("candidate_payments")
        .update({ status: "failed" })
        .eq("id", paymentId)
        .eq("status", "pending");
    }

    return NextResponse.json(
      { error: "An unexpected payment error occurred." },
      { status: 500 }
    );
  }
}
