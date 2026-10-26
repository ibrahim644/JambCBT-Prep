
import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdminUser } from "@/lib/admin-auth";
import { supabase } from "@/lib/supabase";
import AdminLogoutButton from "./admin-logout-button";

export const dynamic = "force-dynamic";

function Icon({
  name,
  className = "h-5 w-5",
}: {
  name: "grid" | "book" | "layers" | "clock" | "shield" | "arrow";
  className?: string;
}) {
  const common = {
    className,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.7,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true as const,
  };

  switch (name) {
    case "grid":
      return (
        <svg {...common}>
          <rect x="3" y="3" width="7" height="7" rx="1.5" />
          <rect x="14" y="3" width="7" height="7" rx="1.5" />
          <rect x="3" y="14" width="7" height="7" rx="1.5" />
          <rect x="14" y="14" width="7" height="7" rx="1.5" />
        </svg>
      );
    case "book":
      return (
        <svg {...common}>
          <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21.5v-16Z" />
          <path d="M4 5.5v16M8 7h8m-8 4h8" />
        </svg>
      );
    case "layers":
      return (
        <svg {...common}>
          <path d="m12 3 9 5-9 5-9-5 9-5Z" />
          <path d="m3 12 9 5 9-5M3 16l9 5 9-5" />
        </svg>
      );
    case "clock":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 2" />
        </svg>
      );
    case "shield":
      return (
        <svg {...common}>
          <path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Z" />
          <path d="m9 12 2 2 4-4" />
        </svg>
      );
    case "arrow":
      return (
        <svg {...common}>
          <path d="M7 17 17 7M7 7h10v10" />
        </svg>
      );
  }
}

