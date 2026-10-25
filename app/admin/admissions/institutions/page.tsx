import { redirect } from "next/navigation";
import Link from "next/link";
import { getAdminUser } from "@/lib/admin-auth";
import { supabase } from "@/lib/supabase";
import InstitutionManager, { type InstitutionItem } from "./institution-manager";

export const dynamic = "force-dynamic";

export default async function InstitutionsPage() {
  const admin = await getAdminUser();

  if (!admin) redirect("/admin/login");

  const { data, error } = await supabase
    .from("institutions")
    .select("id, name, slug, institution_type, ownership, state, local_government_area, town, official_website, admissions_url, jamb_recognition_status, verification_source_url, is_published, created_at")
    .order("name", { ascending: true });

  if (error) console.error("Could not load institutions:", error.message);

  return (
    <main className="min-h-screen bg-[#F5F8F5] px-4 py-8 text-[#183B2A] sm:px-6 lg:px-10">
      <div className="mx-auto max-w-[1600px] space-y-7">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Link href="/admin/admissions" className="text-sm font-semibold text-[#347653] hover:underline">
              ← Back to Admissions
            </Link>
            <p className="mt-5 text-xs font-bold uppercase tracking-[0.2em] text-[#568269]">
              Admissions management
            </p>
            <h1 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">
              Institution Directory
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[#68796F]">
              Manage Nigerian universities, polytechnics, Colleges of Education, FCEs and other tertiary institutions.
            </p>
          </div>
          <Link href="/admin" className="inline-flex items-center justify-center rounded-xl border border-[#D9E3DB] bg-white px-5 py-3 text-sm font-semibold hover:bg-[#EEF4EF]">
            Admin dashboard
          </Link>
        </div>

        {error && (
          <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            The institution list could not be loaded. Check the server logs and database configuration.
          </p>
        )}

        <InstitutionManager initialInstitutions={(data ?? []) as InstitutionItem[]} />
      </div>
    </main>
  );
}

