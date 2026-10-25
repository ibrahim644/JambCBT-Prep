import Link from "next/link";

const features = [
  {
    number: "01",
    title: "A realistic CBT experience",
    description:
      "Practise with a timed exam interface designed to help you get comfortable before the real thing.",
    icon: "⌘",
  },
  {
    number: "02",
    title: "Know where you stand",
    description:
      "See your score after submission and review correct answers and explanations to learn from every attempt.",
    icon: "↗",
  },
  {
    number: "03",
    title: "Stay in control",
    description:
      "Move between questions, save your answers, and flag questions you want to revisit before time runs out.",
    icon: "✓",
  },
];

const steps = [
  {
    number: "1",
    title: "Create your candidate profile",
    description: "Enter your details and choose your four JAMB subjects.",
  },
  {
    number: "2",
    title: "Complete payment",
    description: "Pay the ₦1,000 practice-exam fee securely through Paystack.",
  },
  {
    number: "3",
    title: "Start your mock exam",
    description: "Answer timed questions, submit your attempt, and review your result.",
  },
];

const subjects = [
  "Use of English",
  "Mathematics",
  "Biology",
  "Chemistry",
  "Physics",
  "Economics",
  "Government",
  "Literature in English",
];

function ArrowIcon({ diagonal = false }: { diagonal?: boolean }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      fill="none"
      className="h-4 w-4"
    >
      {diagonal ? (
        <path
          d="M5 15 15 5M6 5h9v9"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ) : (
        <path
          d="M3.5 10h12m-5-5 5 5-5 5"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
    </svg>
  );
}

export default function Home() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#F7F8F2] text-[#14291F]">
      <header className="relative z-10 border-b border-[#E7EAE1] bg-[#F7F8F2]/95">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5 sm:px-8 lg:px-12">
          <Link href="/" className="flex items-center gap-3" aria-label="JAMB Ready home">
  
<span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-[#315D3B] bg-[#173F2B] text-[#FFFFFF] shadow-md shadow-[#173F2B]/20">
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    className="h-7 w-7"
    aria-hidden="true"
  >
    <path
      d="m2.5 8.5 9.5-5 9.5 5-9.5 5-9.5-5Z"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M6 10.5v5c3.5 2.5 8.5 2.5 12 0v-5M21.5 9v6"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
</span>

            <span>
              <span className="block text-lg font-extrabold tracking-tight">
                Jamb<span className="text-[#B9D8C2]">Ready</span>
              </span>
              <span className="block text-[10px] font-semibold uppercase tracking-[0.2em] text-[#758276]">
                Prepare with purpose
              </span>
            </span>
          </Link>

          <nav className="hidden items-center gap-8 text-sm font-semibold text-[#596A5D] md:flex">
            <a className="transition hover:text-[#173F2B]" href="#features">Features</a>
            <a className="transition hover:text-[#173F2B]" href="#how-it-works">How it works</a>
            <a className="transition hover:text-[#173F2B]" href="#subjects">Subjects</a>
          </nav>

          <div className="flex items-center gap-3">
            
            <Link
              href="/register"
              className="inline-flex items-center gap-2 rounded-full bg-[#173F2B] px-4 py-3 text-sm font-bold text-white shadow-[0_5px_14px_rgba(23,63,43,0.15)] transition hover:bg-[#245538] sm:px-5"
            >
              Get started <ArrowIcon />
            </Link>
          </div>
        </div>
      </header>

      <section className="relative isolate overflow-hidden bg-[#082A20]">
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-20 bg-cover bg-center"
          style={{ backgroundImage: "url('https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=2200&q=85')" }}
        />
        <div aria-hidden="true" className="absolute inset-0 -z-10 bg-gradient-to-r from-[#05251B]/95 via-[#082A20]/85 to-[#082A20]/45" />
        <div aria-hidden="true" className="absolute inset-0 -z-10 bg-[#061F18]/15" />
        <div className="relative mx-auto grid max-w-7xl items-center gap-14 px-5 pb-20 pt-16 sm:px-8 sm:pt-20 lg:grid-cols-[1fr_0.94fr] lg:gap-12 lg:px-12 lg:pb-28 lg:pt-24">
          <div className="relative z-10">
            <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3.5 py-2 text-xs font-bold tracking-wide text-[#B9D8C2] shadow-sm backdrop-blur-sm">
              <span className="h-2 w-2 rounded-full bg-[#8DBD49]" />
              YOUR NEXT CHAPTER STARTS HERE
            </div>
            <h1 className="max-w-2xl text-[3.25rem] font-black leading-[1.02] tracking-[-0.055em] text-white sm:text-6xl lg:text-[4.65rem]">
              Walk into JAMB
              <br />
              <span className="relative inline-block text-[#B9D8C2]">
                with confidence.
                <svg
                  aria-hidden="true"
                  viewBox="0 0 310 12"
                  className="absolute -bottom-2 left-0 w-full"
                  fill="none"
                >
                  <path d="M3 8C76 2 210 2 306 7" stroke="#00eb42" strokeWidth="5" strokeLinecap="round" />
                </svg>
              </span>
            </h1>
            <p className="mt-7 max-w-xl text-base leading-8 text-white/80 sm:text-lg">
              Preparation is more than reading. Practise in a CBT-style environment,
              learn from your results, and build the confidence to do your best on exam day.
            </p>

            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/register"
                className="inline-flex min-h-14 items-center justify-center gap-3 rounded-2xl bg-[#B9D8C2] px-7 text-base font-bold text-[#173F2B] shadow-[0_12px_28px_rgba(0,0,0,0.2)] transition hover:-translate-y-0.5 hover:bg-[#E5FF86]"
              >
                Start practising <ArrowIcon />
              </Link>
              <a
                href="#how-it-works"
                className="inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl border border-white/40 bg-white/10 px-7 text-base font-bold text-white backdrop-blur-sm transition hover:bg-white/20"
              >
                See how it works
                <span className="text-lg">↓</span>
              </a>
            </div>

            <div className="mt-9 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-white/85">
              <span className="inline-flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#B9D8C2]/20 text-xs font-black text-[#B9D8C2]">✓</span>
                Timed practice exams
              </span>
              <span className="inline-flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#B9D8C2]/20 text-xs font-black text-[#B9D8C2]">✓</span>
                Results and explanations
              </span>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-[570px] lg:ml-auto">
            <div className="absolute -right-4 top-8 h-28 w-28 rounded-[2rem] border border-[#DDE8D4] bg-[#EAF1E1] sm:-right-7 sm:h-36 sm:w-36" />
            <div className="absolute -bottom-6 -left-4 h-24 w-24 rounded-full bg-[#D9E7C6] sm:-left-8 sm:h-32 sm:w-32" />
            <div className="relative rounded-[2rem] border border-white bg-white p-3 shadow-[0_28px_90px_rgba(30,58,39,0.13)] sm:p-5">
              <div className="rounded-[1.45rem] bg-[#F6F8F3] p-4 sm:p-6">
                <div className="flex items-center justify-between border-b border-[#E4E9DF] pb-5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#173F2B] text-lg text-[#B9D8C2]">✳</div>
                    <div>
                      <p className="text-sm font-extrabold text-[#203D2B]">Practice session</p>
                      <p className="mt-0.5 text-xs text-[#829083]">Your focus, your future</p>
                    </div>
                  </div>
                  <span className="rounded-full bg-[#E4F0D9] px-3 py-1.5 text-[11px] font-bold text-[#477C4F]">LIVE PREVIEW</span>
                </div>

                <div className="mt-6 flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.15em] text-[#879486]">Question 12 of 40</p>
                    <h2 className="mt-3 max-w-xs text-xl font-extrabold leading-snug tracking-tight text-[#1A3525] sm:text-2xl">
                      Choose the option that best completes the sentence.
                    </h2>
                  </div>
                  <div className="shrink-0 rounded-2xl border border-[#E2E9DC] bg-white px-3 py-2.5 text-center">
                    <p className="text-[9px] font-bold uppercase tracking-widest text-[#879486]">Time left</p>
                    <p className="mt-1 font-mono text-lg font-bold tracking-tight text-[#315D3B]">18:42</p>
                  </div>
                </div>

                <div className="mt-6 space-y-3">
                  {[
                    ["A", "Although the rain was heavy"],
                    ["B", "Despite he was tired"],
                    ["C", "Because of he arrived late"],
                    ["D", "In spite the weather"],
                  ].map(([letter, answer], index) => (
                    <div
                      key={letter}
                      className={`flex items-center gap-3 rounded-xl border px-4 py-3.5 text-sm font-medium ${
                        index === 0
                          ? "border-[#8CB78A] bg-[#EAF3E5] text-[#284B31]"
                          : "border-[#E5EAE1] bg-white text-[#5D6B60]"
                      }`}
                    >
                      <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-extrabold ${
                        index === 0 ? "bg-[#477C4F] text-white" : "bg-[#F0F3ED] text-[#7A897B]"
                      }`}>{letter}</span>
                      {answer}
                      {index === 0 && <span className="ml-auto text-[#477C4F]">✓</span>}
                    </div>
                  ))}
                </div>

                <div className="mt-6 flex items-center justify-between border-t border-[#E4E9DF] pt-5">
                  <span className="text-xs font-semibold text-[#7D8B7E]">12 answered · 3 flagged</span>
                  <span className="inline-flex items-center gap-2 rounded-xl bg-[#173F2B] px-4 py-3 text-xs font-bold text-white">
                    Next question <ArrowIcon />
                  </span>
                </div>
              </div>
              <div className="absolute -left-5 top-[43%] hidden items-center gap-3 rounded-2xl border border-[#E7EBE1] bg-white p-3.5 shadow-[0_12px_35px_rgba(30,58,39,0.12)] sm:flex">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#E7F1DF] text-xl text-[#477C4F]">✓</div>
                <div>
                  <p className="text-xs font-bold text-[#263E2C]">Answers saved</p>
                  <p className="mt-1 text-[10px] text-[#8A968A]">Your progress is tracked</p>
                </div>
              </div>
              <div className="absolute -right-4 bottom-9 hidden rounded-2xl border border-[#E7EBE1] bg-white px-4 py-3 shadow-[0_12px_35px_rgba(30,58,39,0.12)] sm:block">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#8A968A]">Practice fee</p>
                <p className="mt-1 text-2xl font-black tracking-tight text-[#244631]">₦1,000</p>
              </div>
            </div>
            <p className="mt-5 text-center text-xs text-white/65">Illustrative exam preview · Actual questions depend on your selected subjects</p>
          </div>
        </div>
      </section>

      <section className="border-y border-[#E5EADF] bg-white/70">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-6 px-5 py-7 sm:px-8 md:grid-cols-4 lg:px-12">
          {[
            ["₦1,000", "Practice exam fee"],
            ["4 subjects", "Your chosen combination"],
            ["Timed CBT", "Practise under pressure"],
            ["Instant review", "Learn after submission"],
          ].map(([value, label]) => (
            <div key={label} className="flex flex-col items-center justify-center text-center md:border-r md:border-[#E7EBE3] md:last:border-0">
              <p className="text-xl font-black tracking-tight text-[#244631] sm:text-2xl">{value}</p>
              <p className="mt-1.5 text-xs font-medium text-[#7B887C] sm:text-sm">{label}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="features" className="mx-auto max-w-7xl px-5 py-20 sm:px-8 sm:py-24 lg:px-12 lg:py-28">
        <div className="mx-auto max-w-2xl text-center">
          <span className="text-xs font-extrabold uppercase tracking-[0.22em] text-[#608B52]">More than practice</span>
          <h2 className="mt-4 text-3xl font-black tracking-[-0.04em] text-[#193724] sm:text-5xl">
            Turn every attempt into progress.
          </h2>
          <p className="mt-5 text-base leading-7 text-[#748074] sm:text-lg">
            Build familiarity with the CBT format and make every practice session count.
          </p>
        </div>

        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {features.map((feature) => (
            <article key={feature.number} className="group rounded-[1.7rem] border border-[#E4E9DF] bg-white p-7 transition duration-300 hover:-translate-y-1 hover:border-[#B9CFAC] hover:shadow-[0_18px_45px_rgba(34,65,41,0.07)] sm:p-8">
              <div className="flex items-center justify-between">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#EAF1E3] text-xl font-bold text-[#477C4F] transition group-hover:bg-[#173F2B] group-hover:text-[#B9D8C2]">{feature.icon}</span>
                <span className="text-sm font-bold tracking-widest text-[#B0BCAF]">{feature.number}</span>
              </div>
              <h3 className="mt-7 text-xl font-extrabold tracking-tight text-[#213D2A]">{feature.title}</h3>
              <p className="mt-3 text-sm leading-7 text-[#748074]">{feature.description}</p>
              <div className="mt-6 h-1 w-12 rounded-full bg-[#C9E56A] transition-all group-hover:w-20" />
            </article>
          ))}
        </div>
      </section>

      <section id="how-it-works" className="relative overflow-hidden bg-[#173F2B] text-white">
        <div className="pointer-events-none absolute -right-28 -top-28 h-96 w-96 rounded-full border border-white/10" />
        <div className="pointer-events-none absolute -right-10 -top-10 h-60 w-60 rounded-full border border-white/10" />
        <div className="relative mx-auto max-w-7xl px-5 py-20 sm:px-8 sm:py-24 lg:px-12 lg:py-28">
          <div className="grid gap-12 lg:grid-cols-[0.85fr_1.15fr] lg:gap-20">
            <div>
              <span className="text-xs font-extrabold uppercase tracking-[0.22em] text-[#B9D8C2]">Simple by design</span>
              <h2 className="mt-4 max-w-lg text-3xl font-black leading-tight tracking-[-0.04em] sm:text-5xl">
                Three steps closer to exam day confidence.
              </h2>
              <p className="mt-5 max-w-md text-base leading-7 text-[#D0DDD1]">
                Get set up in minutes and spend your energy where it matters: preparing.
              </p>
              <Link href="/register" className="mt-8 inline-flex items-center gap-3 rounded-2xl bg-[#B9D8C2] px-6 py-4 text-sm font-extrabold text-[#1A3B27] transition hover:bg-[#E5FF86]">
                Begin your preparation <ArrowIcon />
              </Link>
            </div>
            <div className="space-y-4">
              {steps.map((step) => (
                <div key={step.number} className="flex gap-5 rounded-2xl border border-white/12 bg-white/[0.055] p-5 transition hover:bg-white/[0.09] sm:gap-6 sm:p-6">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#B9D8C2] text-lg font-black text-[#1A3B27]">{step.number}</span>
                  <div className="pt-0.5">
                    <h3 className="text-lg font-extrabold tracking-tight">{step.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-[#C5D4C7]">{step.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="subjects" className="mx-auto max-w-7xl px-5 py-20 sm:px-8 sm:py-24 lg:px-12 lg:py-28">
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div className="max-w-2xl">
            <span className="text-xs font-extrabold uppercase tracking-[0.22em] text-[#608B52]">Your subject combination</span>
            <h2 className="mt-4 text-3xl font-black tracking-[-0.04em] text-[#193724] sm:text-5xl">
              Prepare for the subjects that matter to you.
            </h2>
            <p className="mt-4 max-w-xl text-base leading-7 text-[#748074]">
              Select Use of English and three other subjects that match your JAMB combination during registration.
            </p>
          </div>
          <Link href="/register" className="inline-flex shrink-0 items-center gap-2 self-start rounded-full border border-[#D9E3D4] bg-white px-5 py-3 text-sm font-bold text-[#31573A] transition hover:border-[#AFC7A5] sm:self-auto">
            Choose your subjects <ArrowIcon />
          </Link>
        </div>

        <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {subjects.map((subject, index) => (
            <div key={subject} className={`flex min-h-[92px] items-center gap-3 rounded-2xl border p-4 transition hover:-translate-y-0.5 hover:shadow-sm ${
              index === 0
                ? "border-[#B8D0AB] bg-[#EAF1E3]"
                : "border-[#E4E9DF] bg-white hover:border-[#C5D5BD]"
            }`}>
              <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-xs font-black ${
                index === 0 ? "bg-[#477C4F] text-white" : "bg-[#F0F3ED] text-[#6F806F]"
              }`}>{String(index + 1).padStart(2, "0")}</span>
              <span className="text-sm font-bold leading-snug text-[#2C4833]">{subject}</span>
            </div>
          ))}
        </div>
        <p className="mt-4 text-xs leading-6 text-[#8A968A]">Subject availability depends on the options configured on the platform.</p>
      </section>

      <section className="px-5 pb-20 sm:px-8 sm:pb-24 lg:px-12">
        <div className="relative mx-auto max-w-7xl overflow-hidden rounded-[2rem] bg-[#E8F0DD] px-6 py-12 sm:px-12 sm:py-16 lg:px-16">
          <div className="pointer-events-none absolute -right-12 -top-20 h-64 w-64 rounded-full border-[36px] border-white/40" />
          <div className="relative flex flex-col items-start justify-between gap-8 md:flex-row md:items-center">
            <div className="max-w-2xl">
              <span className="text-xs font-extrabold uppercase tracking-[0.2em] text-[#5A8550]">Your future is worth preparing for</span>
              <h2 className="mt-4 text-3xl font-black leading-tight tracking-[-0.04em] text-[#193724] sm:text-4xl">
                Make your next practice session count.
              </h2>
              <p className="mt-4 max-w-xl text-sm leading-7 text-[#647563] sm:text-base">
                Get started, select your subjects, and take the next step in your JAMB preparation.
              </p>
            </div>
            <Link href="/register" className="inline-flex min-h-14 shrink-0 items-center justify-center gap-3 rounded-2xl bg-[#173F2B] px-7 text-sm font-extrabold text-white shadow-lg transition hover:-translate-y-0.5 hover:bg-[#245538]">
              Register and get started <ArrowIcon />
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-[#E3E8DE] bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-5 py-8 sm:px-8 md:flex-row md:items-center md:justify-between lg:px-12">
          <Link href="/" className="flex items-center gap-3">
<span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-[#315D3B] bg-[#173F2B] text-[#FFFFFF] shadow-md shadow-[#173F2B]/20">
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    className="h-7 w-7"
    aria-hidden="true"
  >
    <path
      d="m2.5 8.5 9.5-5 9.5 5-9.5 5-9.5-5Z"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M6 10.5v5c3.5 2.5 8.5 2.5 12 0v-5M21.5 9v6"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
</span>
            <span className="text-base font-extrabold tracking-tight">jamb<span className="text-[#477C4F]">ready</span></span>
          </Link>
          <p className="max-w-lg text-xs leading-6 text-[#879287]">
            A practice platform designed to help candidates prepare for computer-based examinations. Not affiliated with JAMB.
          </p>
          <Link href="/register" className="inline-flex items-center gap-2 text-sm font-bold text-[#31573A] hover:text-[#477C4F]">
            Start practising <ArrowIcon diagonal />
          </Link>
        </div>
      </footer>
    </main>
  );
}
