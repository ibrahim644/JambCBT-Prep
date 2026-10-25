import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export const runtime = "nodejs";

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function redirectTo(request: NextRequest, path: string) {
  return NextResponse.redirect(new URL(path, request.nextUrl.origin));
}

export async function GET(request: NextRequest) {
  const reference = request.nextUrl.searchParams.get("reference");
  const token = request.cookies.get("candidate_session")?.value;
  const secret = process.env.PAYSTACK_SECRET_KEY;

  if (!reference || !token || !secret) {
    return redirectTo(request, "/payment/failed");
  }

  try {
    const { data: candidate, error } = await supabase
      .from("candidate_sessions")
      .select("id, payment_reference, payment_status, expires_at")
      .eq("session_token", hashToken(token))
      .eq("payment_reference", reference)
      .maybeSingle();

    if (error || !candidate) {
      return redirectTo(request, "/payment/failed");
    }

    if (candidate.payment_status === "paid") {
      return redirectTo(request, "/payment/success");
    }

    if (new Date(candidate.expires_at) <= new Date()) {
      return redirectTo(request, "/payment/failed");
    }

    const response = await fetch(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
      {
        headers: { Authorization: `Bearer ${secret}` },
        cache: "no-store",
      }
    );

    const result = await response.json();
    const transaction = result.data;

    const verified =
      response.ok &&
      result.status === true &&
      transaction?.status === "success" &&
      transaction?.reference === reference &&
      transaction?.amount === 100000 &&
      transaction?.currency === "NGN";

    if (!verified) {
      return redirectTo(request, "/payment/failed");
    }

    const { error: updateError } = await supabase
      .from("candidate_sessions")
      .update({
        payment_status: "paid",
        session_status: "ready",
      })
      .eq("id", candidate.id)
      .eq("payment_reference", reference)
      .eq("payment_status", "pending");

    if (updateError) {
      console.error("Payment status update failed:", updateError.message);
      return redirectTo(request, "/payment/failed");
    }

    return redirectTo(request, "/payment/success");
  } catch (error) {
    console.error("Payment verification error:", error);
    return redirectTo(request, "/payment/failed");
  }
}
