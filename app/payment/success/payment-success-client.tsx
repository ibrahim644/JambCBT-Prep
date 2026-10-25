"use client";

import { useState } from "react";

export default function PaymentSuccessClient() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function startExam() {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/exam/start", {
        method: "POST",
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error ?? "Unable to start your examination.");
      }

      if (!result.attempt_id) {
        throw new Error("The exam could not be opened. Please try again.");
      }

      window.location.assign(`/exam/${result.attempt_id}`);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong. Please try again."
      );
      setLoading(false);
    }
  }

  return (
    <main className="payment-success-page">
      <section className="payment-success-card">
        <div className="payment-success-icon">✓</div>
        <p className="payment-success-eyebrow">PAYMENT CONFIRMED</p>
        <h1>You’re ready to begin!</h1>
        <p className="payment-success-description">
          Your ₦1,000 examination payment has been confirmed. When you begin,
          your 120-minute countdown will start. Make sure you are ready before
          continuing.
        </p>

        <div className="payment-exam-details">
          <div>
            <span>Examination duration</span>
            <strong>120 minutes</strong>
          </div>
          <div>
            <span>Examination format</span>
            <strong>Timed CBT</strong>
          </div>
          <div>
            <span>Answer saving</span>
            <strong>Automatic</strong>
          </div>
        </div>

        {error && (
          <div className="payment-success-error" role="alert">
            {error}
          </div>
        )}

        <button
          className="payment-start-button"
          onClick={startExam}
          disabled={loading}
          type="button"
        >
          {loading ? "Preparing your examination..." : "Start / Resume Examination"}
          {!loading && <span>→</span>}
        </button>

        <p className="payment-success-note">
          Do not close your browser during the examination. If you return to
          this page while your attempt is active, you can resume it.
        </p>
      </section>
    </main>
  );
}
