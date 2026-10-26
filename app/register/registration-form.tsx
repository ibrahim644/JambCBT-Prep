
"use client";

import { useMemo, useState } from "react";

type Subject = {
  id: string;
  code: string;
  name: string;
};

const NIGERIAN_STATES = [
  "Abia", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi", "Bayelsa",
  "Benue", "Borno", "Cross River", "Delta", "Ebonyi", "Edo",
  "Ekiti", "Enugu", "FCT Abuja", "Gombe", "Imo", "Jigawa",
  "Kaduna", "Kano", "Katsina", "Kebbi", "Kogi", "Kwara",
  "Lagos", "Nasarawa", "Niger", "Ogun", "Ondo", "Osun",
  "Oyo", "Plateau", "Rivers", "Sokoto", "Taraba", "Yobe",
  "Zamfara",
];

export default function RegistrationForm({
  subjects,
}: {
  subjects: Subject[];
}) {
  const english = useMemo(
    () =>
      subjects.find((subject) => {
        const code = String(subject.code ?? "").trim().toUpperCase();
        const name = String(subject.name ?? "").trim().toLowerCase();

        return (
          code === "ENG" ||
          name.includes("use of english") ||
          name === "english"
        );
      }),
    [subjects]
  );

  const [examType, setExamType] = useState<"free" | "full">("full");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [candidateName, setCandidateName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [state, setState] = useState("");
  const [age, setAge] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const isFree = examType === "free";
  const selectedCount = isFree ? (english ? 1 : 0) : selectedIds.length + (english ? 1 : 0);
  const remaining = Math.max(0, 3 - selectedIds.length);
  const fullSelectionComplete = !isFree && selectedIds.length === 3;

  function changeExamType(type: "free" | "full") {
    setExamType(type);
    setSelectedIds([]);
    setError("");
    setSuccess("");
  }

  function toggleSubject(id: string) {
    if (english?.id === id || isFree) return;

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
    setSuccess("");

    if (!english) {
      setError("Use of English is unavailable. Please contact the administrator.");
      return;
    }

    if (!isFree && selectedIds.length !== 3) {
      setError("Choose three additional subjects for the full CBT.");
      return;
    }

    setLoading(true);

    try {
      const selectedSubjectIds = isFree
        ? [english.id]
        : [english.id, ...selectedIds];

      const registrationResponse = await fetch("/api/candidate/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          candidate_name: candidateName.trim(),
          email: email.trim(),
          phone: phone.trim(),
          state,
          age: Number(age),
          selected_subject_ids: selectedSubjectIds,
        }),
      });

      const registration = await registrationResponse.json();

      if (!registrationResponse.ok) {
        throw new Error(registration.error ?? "Registration failed. Please try again.");
      }

      
if (registration.payment_required === false) {
  setSuccess("Registration successful. Preparing your English examination...");

  const examResponse = await fetch("/api/exam/start", {
    method: "POST",
  });

  const exam = await examResponse.json();

  if (!examResponse.ok) {
    throw new Error(
      exam.error ??
        "Registration succeeded, but your examination could not be started."
    );
  }

  if (!exam.attempt_id) {
    throw new Error("Your examination could not be opened. Please try again.");
  }

  window.location.assign(`/exam/${exam.attempt_id}`);
  return;
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
    } finally {
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
            <p>Enter your details to create your candidate record.</p>
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
            <span>Phone number</span>
            <input
              type="tel"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              placeholder="08012345678"
              autoComplete="tel"
              minLength={7}
              maxLength={20}
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

          <label className="registration-v2-field">
            <span>State / FCT</span>
            <select
              value={state}
              onChange={(event) => setState(event.target.value)}
              required
            >
              <option value="">Select your state</option>
              {NIGERIAN_STATES.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      <section className="registration-v2-section registration-v2-subject-section">
        <div className="registration-v2-heading">
          <div>
            <span className="registration-v2-step">02 — EXAM TYPE</span>
            <h2>Choose your practice</h2>
            <p>Start with English for free or unlock the full JAMB combination.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => changeExamType("free")}
            aria-pressed={isFree}
            className={`rounded-2xl border-2 p-5 text-left transition ${
              isFree
                ? "border-green-700 bg-green-50 ring-2 ring-green-100"
                : "border-slate-200 bg-white hover:border-green-400"
            }`}
          >
            <span className="text-sm font-bold uppercase tracking-wide text-green-700">
              Free practice
            </span>
            <span className="mt-2 block text-2xl font-extrabold text-slate-900">
              ₦0
            </span>
            <span className="mt-2 block text-sm text-slate-600">
              Use of English only
            </span>
          </button>

          <button
            type="button"
            onClick={() => changeExamType("full")}
            aria-pressed={!isFree}
            className={`rounded-2xl border-2 p-5 text-left transition ${
              !isFree
                ? "border-green-700 bg-green-50 ring-2 ring-green-100"
                : "border-slate-200 bg-white hover:border-green-400"
            }`}
          >
            <span className="text-sm font-bold uppercase tracking-wide text-green-700">
              Full CBT
            </span>
            <span className="mt-2 block text-2xl font-extrabold text-slate-900">
              ₦1,000
            </span>
            <span className="mt-2 block text-sm text-slate-600">
              English + three other subjects · three attempts per payment
            </span>
          </button>
        </div>

        <div className="registration-v2-heading mt-6">
          <div>
            <span className="registration-v2-step">03 — SUBJECT COMBINATION</span>
            <h2>{isFree ? "English practice" : "Build your exam subjects"}</h2>
            <p>
              {isFree
                ? "English is selected for your free practice."
                : "English is compulsory. Choose three more subjects."}
            </p>
          </div>
          <div className="registration-v2-counter">
            <strong>{selectedCount}</strong>
            <span>{isFree ? "/ 1 subject" : "/ 4 subjects"}</span>
          </div>
        </div>

        {!english && (
          <div className="registration-v2-warning">
            Use of English is missing from the active subject list. Contact the administrator.
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
              <span className="registration-v2-subject-icon">Aa</span>
              <span className="registration-v2-subject-copy">
                <strong>{english.name}</strong>
                <small>{isFree ? "Free practice" : "Compulsory subject"}</small>
              </span>
              <span className="registration-v2-check">✓</span>
              <span className="registration-v2-required-tag">REQUIRED</span>
            </button>
          )}

          {!isFree &&
            subjects
              .filter((subject) => subject.id !== english?.id)
              .map((subject) => {
                const selected = selectedIds.includes(subject.id);
                const disabled = !selected && selectedIds.length >= 3;
                const code = String(subject.code ?? "").toUpperCase();

                return (
                  <button
                    key={subject.id}
                    type="button"
                    className={`registration-v2-subject-card ${
                      selected ? "registration-v2-selected" : ""
                    } ${disabled ? "registration-v2-disabled" : ""}`}
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

        {!isFree && (
          <div
            className={`registration-v2-selection-note ${
              fullSelectionComplete ? "complete" : ""
            }`}
          >
            <span>{fullSelectionComplete ? "✓" : "+"}</span>
            {fullSelectionComplete
              ? "Your four-subject combination is complete."
              : `Choose ${remaining} more ${
                  remaining === 1 ? "subject" : "subjects"
                } to complete your combination.`}
          </div>
        )}
      </section>

      <section className="registration-v2-payment">
        <div className="registration-v2-payment-icon">
          {isFree ? "✓" : "₦"}
        </div>
        <div className="registration-v2-payment-copy">
          <strong>{isFree ? "Free English practice" : "Full CBT access"}</strong>
          <span>
            {isFree
              ? "Use of English only"
              : "180 questions · 120 minutes · three attempts per payment"}
          </span>
        </div>
        <div className="registration-v2-price">
          {isFree ? "FREE" : "₦1,000"}
        </div>
      </section>

      {error && (
        <div className="registration-v2-error" role="alert">
          <span>!</span> {error}
        </div>
      )}

      {success && (
        <div
          className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-800"
          role="status"
        >
          {success}
        </div>
      )}

      <button
        type="submit"
        className="registration-v2-submit"
        disabled={
          loading ||
          !english ||
          (!isFree && selectedIds.length !== 3)
        }
      >
        {loading
          ? "Processing registration..."
          : isFree
            ? "Register for free English"
            : "Continue to secure payment"}
        {!loading && <span>→</span>}
      </button>

      <p className="registration-v2-secure-note">
        {isFree
          ? "No payment is required for English-only practice."
          : "Payment is verified securely by Paystack. Your exam timer starts when you begin the exam."}
      </p>
    </form>
  );
}
