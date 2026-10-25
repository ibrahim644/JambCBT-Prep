import { createHash, randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export const runtime = "nodejs";

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function POST(request: NextRequest) {
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
        { error: "Your registration session has expired. Please register again." },
        { status: 401 }
      );
    }

    const { data: candidate, error: candidateError } = await supabase
      .from("candidate_sessions")
      .select("id, email, payment_status, session_status")
      .eq("session_token", hashToken(token))
      .gt("expires_at", new Date().toISOString())
      .maybeSingle();

    if (candidateError || !candidate) {
      return NextResponse.json(
        { error: "Registration session not found or expired. Please register again." },
        { status: 401 }
      );
    }

    if (candidate.payment_status === "paid") {
      return NextResponse.json(
        { error: "This registration has already been paid for." },
        { status: 409 }
      );
    }

    if (!candidate.email) {
      return NextResponse.json(
        { error: "Your registration needs an email address." },
        { status: 400 }
      );
    }

    const reference = `CBT-${candidate.id}-${randomBytes(6).toString("hex")}`;
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;

    const { error: updateError } = await supabase
      .from("candidate_sessions")
      .update({ payment_reference: reference })
      .eq("id", candidate.id);

    if (updateError) {
      console.error("Could not save payment reference:", updateError.message);
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
          amount: 100000,
          currency: "NGN",
          reference,
          callback_url: `${baseUrl}/api/payments/callback`,
          metadata: {
            candidate_session_id: candidate.id,
            purpose: "JAMB CBT Practice",
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
      return NextResponse.json(
        { error: "Unable to start payment. Please try again." },
        { status: 502 }
      );
    }

    return NextResponse.json({
      ok: true,
      authorization_url: result.data.authorization_url,
    });
  } catch (error) {
    console.error("Payment initialization error:", error);
    return NextResponse.json(
      { error: "An unexpected payment error occurred." },
      { status: 500 }
    );
  }
}
