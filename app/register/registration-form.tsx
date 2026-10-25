"use client";

import { useMemo, useState } from "react";

type Subject = {
  id: string;
  code: string;
  name: string;
};

export default function RegistrationForm({ subjects }: { subjects: Subject[] }) {
  const english = useMemo(
    () =>
      subjects.find((subject) => {
        const code = String(subject.code ?? "").trim().toUpperCase();
        const name = String(subject.name ?? "").trim().toLowerCase();
        return code === "ENG" || name.includes("use of english") || name === "english";
      }),
    [subjects]
  );

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [candidateName, setCandidateName] = useState("");
  const [email, setEmail] = useState("");
  const [age, setAge] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const selectedCount = selectedIds.length + (english ? 1 : 0);
  const remaining = Math.max(0, 3 - selectedIds.length);

  function toggleSubject(id: string) {
    if (english?.id === id) return;

    setSelectedIds((current) => {
      if (current.includes(id)) {
        return current.filter((subjectId) => subjectId !== id);
      }

      if (current.length >= 3) return current;
      return [...current, id];
    });
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!english) {
      setError("Use of English is not available in the subject list. Please contact the administrator.");
      return;
    }

    if (selectedIds.length !== 3) {
      setError("Select exactly three additional subjects. Use of English is compulsory.");
      return;
    }

    setLoading(true);

    try {
      const registrationResponse = await fetch("/api/candidate/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          candidate_name: candidateName.trim(),
          email: email.trim(),
          age: Number(age),
          selected_subject_ids: [english.id, ...selectedIds],
        }),
      });

      const registration = await registrationResponse.json();

      if (!registrationResponse.ok) {
        throw new Error(registration.error ?? "Registration failed. Please try again.");
      }

      const paymentResponse = await fetch("/api/payments/initialize", {
        method: "POST",
      });

      const payment = await paymentResponse.json();

      if (!paymentResponse.ok || !payment.authorization_url) {
        throw new Error(payment.error ?? "Unable to initialize payment. Please try again.");
      }

      window.location.assign(payment.authorization_url);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong. Please try again."
      );
      setLoading(false);
    }
  }

  const icons: Record<string, string> = {
    ENG: "Aa",
    BIO: "🧬",
    CHE: "⚗",
    PHY: "⚛",
    MAT: "∑",
    MTH: "∑",
    ECO: "📈",
    GOV: "⚖",
    LIT: "📚",
    CRS: "✦",
    IRS: "☾",
    GEO: "🌍",
    AGR: "🌱",
    COM: "💻",
  };

  return (
    <form className="registration-v2-form" onSubmit={handleSubmit}>
      <section className="registration-v2-section">
        <div className="registration-v2-heading">
          <div>
            <span className="registration-v2-step">01 — YOUR DETAILS</span>
            <h2>Let’s get to know you</h2>
            <p>Enter your details to prepare your examination session.</p>
          </div>
          <div className="registration-v2-step-number">01</div>
        </div>

        <div className="registration-v2-fields">
          <label className="registration-v2-field registration-v2-field-wide">
            <span>Full name</span>
            <input
              value={candidateName}
              onChange={(event) => setCandidateName(event.target.value)}
              placeholder="Enter your full name"
              autoComplete="name"
              required
              minLength={2}
              maxLength={100}
            />
          </label>

          <label className="registration-v2-field">
            <span>Email address</span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              required
            />
          </label>

          <label className="registration-v2-field">
            <span>Age</span>
            <input
              type="number"
              value={age}
              onChange={(event) => setAge(event.target.value)}
              placeholder="Your age"
              min={10}
              max={100}
              required
            />
          </label>
        </div>
      </section>

      <section className="registration-v2-section registration-v2-subject-section">
        <div className="registration-v2-heading">
          <div>
            <span className="registration-v2-step">02 — SUBJECT COMBINATION</span>
            <h2>Build your exam subjects</h2>
            <p>English is compulsory. Choose three more subjects for your combination.</p>
          </div>
          <div className="registration-v2-counter">
            <strong>{selectedCount}</strong>
            <span>/ 4 subjects</span>
          </div>
        </div>

        {!english && (
          <div className="registration-v2-warning">
            Use of English is missing from the active subject list. Please contact the administrator.
          </div>
        )}

        <div className="registration-v2-subject-grid">
          {english && (
            <button
              type="button"
              className="registration-v2-subject-card registration-v2-selected registration-v2-compulsory"
              aria-pressed="true"
              disabled
            >
              <span className="registration-v2-subject-icon">
                {icons.ENG}
              </span>
              <span className="registration-v2-subject-copy">
                <strong>{english.name}</strong>
                <small>Compulsory subject</small>
              </span>
              <span className="registration-v2-check">✓</span>
              <span className="registration-v2-required-tag">REQUIRED</span>
            </button>
          )}

          {subjects
            .filter((subject) => subject.id !== english?.id)
            .map((subject) => {
              const selected = selectedIds.includes(subject.id);
              const disabled = !selected && selectedIds.length >= 3;
              const code = String(subject.code ?? "").toUpperCase();

              return (
                <button
                  key={subject.id}
                  type="button"
                  className={`registration-v2-subject-card ${selected ? "registration-v2-selected" : ""} ${disabled ? "registration-v2-disabled" : ""}`}
                  onClick={() => toggleSubject(subject.id)}
                  disabled={disabled}
                  aria-pressed={selected}
                >
                  <span className="registration-v2-subject-icon">
                    {icons[code] ?? "✦"}
                  </span>
                  <span className="registration-v2-subject-copy">
                    <strong>{subject.name}</strong>
                    <small>{code || "SUBJECT"}</small>
                  </span>
                  <span className="registration-v2-check">
                    {selected ? "✓" : "+"}
                  </span>
                </button>
              );
            })}
        </div>

        <div className={`registration-v2-selection-note ${selectedIds.length === 3 ? "complete" : ""}`}>
          <span>{selectedIds.length === 3 ? "✓" : "＋"}</span>
          {selectedIds.length === 3
            ? "Your four-subject combination is complete."
            : `Choose ${remaining} more ${remaining === 1 ? "subject" : "subjects"} to complete your combination.`}
        </div>
      </section>

      <section className="registration-v2-payment">
        <div className="registration-v2-payment-icon">₦</div>
        <div className="registration-v2-payment-copy">
          <strong>Examination access</strong>
          <span>Full CBT · 180 questions · 120 minutes</span>
        </div>
        <div className="registration-v2-price">₦1,000</div>
      </section>

      {error && (
        <div className="registration-v2-error" role="alert">
          <span>!</span> {error}
        </div>
      )}

      <button
        type="submit"
        className="registration-v2-submit"
        disabled={loading || !english || selectedIds.length !== 3}
      >
        {loading ? "Preparing secure payment..." : "Continue to secure payment"}
        {!loading && <span>→</span>}
      </button>

      <p className="registration-v2-secure-note">
        Your payment is processed securely by Paystack. Your examination timer starts when you begin the exam.
      </p>
    </form>
  );
}
