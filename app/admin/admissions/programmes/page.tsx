import { redirect } from "next/navigation";
import Link from "next/link";
import { getAdminUser } from "@/lib/admin-auth";
import { supabase } from "@/lib/supabase";
import ProgrammeManager from "./programme-manager";

export const dynamic = "force-dynamic";

export default async function AdminProgrammesPage() {
  const admin = await getAdminUser();

  if (!admin) {
    redirect("/admin/login");
  }

  const [{ data: programmes }, { data: institutions }] = await Promise.all([
    supabase
      .from("admission_programmes")
      .select(`
        id,
        institution_id,
        course_name,
        course_slug,
        faculty,
        department,
        award_type,
        study_mode,
        duration_years,
        is_published,
        created_at
      `)
      .order("course_name"),
    supabase
      .from("institutions")
      .select("id, name, institution_type, state, is_published")
      .order("name"),
  ]);

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-900 sm:px-8">
      <div className="mx-auto max-w-7xl">
        <Link
          href="/admin/admissions"
          className="mb-6 inline-flex text-sm font-semibold text-emerald-800 hover:text-emerald-600"
        >
          ← Back to Admissions Dashboard
        </Link>

        <header className="mb-8 rounded-2xl bg-emerald-950 p-6 text-white sm:p-8">
          <p className="text-sm font-semibold uppercase tracking-widest text-emerald-300">
            Admissions Management
          </p>
          <h1 className="mt-2 text-3xl font-bold sm:text-4xl">
            Programme Management
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-emerald-100 sm:text-base">
            Manage courses and programmes offered by institutions across
            Nigeria. Each programme can later receive its own UTME subjects,
            O&apos;Level requirements, admission cutoffs, and eligibility rules.
          </p>
        </header>

        <ProgrammeManager
          initialProgrammes={programmes ?? []}
          institutions={institutions ?? []}
        />
      </div>
    </main>
  );
}
