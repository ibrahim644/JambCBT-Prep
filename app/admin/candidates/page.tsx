
import { redirect } from "next/navigation";
import Link from "next/link";
import { getAdminUser } from "@/lib/admin-auth";
import CandidatesDashboard from "./candidates-dashboard";

export const dynamic = "force-dynamic";

export default async function AdminCandidatesPage() {
  const admin = await getAdminUser();

  if (!admin) {
    redirect("/admin/login");
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 text-slate-900 sm:px-6 lg:px-10">
      <div className="mx-auto w-full max-w-[1600px]">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <Link
              href="/admin"
              className="mb-2 inline-flex text-sm font-medium text-emerald-700 hover:text-emerald-900"
            >
              ← Back to Admin
            </Link>
            <h1 className="text-3xl font-bold tracking-tight">
              Candidate Management
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              Candidate profiles, payments, examination attempts, and results.
            </p>
          </div>
          <div className="rounded-xl border border-emerald-100 bg-white px-4 py-3 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Management
            </p>
            <p className="mt-1 font-semibold text-emerald-800">
              Candidate Records
            </p>
          </div>
        </div>

        <CandidatesDashboard />
      </div>
    </main>
  );
}
