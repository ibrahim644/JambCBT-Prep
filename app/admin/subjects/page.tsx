import { redirect } from "next/navigation";
import Link from "next/link";
import { getAdminUser } from "@/lib/admin-auth";
import { supabase } from "@/lib/supabase";
import SubjectsManager, { type SubjectItem } from "./subjects-manager";

export const dynamic = "force-dynamic";

export default async function AdminSubjectsPage() {
  const user = await getAdminUser();
  if (!user) redirect("/admin/login");

  const [{ data: subjects, error: subjectError }, { data: questions, error: questionError }] =
    await Promise.all([
      supabase.from("subjects").select("id, code, name, is_active").order("name"),
      supabase.from("questions").select("subject_id, is_published, needs_review"),
    ]);

  const subjectItems: SubjectItem[] = (subjects ?? []).map((subject) => {
    const related = (questions ?? []).filter((q) => q.subject_id === subject.id);
    return {
      id: subject.id,
      code: subject.code,
      name: subject.name,
      is_active: subject.is_active,
      totalQuestions: related.length,
      publishedQuestions: related.filter((q) => q.is_published && !q.needs_review).length,
      reviewQuestions: related.filter((q) => !q.is_published || q.needs_review).length,
    };
  });

  return (
    <main className="min-h-screen bg-[#F4F7F4] text-[#183B2A]">
      <header className="border-b border-[#E5EBE6] bg-white px-5 py-5 sm:px-8">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <div>
            <Link href="/admin" className="text-sm font-medium text-[#52705F] hover:text-[#174B33]">
              ← Back to dashboard
            </Link>
            <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">Subject Management</h1>
            <p className="mt-1 text-sm text-[#68796F]">Manage examination subjects and question-bank readiness.</p>
          </div>
          <Link href="/admin/questions" className="rounded-xl border border-[#DCE6DE] bg-white px-4 py-2.5 text-sm font-semibold hover:bg-[#F4F7F4]">
            Review questions
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8">
        {(subjectError || questionError) && (
          <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            Could not load all subject data. Refresh the page or check the database schema.
          </div>
        )}
        <SubjectsManager initialSubjects={subjectItems} />
      </div>
    </main>
  );
}
