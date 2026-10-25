
"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";

export default function AdminLoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");
    setLoading(true);

    try {
      const supabase = createSupabaseBrowserClient();

      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setErrorMessage("Login failed. Please check your email and password.");
        return;
      }

      router.replace("/admin");
      router.refresh();
    } catch {
      setErrorMessage(
        "Unable to connect right now. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#F3F7F4] px-4 py-8 sm:px-6">
      <div className="pointer-events-none absolute -left-28 -top-28 h-80 w-80 rounded-full bg-[#DCEBE0] opacity-70 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -right-20 h-96 w-96 rounded-full bg-[#DDEAE1] opacity-70 blur-3xl" />

      <div className="relative grid w-full max-w-5xl overflow-hidden rounded-3xl border border-white bg-white shadow-[0_25px_80px_-25px_rgba(18,61,43,0.22)] md:min-h-[610px] md:grid-cols-2">
        {/* Branding panel */}
        <section className="relative flex min-h-[250px] flex-col justify-between overflow-hidden bg-[#123D2B] p-7 text-white sm:p-10 md:p-12">
          <div className="pointer-events-none absolute -right-20 -top-16 h-64 w-64 rounded-full border border-white/10" />
          <div className="pointer-events-none absolute -right-8 -top-4 h-40 w-40 rounded-full border border-white/10" />
          <div className="pointer-events-none absolute -bottom-24 -left-16 h-64 w-64 rounded-full bg-white/[0.04]" />

          <div className="relative">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/20 bg-white/10">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                className="h-7 w-7"
                aria-hidden="true"
              >
                <path
                  d="M3 8.5 12 4l9 4.5-9 4.5-9-4.5Z"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinejoin="round"
                />
                <path
                  d="M6.5 10.5v5c3.3 2.7 7.7 2.7 11 0v-5M21 9v6"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>

            <p className="mt-5 text-xs font-semibold uppercase tracking-[0.28em] text-[#B9D8C2]">
              JAMB CBT PLATFORM
            </p>

            <h1 className="mt-4 max-w-md text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
              Better preparation.
              <span className="mt-1 block text-[#B9D8C2]">
                Better possibilities.
              </span>
            </h1>

            <p className="mt-5 max-w-sm text-sm leading-7 text-white/70 sm:text-base">
              Manage your question bank, review past questions, and maintain
              the quality of every practice exam from one secure workspace.
            </p>
          </div>

          <div className="relative mt-8 hidden rounded-2xl border border-white/15 bg-white/[0.07] p-5 sm:block">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#B9D8C2]/15 text-[#B9D8C2]">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  className="h-5 w-5"
                  aria-hidden="true"
                >
                  <path
                    d="m5 12 4 4L19 6"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold">Quality-controlled content</p>
                <p className="mt-1 text-xs text-white/60">
                  Review questions before they go live.
                </p>
              </div>
            </div>
          </div>

          <p className="relative mt-6 text-xs text-white/45">
            Secure administration · Built for focused learning
          </p>
        </section>

        {/* Login form */}
        <section className="flex items-center justify-center px-6 py-10 sm:px-10 md:px-12">
          <div className="w-full max-w-sm">
            <div className="mb-8">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#D6E8DB] bg-[#F0F7F2] px-3 py-1.5 text-xs font-semibold text-[#245B3D]">
                <span className="h-2 w-2 rounded-full bg-[#2D7650]" />
                ADMINISTRATOR ACCESS
              </div>

              <h2 className="text-3xl font-bold tracking-tight text-[#183B2A]">
                Welcome back
              </h2>
              <p className="mt-3 text-sm leading-6 text-slate-500">
                Sign in to continue to your administration dashboard.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label
                  htmlFor="email"
                  className="mb-2 block text-sm font-semibold text-[#294638]"
                >
                  Email address
                </label>
                <input
                  id="email"
                  type="email"
                  autoComplete="username"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="admin@example.com"
                  className="w-full rounded-xl border border-slate-200 bg-[#FBFCFB] px-4 py-3.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#397653] focus:bg-white focus:ring-4 focus:ring-[#397653]/10"
                />
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between gap-3">
                  <label
                    htmlFor="password"
                    className="block text-sm font-semibold text-[#294638]"
                  >
                    Password
                  </label>
                  <span className="text-xs text-slate-400">
                    Keep it private
                  </span>
                </div>
                <input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Enter your password"
                  className="w-full rounded-xl border border-slate-200 bg-[#FBFCFB] px-4 py-3.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#397653] focus:bg-white focus:ring-4 focus:ring-[#397653]/10"
                />
              </div>

              {errorMessage && (
                <p
                  role="alert"
                  className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
                >
                  {errorMessage}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="group flex w-full items-center justify-center gap-3 rounded-xl bg-[#174B33] px-4 py-3.5 text-sm font-semibold text-white shadow-lg shadow-[#174B33]/15 transition hover:-translate-y-0.5 hover:bg-[#103B28] hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
              >
                {loading ? "Signing you in..." : "Sign in to dashboard"}
                {!loading && (
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    className="h-4 w-4 transition group-hover:translate-x-1"
                    aria-hidden="true"
                  >
                    <path
                      d="M5 12h14m-6-6 6 6-6 6"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
              </button>
            </form>

            <div className="mt-8 flex items-start gap-3 rounded-xl bg-[#F3F7F4] p-4">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                className="mt-0.5 h-5 w-5 shrink-0 text-[#2D7650]"
                aria-hidden="true"
              >
                <rect
                  x="5"
                  y="10"
                  width="14"
                  height="10"
                  rx="2"
                  stroke="currentColor"
                  strokeWidth="1.7"
                />
                <path
                  d="M8 10V7a4 4 0 0 1 8 0v3m-4 4v2"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                />
              </svg>
              <p className="text-xs leading-5 text-slate-600">
                This area is reserved for authorized administrators. Your
                credentials should never be shared with candidates.
              </p>
            </div>

            <p className="mt-7 text-center text-xs text-slate-400">
              JAMB CBT · Administration Portal
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
