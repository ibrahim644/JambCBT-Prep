import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdminUser } from "@/lib/admin-auth";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

type OverviewCardProps = {
  title: string;
  value: number;
  description: string;
  icon: string;
};

function OverviewCard({
  title,
  value,
  description,
  icon,
}: OverviewCardProps) {
  return (
    <section className="rounded-2xl border border-[#E5EBE6] bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-[#68796F]">{title}</p>
          <p className="mt-3 text-3xl font-bold tracking-tight text-[#173D2B]">
            {value.toLocaleString()}
          </p>
        </div>
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#EFF6F0] text-2xl">
          {icon}
        </div>
      </div>
      <p className="mt-5 border-t border-[#EFF2EF] pt-3 text-sm leading-6 text-[#7A8980]">
        {description}
      </p>
    </section>
  );
}

export default async function AdmissionsDashboardPage() {
  const user = await getAdminUser();

  if (!user) {
    redirect("/admin/login");
  }

  const [
    institutionsResult,
    programmesResult,
    requirementsResult,
    blogResult,
  ] = await Promise.all([
    supabase
      .from("institutions")
      .select("id", { count: "exact", head: true }),

    supabase
      .from("admission_programmes")
      .select("id", { count: "exact", head: true }),

    supabase
      .from("admission_subject_requirements")
      .select("id", { count: "exact", head: true })
      .eq("verification_status", "verified")
      .eq("is_published", true),

    supabase
      .from("blog_posts")
      .select("id", { count: "exact", head: true })
      .eq("status", "published")
      .not("published_at", "is", null)
      .lte("published_at", new Date().toISOString()),
  ]);

  const hasError = Boolean(
    institutionsResult.error ||
      programmesResult.error ||
      requirementsResult.error ||
      blogResult.error
  );

  const cards: OverviewCardProps[] = [
    {
      title: "Institutions",
      value: institutionsResult.count ?? 0,
      description: "Institutions recorded in the admissions database.",
      icon: "🏛️",
    },
    {
      title: "Programmes",
      value: programmesResult.count ?? 0,
      description: "Courses and programmes linked to institutions.",
      icon: "🎓",
    },
    {
      title: "Verified requirements",
      value: requirementsResult.count ?? 0,
      description: "Published, verified UTME subject and O'Level requirements.",
      icon: "✓",
    },
    {
      title: "Published articles",
      value: blogResult.count ?? 0,
      description: "Admission guides and updates currently published.",
      icon: "📰",
    },
  ];

  return (
    <main className="min-h-screen bg-[#F4F7F4] text-[#183B2A]">
      <header className="border-b border-[#E5EBE6] bg-white px-5 py-5 sm:px-8">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4">
          <div>
            <Link
              href="/admin"
              className="text-sm font-medium text-[#52705F] transition hover:text-[#174B33]"
            >
              ← Back to CBT dashboard
            </Link>
            <h1 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">
              Admissions Dashboard
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[#68796F]">
              Manage Nigeria's institution directory, admission requirements,
              cut-off marks, and admission guidance content.
            </p>
          </div>

          <div className="rounded-xl bg-[#174B33] px-4 py-3 text-sm font-semibold text-white">
            Admissions Management
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8">
        {hasError && (
          <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
            Some statistics could not be loaded. Check the Supabase table
            names, columns, and server permissions before proceeding.
          </div>
        )}

        <section>
          <div className="mb-5">
            <h2 className="text-lg font-bold">Platform overview</h2>
            <p className="mt-1 text-sm text-[#68796F]">
              Current records in your admissions database.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {cards.map((card) => (
              <OverviewCard key={card.title} {...card} />
            ))}
          </div>
        </section>

        <section className="mt-9 rounded-2xl border border-[#E5EBE6] bg-white p-5 shadow-sm sm:p-7">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#EFF6F0] text-2xl">
              🛠️
            </div>
            <div>
              <h2 className="text-lg font-bold">Next: admissions management tools</h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-[#68796F]">
                This overview is connected to your database. The management
                forms will be added next, beginning with institutions, followed
                by programmes, admission requirements, cut-off marks, and blog
                publishing.
              </p>
            </div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                title: "Institution directory",
                description: "Add institutions, ownership, locations, and official links.",
                number: "01",
              },
              {
                title: "Programmes and courses",
                description: "Connect each course to its institution.",
                number: "02",
              },
              {
                title: "Requirements and cut-offs",
                description: "Manage year-specific, source-verified admission data.",
                number: "03",
              },
              {
                title: "Eligibility checker data",
                description: "Prepare verified rules for comparing candidate results.",
                number: "04",
              },
              {
                title: "Blog and admission updates",
                description: "Prepare articles for review and publication.",
                number: "05",
              },
              {
                title: "Verification records",
                description: "Track sources and when admission information was checked.",
                number: "06",
              },
            ].map((item) => (
              <div
                key={item.number}
                className="rounded-xl border border-[#E5EBE6] bg-[#FAFCFA] p-4"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#174B33] text-xs font-bold text-white">
                    {item.number}
                  </span>
                  <h3 className="font-semibold text-[#183B2A]">
                    {item.title}
                  </h3>
                </div>
                <p className="mt-3 text-sm leading-6 text-[#68796F]">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </section>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/admin"
            className="rounded-xl border border-[#DCE6DE] bg-white px-5 py-3 text-sm font-semibold text-[#174B33] transition hover:bg-[#F4F7F4]"
          >
            Return to CBT dashboard
          </Link>
          <Link
            href="/admin/subjects"
            className="rounded-xl bg-[#174B33] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#123D2B]"
          >
            Manage CBT subjects
          </Link>
        </div>
      </div>
    </main>
  );
}
