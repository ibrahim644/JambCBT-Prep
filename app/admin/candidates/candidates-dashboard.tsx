
"use client";

import { useCallback, useEffect, useState } from "react";

type Payment = {
  id: string;
  paystack_reference: string;
  amount_kobo: number;
  currency: string;
  status: string;
  attempts_granted: number;
  created_at: string;
  paid_at: string | null;
};

type Attempt = {
  id: string;
  score: number | null;
  total_questions: number;
  status: string;
  access_type: string;
  attempt_number: number | null;
  started_at: string | null;
  submitted_at: string | null;
  created_at: string;
};

type Candidate = {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  state: string;
  age: number | null;
  created_at: string;
  summary: {
    session_count: number;
    paid_session_count: number;
    free_session_count: number;
    attempt_count: number;
    completed_attempt_count: number;
    best_score: number | null;
    total_successful_payments_kobo: number;
    paid_attempts_allowed: number;
    paid_attempts_used: number;
    paid_attempts_remaining: number;
    free_attempts_used: number;
    latest_payment_status: string;
    latest_exam_status: string;
  };
  payments: Payment[];
  attempts: Attempt[];
};

type ApiResponse = {
  candidates: Candidate[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
  statistics: {
    paid_sessions: number;
    free_sessions: number;
  };
  error?: string;
};

function formatDate(value: string | null | undefined) {
  if (!value) return "—";

  const parsed = new Date(value);

  return Number.isNaN(parsed.getTime())
    ? "—"
    : parsed.toLocaleString("en-NG", {
        dateStyle: "medium",
        timeStyle: "short",
      });
}

function formatMoney(kobo: number, currency = "NGN") {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format((kobo || 0) / 100);
}

function formatStatus(status: string) {
  return status.replaceAll("_", " ");
}

function statusStyle(status: string) {
  const normalized = status.toLowerCase();

  if (
    ["success", "submitted", "paid", "completed"].includes(normalized)
  ) {
    return "bg-emerald-100 text-emerald-800";
  }

  if (
    ["pending", "in_progress", "ready"].includes(normalized)
  ) {
    return "bg-amber-100 text-amber-800";
  }

  if (
    ["failed", "cancelled", "canceled", "expired"].includes(normalized)
  ) {
    return "bg-red-100 text-red-800";
  }

  return "bg-slate-100 text-slate-700";
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${statusStyle(status)}`}
    >
      {formatStatus(status)}
    </span>
  );
}

export default function CandidatesDashboard() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<Candidate | null>(null);

  const loadCandidates = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: "20",
      });

      if (search.trim()) {
        params.set("search", search.trim());
      }

      const response = await fetch(
        `/api/admin/candidates?${params.toString()}`,
        {
          method: "GET",
          cache: "no-store",
          credentials: "same-origin",
        }
      );

      const result = (await response.json()) as ApiResponse;

      if (!response.ok) {
        throw new Error(
          result.error || "Failed to load candidate records."
        );
      }

      setData(result);

      // Keep the open profile synchronized with refreshed records.
      setSelected((current) => {
        if (!current) return null;

        return (
          result.candidates.find(
            (candidate) => candidate.id === current.id
          ) ?? null
        );
      });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong while loading candidates."
      );
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadCandidates();
    }, 250);

    return () => window.clearTimeout(timer);
  }, [loadCandidates]);

  const candidates = data?.candidates ?? [];

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total Candidates"
          value={data?.pagination.total ?? "—"}
          detail="Candidates matching your search"
          icon="👥"
        />

        <StatCard
          label="Paid Sessions"
          value={data?.statistics.paid_sessions ?? "—"}
          detail="Sessions registered as paid access"
          icon="💳"
        />

        <StatCard
          label="Free Sessions"
          value={data?.statistics.free_sessions ?? "—"}
          detail="Sessions registered as free access"
          icon="🆓"
        />

        <StatCard
          label="Records Per Page"
          value={20}
          detail="Search to locate a candidate"
          icon="📋"
        />
      </section>

      {/* Candidate table */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-slate-100 p-5 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Registered Candidates
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Search by name, email, phone number, or state.
            </p>
          </div>

          <div className="w-full md:max-w-md">
            <label htmlFor="candidate-search" className="sr-only">
              Search candidates
            </label>

            <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 focus-within:border-emerald-600 focus-within:ring-2 focus-within:ring-emerald-100">
              <span aria-hidden="true">⌕</span>

              <input
                id="candidate-search"
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
                placeholder="Search candidate records..."
                className="min-w-0 flex-1 bg-transparent py-3 text-sm outline-none"
              />

              {search && (
                <button
                  type="button"
                  onClick={() => {
                    setSearch("");
                    setPage(1);
                  }}
                  className="text-sm text-slate-500 hover:text-slate-900"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        </div>

        {error && (
          <div
            role="alert"
            className="m-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
          >
            {error}

            <button
              type="button"
              onClick={() => void loadCandidates()}
              className="ml-3 font-semibold underline"
            >
              Retry
            </button>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1200px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-4 font-semibold">Candidate</th>
                <th className="px-5 py-4 font-semibold">Email Address</th>
                <th className="px-5 py-4 font-semibold">Phone Number</th>
                <th className="px-5 py-4 font-semibold">Location</th>
                <th className="px-5 py-4 font-semibold">Exams</th>
                <th className="px-5 py-4 font-semibold">Best Score</th>
                <th className="px-5 py-4 font-semibold">Payments</th>
                <th className="px-5 py-4 font-semibold">Registered</th>
                <th className="px-5 py-4 font-semibold">Action</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {loading && (
                <tr>
                  <td
                    colSpan={9}
                    className="px-5 py-12 text-center text-slate-500"
                  >
                    Loading candidate records…
                  </td>
                </tr>
              )}

              {!loading && !error && candidates.length === 0 && (
                <tr>
                  <td
                    colSpan={9}
                    className="px-5 py-12 text-center text-slate-500"
                  >
                    No candidates found. Try another search.
                  </td>
                </tr>
              )}

              {!loading &&
                candidates.map((candidate) => (
                  <tr
                    key={candidate.id}
                    className="transition hover:bg-emerald-50/40"
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 font-bold text-emerald-800">
                          {candidate.full_name?.trim().slice(0, 1).toUpperCase() || "?"}
                        </div>

                        <div>
                          <p className="font-semibold text-slate-900">
                            {candidate.full_name}
                          </p>

                          <p className="mt-1 text-xs text-slate-500">
                            {candidate.age != null
                              ? `${candidate.age} years`
                              : "Age not provided"}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      {candidate.email ? (
                        <a
                          href={`mailto:${candidate.email}`}
                          className="block max-w-[220px] break-all font-medium text-emerald-700 hover:underline"
                        >
                          {candidate.email}
                        </a>
                      ) : (
                        <span className="text-slate-400">
                          No email provided
                        </span>
                      )}
                    </td>

                    <td className="px-5 py-4">
                      {candidate.phone ? (
                        <a
                          href={`tel:${candidate.phone}`}
                          className="whitespace-nowrap text-slate-700 hover:text-emerald-700"
                        >
                          {candidate.phone}
                        </a>
                      ) : (
                        <span className="text-slate-400">
                          No phone provided
                        </span>
                      )}
                    </td>

                    <td className="px-5 py-4">
                      {candidate.state || "Not provided"}
                    </td>

                    <td className="px-5 py-4">
                      <p className="font-semibold">
                        {candidate.summary.completed_attempt_count} completed
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        {candidate.summary.attempt_count} total attempts
                      </p>
                    </td>

                    <td className="px-5 py-4">
                      <span className="rounded-lg bg-emerald-50 px-3 py-1.5 font-bold text-emerald-800">
                        {candidate.summary.best_score ?? "—"}
                      </span>
                    </td>

                    <td className="px-5 py-4">
                      <p className="font-semibold">
                        {formatMoney(
                          candidate.summary.total_successful_payments_kobo
                        )}
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        {
                          candidate.payments.filter(
                            (payment) => payment.status === "success"
                          ).length
                        }{" "}
                        successful
                      </p>
                    </td>

                    <td className="whitespace-nowrap px-5 py-4 text-slate-600">
                      {formatDate(candidate.created_at)}
                    </td>

                    <td className="px-5 py-4">
                      <button
                        type="button"
                        onClick={() => setSelected(candidate)}
                        className="whitespace-nowrap rounded-lg bg-emerald-700 px-3 py-2 font-semibold text-white transition hover:bg-emerald-800"
                      >
                        View details
                      </button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex flex-col gap-3 border-t border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-500">
            {data
              ? `Showing ${
                  data.pagination.total === 0
                    ? 0
                    : (page - 1) * 20 + 1
                }–${Math.min(
                  page * 20,
                  data.pagination.total
                )} of ${data.pagination.total} candidates`
              : "Loading records"}
          </p>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page <= 1 || loading}
              onClick={() => setPage((current) => current - 1)}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-40"
            >
              Previous
            </button>

            <span className="px-2 text-sm text-slate-600">
              Page {data?.pagination.page ?? page} of{" "}
              {Math.max(1, data?.pagination.total_pages ?? 1)}
            </span>

            <button
              type="button"
              disabled={
                loading ||
                page >= (data?.pagination.total_pages ?? 1)
              }
              onClick={() => setPage((current) => current + 1)}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      </section>

      {/* Candidate details modal */}
      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/60 p-3 py-6 backdrop-blur-sm sm:p-6"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setSelected(null);
            }
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="candidate-detail-title"
            className="my-auto w-full max-w-6xl overflow-hidden rounded-2xl bg-white shadow-2xl"
          >
            <header className="flex items-start justify-between gap-4 bg-emerald-950 p-6 text-white sm:p-8">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300">
                  Candidate profile
                </p>

                <h2
                  id="candidate-detail-title"
                  className="mt-2 text-2xl font-bold sm:text-3xl"
                >
                  {selected.full_name}
                </h2>

                <p className="mt-2 break-all text-sm text-emerald-100">
                  {selected.email || "No email provided"}
                </p>

                <p className="mt-1 text-sm text-emerald-200">
                  {selected.phone || "No phone provided"}
                  {" · "}
                  {selected.state || "Location not provided"}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelected(null)}
                aria-label="Close candidate details"
                className="rounded-lg border border-white/20 px-3 py-2 hover:bg-white/10"
              >
                ✕
              </button>
            </header>

            <div className="max-h-[70vh] space-y-7 overflow-y-auto p-5 sm:p-8">
              {/* Candidate overview */}
              <section>
                <h3 className="mb-3 text-lg font-bold text-slate-900">
                  Candidate overview
                </h3>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <DetailCard
                    label="Phone"
                    value={selected.phone || "Not provided"}
                  />

                  <DetailCard
                    label="State / Location"
                    value={selected.state || "Not provided"}
                  />

                  <DetailCard
                    label="Age"
                    value={
                      selected.age != null
                        ? `${selected.age} years`
                        : "Not provided"
                    }
                  />

                  <DetailCard
                    label="Registration date"
                    value={formatDate(selected.created_at)}
                  />

                  <DetailCard
                    label="Best score"
                    value={selected.summary.best_score ?? "No result yet"}
                  />

                  <DetailCard
                    label="Total exam attempts"
                    value={selected.summary.attempt_count}
                  />

                  <DetailCard
                    label="Completed exams"
                    value={selected.summary.completed_attempt_count}
                  />

                  <DetailCard
                    label="Paid sessions"
                    value={selected.summary.paid_session_count}
                  />

                  <DetailCard
                    label="Free sessions"
                    value={selected.summary.free_session_count}
                  />

                  <DetailCard
                    label="Paid attempts allowed"
                    value={selected.summary.paid_attempts_allowed}
                  />

                  <DetailCard
                    label="Paid attempts used"
                    value={selected.summary.paid_attempts_used}
                  />

                  <DetailCard
                    label="Paid attempts remaining"
                    value={selected.summary.paid_attempts_remaining}
                  />

                  <DetailCard
                    label="Free attempts used"
                    value={selected.summary.free_attempts_used}
                  />

                  <DetailCard
                    label="Successful payments total"
                    value={formatMoney(
                      selected.summary.total_successful_payments_kobo
                    )}
                  />

                  <DetailCard
                    label="Latest payment status"
                    value={formatStatus(
                      selected.summary.latest_payment_status
                    )}
                  />

                  <DetailCard
                    label="Latest exam status"
                    value={formatStatus(
                      selected.summary.latest_exam_status
                    )}
                  />
                </div>
              </section>

              {/* Payment history */}
              <section>
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-lg font-bold text-slate-900">
                    Payment history
                  </h3>

                  <span className="text-sm text-slate-500">
                    {selected.payments.length} record(s)
                  </span>
                </div>

                {selected.payments.length === 0 ? (
                  <EmptyMessage>
                    No payment records found for this candidate.
                  </EmptyMessage>
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-slate-200">
                    <table className="w-full min-w-[700px] text-left text-sm">
                      <thead className="bg-slate-50 text-slate-500">
                        <tr>
                          <th className="px-4 py-3">Date</th>
                          <th className="px-4 py-3">Amount</th>
                          <th className="px-4 py-3">Reference</th>
                          <th className="px-4 py-3">Attempts granted</th>
                          <th className="px-4 py-3">Status</th>
                        </tr>
                      </thead>

                      <tbody className="divide-y divide-slate-100">
                        {selected.payments.map((payment) => (
                          <tr key={payment.id}>
                            <td className="whitespace-nowrap px-4 py-3">
                              {formatDate(
                                payment.paid_at ?? payment.created_at
                              )}
                            </td>

                            <td className="whitespace-nowrap px-4 py-3 font-semibold">
                              {formatMoney(
                                payment.amount_kobo,
                                payment.currency
                              )}
                            </td>

                            <td className="max-w-56 break-all px-4 py-3 font-mono text-xs">
                              {payment.paystack_reference}
                            </td>

                            <td className="px-4 py-3">
                              {payment.attempts_granted}
                            </td>

                            <td className="px-4 py-3">
                              <StatusBadge status={payment.status} />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>

              {/* Examination history */}
              <section>
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-lg font-bold text-slate-900">
                    Examination history
                  </h3>

                  <span className="text-sm text-slate-500">
                    {selected.attempts.length} attempt(s)
                  </span>
                </div>

                {selected.attempts.length === 0 ? (
                  <EmptyMessage>
                    No examination attempts found for this candidate.
                  </EmptyMessage>
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-slate-200">
                    <table className="w-full min-w-[800px] text-left text-sm">
                      <thead className="bg-slate-50 text-slate-500">
                        <tr>
                          <th className="px-4 py-3">Attempt</th>
                          <th className="px-4 py-3">Access</th>
                          <th className="px-4 py-3">Score</th>
                          <th className="px-4 py-3">Started</th>
                          <th className="px-4 py-3">Submitted</th>
                          <th className="px-4 py-3">Status</th>
                        </tr>
                      </thead>

                      <tbody className="divide-y divide-slate-100">
                        {selected.attempts.map((attempt, index) => (
                          <tr key={attempt.id}>
                            <td className="px-4 py-3 font-semibold">
                              {attempt.attempt_number ?? index + 1}
                            </td>

                            <td className="px-4 py-3 capitalize">
                              {formatStatus(attempt.access_type)}
                            </td>

                            <td className="whitespace-nowrap px-4 py-3 font-semibold">
                              {attempt.score != null
                                ? `${attempt.score}/${attempt.total_questions}`
                                : "—"}
                            </td>

                            <td className="whitespace-nowrap px-4 py-3">
                              {formatDate(
                                attempt.started_at ?? attempt.created_at
                              )}
                            </td>

                            <td className="whitespace-nowrap px-4 py-3">
                              {formatDate(attempt.submitted_at)}
                            </td>

                            <td className="px-4 py-3">
                              <StatusBadge status={attempt.status} />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            </div>

            <footer className="flex justify-end border-t border-slate-100 p-4 sm:px-8">
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="rounded-xl bg-emerald-800 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-900"
              >
                Close details
              </button>
            </footer>
          </section>
        </div>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  detail,
  icon,
}: {
  label: string;
  value: string | number;
  detail: string;
  icon: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-slate-500">{label}</p>

        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-xl">
          {icon}
        </span>
      </div>

      <p className="mt-3 text-3xl font-bold tracking-tight text-slate-900">
        {value}
      </p>

      <p className="mt-2 text-xs text-slate-500">{detail}</p>
    </div>
  );
}

function DetailCard({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </p>

      <p className="mt-2 break-words text-sm font-semibold capitalize text-slate-900">
        {value}
      </p>
    </div>
  );
}

function EmptyMessage({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500">
      {children}
    </div>
  );
}
