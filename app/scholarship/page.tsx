import type { Metadata } from "next";
import Link from "next/link";
import ScholarshipForm from "./scholarship-form";

export const metadata: Metadata = {
  title: "Scholarship | JAMB Ready",
  description:
    "Apply for a JAMB Ready scholarship and keep building your confidence through CBT practice.",
};

export default function ScholarshipPage() {
  return (
    <main className="min-h-screen bg-[#F7F8F2] text-[#14291F]">
      <header className="border-b border-[#E7EAE1] bg-white/80">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5 sm:px-8">
          <Link href="/" className="text-lg font-extrabold tracking-tight">
            Jamb<span className="text-[#477C4F]">Ready</span>
          </Link>
          <Link
            href="/"
            className="text-sm font-bold text-[#31573A] transition hover:text-[#477C4F]"
          >
            Back to home
          </Link>
        </div>
      </header>

      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-12 sm:px-8 sm:py-16 lg:grid-cols-[0.85fr_1.15fr] lg:gap-16 lg:py-20">
        <section>
          <span className="inline-flex items-center gap-2 rounded-full border border-[#D8E5D2] bg-[#EAF1E3] px-4 py-2 text-xs font-extrabold uppercase tracking-[0.16em] text-[#315D3B]">
            JAMB Ready scholarship
          </span>
          <h1 className="mt-6 max-w-xl text-4xl font-black leading-tight tracking-[-0.045em] text-[#193724] sm:text-5xl">
            Keep practising. Your effort can open doors.
          </h1>
          <p className="mt-5 max-w-lg text-base leading-7 text-[#647563]">
            We want to encourage committed candidates as they prepare for their
            next step. Tell us a little about yourself to apply.
          </p>

          <div className="mt-8 rounded-3xl border border-[#DCE7D8] bg-white p-6 shadow-sm sm:p-7">
            <div className="flex gap-4">
              <span
                aria-hidden="true"
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#EAF1E3] text-xl text-[#477C4F]"
              >
                ✓
              </span>
              <div>
                <h2 className="font-extrabold text-[#213D2A]">
                  Every practice attempt counts
                </h2>
                <p className="mt-2 text-sm leading-6 text-[#748074]">
                  Scholarship consideration includes your commitment to
                  preparation. Completing more CBT practice can give your
                  application a stronger chance, though awards are not
                  guaranteed.
                </p>
              </div>
            </div>
          </div>

          <p className="mt-5 max-w-lg text-xs leading-5 text-[#879287]">
            Your application details, including your NIN, are sent securely for
            review and are not shown on the confirmation screen.
          </p>
        </section>

        <section className="rounded-[2rem] border border-[#E2E9DC] bg-white p-6 shadow-[0_20px_60px_rgba(34,65,41,0.07)] sm:p-9">
          <div className="mb-7">
            <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-[#608B52]">
              Scholarship application
            </p>
            <h2 className="mt-2 text-2xl font-black tracking-tight text-[#193724]">
              Applicant details
            </h2>
            <p className="mt-2 text-sm leading-6 text-[#748074]">
              Complete each field so we can review your application.
            </p>
          </div>
          <ScholarshipForm />
        </section>
      </div>
    </main>
  );
}
