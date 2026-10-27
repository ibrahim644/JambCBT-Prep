
import { redirect } from "next/navigation";
import Link from "next/link";
import { getAdminUser } from "@/lib/admin-auth";
import { supabase } from "@/lib/supabase";
import QuestionReviewClient, {
  type ReviewQuestion,
} from "./question-review-client";

export const dynamic = "force-dynamic";

export default async function QuestionReviewPage() {
  const user = await getAdminUser();

  if (!user) {
    redirect("/admin/login");
  }

  const { data, error } = await supabase
    .from("questions")
    .select(
  "id, question_text, passage, instructions, options, correct_option, explanation, source_file, needs_review, review_note, is_published"
)
    .eq("is_published", false)
    .order("needs_review", { ascending: false })
    .order("created_at", { ascending: true })
    .limit(25);

  const questions = (data ?? []) as unknown as ReviewQuestion[];

  return (
    <main className="min-h-screen bg-[#F4F7F4] text-[#183B2A]">
      <header className="border-b border-[#E5EBE6] bg-white px-5 py-5 sm:px-8">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <div>
            <Link
              href="/admin"
              className="text-sm font-medium text-[#39734F] hover:underline"
            >
              ← Back to dashboard
            </Link>
            <h1 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">
              Question review
            </h1>
            <p className="mt-1 text-sm text-[#718076]">
              Verify imported questions before making them available to candidates.
            </p>
          </div>

          <div className="rounded-xl bg-[#EAF5EC] px-4 py-3 text-right">
            <p className="text-xs text-[#52715D]">Questions shown</p>
            <p className="text-2xl font-bold text-[#174B33]">
              {questions.length}
            </p>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-5 py-8 sm:px-8">
        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-800">
            Could not load questions. Check the server terminal for the database error.
          </div>
        ) : (
          <>
            <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-5">
              <h2 className="font-semibold text-amber-900">
                Review carefully before publishing
              </h2>
              <p className="mt-1 text-sm leading-6 text-amber-800">
                Confirm the question wording, all four options, and the correct
                answer against the original past-question PDF. Saving a draft
                will not publish it.
              </p>
            </div>

            <QuestionReviewClient initialQuestions={questions} />
          </>
        )}
      </div>
    </main>
  );
}
