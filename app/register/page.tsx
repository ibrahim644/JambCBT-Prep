import { supabase } from "@/lib/supabase";
import RegistrationForm from "./registration-form";

export const dynamic = "force-dynamic";

export default async function RegisterPage() {
  const { data: subjects, error } = await supabase
    .from("subjects")
    .select("id, name, code")
    .eq("is_active", true)
    .order("name", { ascending: true });

  return (
    <main className="min-h-screen w-full max-w-none bg-slate-50 px-4 py-8 text-slate-900 sm:px-6 lg:px-10">
      <div className="mx-auto w-full max-w-none">
        <header className="mb-8 text-center">
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-green-700">
            JAMB CBT Practice
          </p>
          <h1 className="mt-3 text-3xl font-bold sm:text-4xl">
            Candidate registration
          </h1>
          <p className="mt-3 text-slate-600">
            Enter your details and select the four subjects you want to practise.
          </p>
        </header>

        {error ? (
          <div className="mx-auto w-full rounded-xl border border-red-200 bg-red-50 p-5 text-red-800">
            We could not load the available subjects. Please try again later.
          </div>
        ) : !subjects || subjects.length < 4 ? (
          <div className="mx-auto w-full rounded-xl border border-amber-200 bg-amber-50 p-5 text-amber-900">
            At least four active subjects must be available before registration.
            Please contact the administrator.
          </div>
        ) : (
          <div className="w-full">
            <RegistrationForm subjects={subjects} />
          </div>
        )}

        <p className="mt-6 text-center text-xs text-slate-500">
          Your exam access will only be enabled after payment is verified.
        </p>
      </div>
    </main>
  );
}
