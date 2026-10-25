import Link from "next/link";

export default function PaymentFailedPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F5F7F4] px-5">
      <section className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-xl">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 text-3xl text-amber-700">
          !
        </div>
        <h1 className="mt-5 text-2xl font-black text-[#183D2B]">
          Payment not verified
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          We could not confirm a successful payment. If you completed checkout,
          please contact support before trying again.
        </p>
        <Link
          href="/register"
          className="mt-7 inline-flex rounded-xl bg-[#183D2B] px-6 py-3 font-bold text-white hover:bg-[#245239]"
        >
          Return to registration
        </Link>
      </section>
    </main>
  );
}
