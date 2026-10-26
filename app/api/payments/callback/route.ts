import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export const runtime = "nodejs";

const PAYMENT_AMOUNT_KOBO = 100000;

function redirectTo(request: NextRequest, path: string) {
  return NextResponse.redirect(new URL(path, request.nextUrl.origin));
}

export async function GET(request: NextRequest) {
  const reference = request.nextUrl.searchParams.get("reference");
  const secret = process.env.PAYSTACK_SECRET_KEY;

  if (!reference || !secret) {
    return redirectTo(request, "/payment/failed");
  }

  try {
    // Find the payment independently of the candidate's browser cookie.
    const { data: payment, error: paymentLookupError } = await supabase
      .from("candidate_payments")
      .select("id, amount_kobo, currency, status")
      .eq("paystack_reference", reference)
      .maybeSingle();

    if (paymentLookupError || !payment) {
      console.error(
        "Payment reference lookup failed:",
        paymentLookupError?.message
      );
      return redirectTo(request, "/payment/failed");
    }

    // Verify the transaction directly with Paystack.
    const response = await fetch(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${secret}`,
        },
        cache: "no-store",
      }
    );

    const result = await response.json();
    const transaction = result?.data;

    const verified =
      response.ok &&
      result?.status === true &&
      transaction?.status === "success" &&
      transaction?.reference === reference &&
      transaction?.amount === PAYMENT_AMOUNT_KOBO &&
      transaction?.currency === "NGN" &&
      payment.amount_kobo === PAYMENT_AMOUNT_KOBO &&
      payment.currency === "NGN";

    if (!verified) {
      console.error("Paystack transaction verification failed.");
      return redirectTo(request, "/payment/failed");
    }

    // The database function confirms the payment and grants attempts
    // together, preventing duplicate grants on repeated callbacks.
    const { data: confirmation, error: confirmationError } =
      await supabase.rpc("confirm_candidate_payment", {
        p_reference: reference,
        p_amount_kobo: PAYMENT_AMOUNT_KOBO,
        p_currency: "NGN",
      });

    if (confirmationError || confirmation?.ok !== true) {
      console.error(
        "Payment confirmation failed:",
        confirmationError?.message ?? "Unexpected confirmation response"
      );
      return redirectTo(request, "/payment/failed");
    }

    return redirectTo(request, "/payment/success");
  } catch (error) {
    console.error("Payment callback error:", error);
    return redirectTo(request, "/payment/failed");
  }
}