function StatCard({
  label,
  value,
  description,
  icon,
  accent = false,
}: {
  label: string;
  value: number;
  description: string;
  icon: "book" | "layers" | "clock" | "shield";
  accent?: boolean;
}) {
  return (
    <section className="rounded-2xl border border-[#E5EBE6] bg-white p-5 shadow-[0_3px_15px_rgba(18,61,43,0.025)] transition duration-200 hover:-translate-y-0.5 hover:shadow-md sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-[#68796F]">{label}</p>
          <p className="mt-3 text-3xl font-bold tracking-tight text-[#173D2B] sm:text-4xl">
            {value.toLocaleString()}
          </p>
        </div>
        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
            accent
              ? "bg-[#174B33] text-white"
              : "bg-[#EFF6F0] text-[#286344]"
          }`}
        >
          <Icon name={icon} className="h-5 w-5" />
        </div>
      </div>
      <div className="mt-5 border-t border-[#EFF2EF] pt-3">
        <p className="text-xs leading-5 text-[#7A8980]">{description}</p>
      </div>
    </section>
  );
}

export default async function AdminDashboardPage() {
  const user = await getAdminUser();

  if (!user) {
    redirect("/admin/login");
  }

  const [
    subjectsResult,
    totalResult,
    unpublishedResult,
    reviewResult,
    importsResult,
  ] = await Promise.all([
    supabase.from("subjects").select("id", { count: "exact", head: true }),
    supabase.from("questions").select("id", { count: "exact", head: true }),
    supabase
      .from("questions")
      .select("id", { count: "exact", head: true })
      .eq("is_published", false),
    supabase
      .from("questions")
      .select("id", { count: "exact", head: true })
      .eq("needs_review", true),
    supabase
      .from("import_jobs")
      .select(
        "id, source_file, subject_id, status, questions_detected, questions_imported, questions_skipped, questions_needing_review, started_at, completed_at, error_message"
      )
      .order("started_at", { ascending: false })
      .limit(10),
  ]);

  const recentImports = importsResult.data ?? [];
  const subjectIds = [
    ...new Set(recentImports.map((job) => job.subject_id).filter(Boolean)),
  ];

  const subjectsResultForImports =
    subjectIds.length > 0
      ? await supabase
          .from("subjects")
          .select("id, code, name")
          .in("id", subjectIds)
      : { data: [] };

  const subjectById = new Map(
    (subjectsResultForImports.data ?? []).map((subject) => [
      subject.id,
      `${subject.code} â€” ${subject.name}`,
    ])
  );

  const statsFailed = Boolean(
    subjectsResult.error ||
      totalResult.error ||
      unpublishedResult.error ||
      reviewResult.error ||
      importsResult.error
  );

  const displayName = user.email?.split("@")[0] ?? "Administrator";

  return (
    <main className="min-h-screen bg-[#F4F7F4] text-[#183B2A] md:grid md:grid-cols-[252px_minmax(0,1fr)]">
      {/* Sidebar */}
      <aside className="flex flex-col bg-[#123D2B] text-white md:sticky md:top-0 md:h-screen">
        <div className="flex items-center gap-3 border-b border-white/10 px-5 py-5 sm:px-7 md:px-6">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-[#174B33] shadow-sm">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              className="h-6 w-6"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="m3 8 9-4.5L21 8l-9 4.5L3 8Z" />
              <path d="M6 10v5c3.6 2.7 8.4 2.7 12 0v-5M21 8v6" />
            </svg>
          </div>
          <div>
            <p className="text-base font-bold tracking-tight">JAMB CBT</p>
            <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.19em] text-[#B9D8C2]">
              Administration
            </p>
          </div>
        </div>

        <div className="px-4 pt-6">
          <p className="px-3 pb-3 text-[10px] font-bold uppercase tracking-[0.2em] text-white/40">
            Workspace
          </p>
          <nav className="flex flex-wrap gap-2 md:flex-col">
            <Link
              href="/admin"
              className="flex items-center gap-3 rounded-xl bg-white/12 px-3.5 py-3 text-sm font-semibold text-white ring-1 ring-white/10"
            >
              <Icon name="grid" className="h-[18px] w-[18px]" />
              Dashboard
              <span className="ml-auto h-1.5 w-1.5 rounded-full bg-[#B9D8C2]" />
            </Link>

            
<Link
  href="/admin/questions"
  className="flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm text-white/75 transition hover:bg-white/10 hover:text-white"
>
  <Icon name="book" className="h-[18px] w-[18px]" />
  Question review
</Link>

            <Link
              href="/admin/import"
              className="flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm text-white/75 transition hover:bg-white/10 hover:text-white"
            >
              <Icon name="arrow" className="h-[18px] w-[18px]" />
              Import PDF
            </Link>

            <Link
              href="/admin/subjects"
              className="flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm text-white/75 transition hover:bg-white/10 hover:text-white"
            >
              <Icon name="layers" className="h-[18px] w-[18px]" />
              Subjects
            </Link>

            <a
              href="#recent-imports"
              className="flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm text-white/75 transition hover:bg-white/8 hover:text-white"
            >
              <Icon name="clock" className="h-[18px] w-[18px]" />
              Import history
            </a>

            <Link
  href="/admin/candidates"
  className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-white/80 transition hover:bg-white/10 hover:text-white"
>
  <span aria-hidden="true">👥</span>
  <span>Registered Candidates</span>
</Link>
          </nav>
        </div>

        <div className="mt-6 border-t border-white/10 px-4 pt-5 md:mt-auto md:mb-5">
          <div className="mb-4 flex items-center gap-3 rounded-xl bg-white/[0.06] p-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#DCEBE0] text-sm font-bold uppercase text-[#174B33]">
              {displayName.charAt(0)}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-white">
                {displayName}
              </p>
              <p className="mt-0.5 text-xs text-white/50">Administrator</p>
            </div>
          </div>
          <AdminLogoutButton />
          <p className="mt-5 px-1 text-[10px] leading-5 text-white/35">
            JAMB CBT Administration
            <br />
            Secure content management
          </p>
        </div>
      </aside>

      {/* Main content */}
      <div className="min-w-0">
        <header className="border-b border-[#E5EBE6] bg-white/90 px-5 py-5 sm:px-8 lg:px-10">
          <div className="mx-auto flex max-w-[1500px] flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#6F8175]">
                Workspace / Overview
              </p>
              <h1 className="mt-2 text-2xl font-bold tracking-tight text-[#173D2B] sm:text-3xl">
                Dashboard
              </h1>
              <p className="mt-1.5 text-sm text-[#718076]">
                Your question bank, at a glance.
              </p>
            </div>
            <div className="flex items-center gap-2 rounded-xl border border-[#DCE9DF] bg-[#F2F8F3] px-3.5 py-2.5">
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#3E8A5D] opacity-30" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[#3E8A5D]" />
              </span>
              <span className="text-xs font-semibold text-[#286344]">
                Admin session active
              </span>
            </div>
          </div>
        </header>

        <div className="mx-auto max-w-[1500px] space-y-8 px-5 py-7 sm:px-8 sm:py-9 lg:px-10">
          {statsFailed && (
            <div
              role="alert"
              className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
            >
              Some dashboard data could not be loaded. Check your server
              terminal for the database error.
            </div>
          )}

          {/* Overview */}
          <section>
            <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-[#183B2A]">
                  Question bank overview
                </h2>
                <p className="mt-1 text-sm text-[#78867D]">
                  Monitor your content and review progress.
                </p>
              </div>
              <span className="text-xs text-[#829087]">
                Live database counts
              </span>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard
                label="Total questions"
                value={totalResult.count ?? 0}
                description="All questions in your database"
                icon="book"
                accent
              />
              <StatCard
                label="Subjects"
                value={subjectsResult.count ?? 0}
                description="Subjects registered in the platform"
                icon="layers"
              />
              <StatCard
                label="Awaiting review"
                value={reviewResult.count ?? 0}
                description="Questions requiring verification"
                icon="clock"
              />
              <StatCard
                label="Unpublished"
                value={unpublishedResult.count ?? 0}
                description="Questions not yet available to candidates"
                icon="shield"
              />
            </div>
          </section>

          {/* Review status banner */}
          <section className="relative overflow-hidden rounded-2xl bg-[#174B33] p-6 text-white shadow-[0_12px_35px_rgba(23,75,51,0.12)] sm:p-8">
            <div className="pointer-events-none absolute -right-12 -top-24 h-64 w-64 rounded-full border border-white/10" />
            <div className="pointer-events-none absolute -right-1 -top-12 h-40 w-40 rounded-full border border-white/10" />
            <div className="relative flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
              <div className="max-w-2xl">
                <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-[#D5E9DB]">
                  <Icon name="shield" className="h-4 w-4" />
                  Content quality control
                </div>
                <h2 className="text-xl font-bold tracking-tight sm:text-2xl">
                  Keep your question bank accurate.
                </h2>
                <p className="mt-2 max-w-xl text-sm leading-6 text-white/70">
                  Imported questions should be checked for text accuracy,
                  answer options, and correct answers before they are
                  published to candidates.
                </p>
              </div>
              <div className="shrink-0 rounded-xl border border-white/15 bg-white/[0.07] p-4 sm:min-w-40">
                <p className="text-xs text-white/65">Needs your attention</p>
                <p className="mt-1 text-3xl font-bold">
                  {(reviewResult.count ?? 0).toLocaleString()}
                </p>
                <p className="mt-1 text-xs text-[#D5E9DB]">
                  Questions to verify
                </p>
              </div>
            </div>
          </section>

          {/* Import history */}
          <section
            id="recent-imports"
            className="overflow-hidden rounded-2xl border border-[#E5EBE6] bg-white shadow-[0_3px_15px_rgba(18,61,43,0.025)]"
          >
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#EAF0EB] px-5 py-5 sm:px-6">
              <div>
                <h2 className="text-base font-bold text-[#183B2A]">
                  Recent PDF imports
                </h2>
                <p className="mt-1 text-sm text-[#7A8980]">
                  Track imported files and their review status.
                </p>
              </div>
              <span className="rounded-lg border border-[#E0EAE2] bg-[#F4F8F4] px-3 py-2 text-xs font-semibold text-[#286344]">
                {recentImports.length} recent{" "}
                {recentImports.length === 1 ? "job" : "jobs"}
              </span>
            </div>

            {recentImports.length === 0 ? (
              <div className="px-6 py-14 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#EFF6F0] text-[#286344]">
                  <Icon name="book" className="h-6 w-6" />
                </div>
                <p className="mt-4 font-semibold text-[#183B2A]">
                  No import jobs yet
                </p>
                <p className="mt-1 text-sm text-[#7A8980]">
                  Your PDF import activity will appear here.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[850px] text-left text-sm">
                  <thead className="bg-[#F7F9F7] text-xs uppercase tracking-wide text-[#748278]">
                    <tr>
                      <th className="px-5 py-4 font-semibold sm:px-6">Source file</th>
                      <th className="px-5 py-4 font-semibold">Subject</th>
                      <th className="px-5 py-4 font-semibold">Status</th>
                      <th className="px-5 py-4 font-semibold">Detected</th>
                      <th className="px-5 py-4 font-semibold">Imported</th>
                      <th className="px-5 py-4 font-semibold">Review</th>
                      <th className="px-5 py-4 font-semibold">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EDF1ED]">
                    {recentImports.map((job) => {
                      const status = (job.status ?? "unknown").toLowerCase();
                      const successful = status === "completed" || status === "success";
                      const failed = status === "failed" || Boolean(job.error_message);

                      return (
                        <tr
                          key={job.id}
                          className="transition hover:bg-[#FAFCFA]"
                        >
                          <td className="max-w-[260px] px-5 py-4 sm:px-6">
                            <p
                              title={job.source_file ?? ""}
                              className="truncate font-semibold text-[#294638]"
                            >
                              {job.source_file ?? "Unnamed file"}
                            </p>
                            <p className="mt-1 text-xs text-[#95A097]">
                              PDF document
                            </p>
                          </td>
                          <td className="px-5 py-4 text-[#66766B]">
                            {subjectById.get(job.subject_id) ?? "Unknown subject"}
                          </td>
                          <td className="px-5 py-4">
                            <span
                              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs font-semibold ${
                                failed
                                  ? "bg-red-50 text-red-700"
                                  : successful
                                    ? "bg-[#EAF5EC] text-[#286344]"
                                    : "bg-amber-50 text-amber-700"
                              }`}
                            >
                              <span
                                className={`h-1.5 w-1.5 rounded-full ${
                                  failed
                                    ? "bg-red-500"
                                    : successful
                                      ? "bg-[#398052]"
                                      : "bg-amber-500"
                                }`}
                              />
                              {job.status ?? "Unknown"}
                            </span>
                          </td>
                          <td className="px-5 py-4 tabular-nums text-[#526258]">
                            {(job.questions_detected ?? 0).toLocaleString()}
                          </td>
                          <td className="px-5 py-4 tabular-nums font-semibold text-[#286344]">
                            {(job.questions_imported ?? 0).toLocaleString()}
                          </td>
                          <td className="px-5 py-4 tabular-nums text-[#526258]">
                            {(job.questions_needing_review ?? 0).toLocaleString()}
                          </td>
                          <td className="whitespace-nowrap px-5 py-4 text-xs text-[#7A8980]">
                            {job.started_at
                              ? new Date(job.started_at).toLocaleDateString()
                              : "â€”"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            <div className="border-t border-[#EAF0EB] bg-[#FBFCFB] px-5 py-3.5 sm:px-6">
              <p className="text-xs leading-5 text-[#849087]">
                Imported questions remain unpublished until reviewed and
                approved. Import history displays the latest 10 jobs.
              </p>
            </div>
          </section>

          <footer className="flex flex-wrap items-center justify-between gap-2 pb-2 text-xs text-[#8A968D]">
            <p>JAMB CBT Â· Administration workspace</p>
            <p className="flex items-center gap-1.5">
              <Icon name="shield" className="h-3.5 w-3.5" />
              Restricted admin area
            </p>
          </footer>
        </div>
      </div>
    </main>
  );
}



