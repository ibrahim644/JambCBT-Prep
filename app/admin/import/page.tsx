import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdminUser } from "@/lib/admin-auth";
import { supabase } from "@/lib/supabase";
import PdfImportForm from "./pdf-import-form";

export const dynamic = "force-dynamic";

export default async function AdminPdfImportPage() {
  const admin = await getAdminUser();
  if (!admin) redirect("/admin/login");

  const { data: subjects, error } = await supabase
    .from("subjects")
    .select("id, code, name")
    .order("name");

  return (
    <main className="min-h-screen bg-[#F4F7F4] text-[#183B2A]">
      <header className="border-b border-[#E5EBE6] bg-white px-5 py-6 sm:px-8">
        <div className="mx-auto max-w-5xl">
          <Link href="/admin" className="text-sm font-medium text-[#52705F] hover:text-[#174B33]">
            ← Back to dashboard
          </Link>
          <h1 className="mt-3 text-3xl font-bold tracking-tight">PDF Question Import</h1>
          <p className="mt-2 text-sm text-[#68796F]">
            Upload a question bank and import its questions for review.
          </p>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-5 py-8 sm:px-8">
        {error ? (
          <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            Could not load subjects. Please refresh or check the database.
          </div>
        ) : (
          <PdfImportForm subjects={subjects ?? []} />
        )}
      </div>
    </main>
  );
}
