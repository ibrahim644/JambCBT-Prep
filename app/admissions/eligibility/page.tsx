
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Institution = {
  id: string;
  name: string;
  state: string;
  institution_type: string;
  is_published: boolean;
  official_website?: string | null;
  admissions_url?: string | null;
  jamb_recognition_status: string;
  verification_source_url?: string | null;
};

type Programme = {
  id: string;
  institution_id: string;
  course_name: string;
  faculty: string | null;
  department: string | null;
  award_type: string | null;
  study_mode: string | null;
  duration_years: number | null;
  institutions: Institution | Institution[] | null;
};

type SubjectRequirement = {
  id: string;
  programme_id: string;
  admission_year: number;
  utme_subjects: string[];
  olevel_requirements: {
    subjects?: string[];
    minimum_credits?: number;
  };
  accepted_sittings: string | number | null;
  additional_requirements: string | null;
  source_url: string | null;
};

type CutoffMark = {
  id: string;
  programme_id: string;
  admission_year: number;
  cutoff_type: string;
  score: number;
  category: string | null;
  notes: string | null;
  source_url: string | null;
};

type Check = {
  name: string;
  passed: boolean | null;
  detail: string;
};

type Assessment = {
  status: "eligible" | "not_eligible" | "unable_to_determine";
  programme?: string;
  institution?: Programme["institutions"];
  admission_year?: number;
  utme_score?: number;
  message?: string;
  disclaimer?: string;
  checks?: Check[];
  cutoff_comparisons?: (CutoffMark & { meets_score: boolean })[];
};

type AdmissionsData = {
  institutions: Institution[];
  programmes: Programme[];
  subjectRequirements: SubjectRequirement[];
  cutoffMarks: CutoffMark[];
  eligibilityRules: { admission_year: number }[];
};

const EMPTY_ADMISSIONS_DATA: AdmissionsData = {
  institutions: [],
  programmes: [],
  subjectRequirements: [],
  cutoffMarks: [],
  eligibilityRules: [],
};

const SUBJECTS = [
  "Use of English",
  "Mathematics",
  "Physics",
  "Biology",
  "Chemistry",
  "Agricultural Science",
  "Economics",
  "Geography",
  "Further Mathematics",
  "Government",
  "Literature in English",
  "Commerce",
  "Accounting",
  "Computer Studies",
  "Technical Drawing",
  "Food and Nutrition",
  "Animal Husbandry",
  "Health Science",
];

const OLEVEL_SUBJECTS = [
  "English Language",
  "Mathematics",
  "Physics",
  "Biology",
  "Chemistry",
  "Agricultural Science",
  "Geography",
  "Further Mathematics",
  "Economics",
  "Animal Husbandry",
  "Technical Drawing",
  "Food and Nutrition",
  "Computer Studies",
  "Civic Education",
  "Government",
  "Commerce",
  "Accounting",
  "Literature in English",
  "Health Science",
];

const GRADES = ["A1", "B2", "B3", "C4", "C5", "C6", "D7", "E8", "F9"];

const STATUS_LABELS: Record<Assessment["status"], string> = {
  eligible: "Meets available requirements",
  not_eligible: "Some requirements not met",
  unable_to_determine: "Unable to confirm eligibility",
};

export default function EligibilityPage() {
  const [admissionsData, setAdmissionsData] = useState(EMPTY_ADMISSIONS_DATA);
  const [programmeId, setProgrammeId] = useState("");
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [institutionFilter, setInstitutionFilter] = useState("all");
  const [stateFilter, setStateFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [utmeScore, setUtmeScore] = useState("");

  const [utmeSubjects, setUtmeSubjects] = useState<string[]>([
    "Use of English",
    "Mathematics",
    "Physics",
  ]);

  const [sittings, setSittings] = useState("1");

  const [olevel, setOlevel] = useState<
    { subject: string; grade: string }[]
  >([
    { subject: "English Language", grade: "" },
    { subject: "Mathematics", grade: "" },
    { subject: "Physics", grade: "" },
    { subject: "Biology", grade: "" },
    { subject: "Chemistry", grade: "" },
  ]);

  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [loadingProgrammes, setLoadingProgrammes] = useState(true);
  const [loadingError, setLoadingError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadProgrammes() {
      try {
        const response = await fetch("/api/admissions/eligibility");
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Could not load programmes.");
        }

        const availableData: AdmissionsData = {
          institutions: data.institutions ?? [],
          programmes: data.programmes ?? [],
          subjectRequirements: data.subjectRequirements ?? [],
          cutoffMarks: data.cutoffMarks ?? [],
          eligibilityRules: data.eligibilityRules ?? [],
        };

        if (cancelled) return;

        setAdmissionsData(availableData);

        if (availableData.programmes.length > 0) {
          setProgrammeId(availableData.programmes[0].id);
        }

        const years = [
          ...availableData.subjectRequirements.map((item) => item.admission_year),
          ...availableData.cutoffMarks.map((item) => item.admission_year),
          ...availableData.eligibilityRules.map((item) => item.admission_year),
        ];
        if (years.length > 0) {
          setYear(String(Math.max(...years)));
        }
      } catch (err) {
        if (!cancelled) {
          setLoadingError(
            err instanceof Error ? err.message : "Could not load programmes."
          );
        }
      } finally {
        if (!cancelled) {
          setLoadingProgrammes(false);
        }
      }
    }

    loadProgrammes();

    return () => {
      cancelled = true;
    };
  }, []);

  const programmes = admissionsData.programmes;
  const states = Array.from(
    new Set(
      admissionsData.institutions.map((institution) => institution.state)
    )
  ).sort((a, b) => a.localeCompare(b));
  const institutions = admissionsData.institutions.filter(
    (institution) =>
      (institutionFilter === "all" || institution.id === institutionFilter) &&
      (stateFilter === "all" || institution.state === stateFilter) &&
      (!search.trim() ||
        [institution.name, institution.state, institution.institution_type]
          .join(" ")
          .toLowerCase()
          .includes(search.trim().toLowerCase()))
  );
  const filteredProgrammes = programmes.filter((programme) => {
    const institution = Array.isArray(programme.institutions)
      ? programme.institutions[0]
      : programme.institutions;
    const term = search.trim().toLowerCase();
    const searchable = [
      programme.course_name,
      programme.faculty,
      programme.department,
      institution?.name,
      institution?.state,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return (
      (institutionFilter === "all" ||
        institution?.id === institutionFilter) &&
      (stateFilter === "all" || institution?.state === stateFilter) &&
      (!term || searchable.includes(term))
    );
  });
  const selectedYear = Number(year);
  const availableYears = Array.from(
    new Set([
      ...admissionsData.subjectRequirements.map((item) => item.admission_year),
      ...admissionsData.cutoffMarks.map((item) => item.admission_year),
      ...admissionsData.eligibilityRules.map((item) => item.admission_year),
      selectedYear,
    ])
  ).sort((a, b) => b - a);

  function toggleUtmeSubject(subject: string) {
    setUtmeSubjects((current) =>
      current.includes(subject)
        ? current.filter((item) => item !== subject)
        : current.length < 4
          ? [...current, subject]
          : current
    );
    setAssessment(null);
  }

  function updateOlevel(
    index: number,
    field: "subject" | "grade",
    value: string
  ) {
    setOlevel((current) =>
      current.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      )
    );
    setAssessment(null);
  }

  function addOlevelRow() {
    setOlevel((current) =>
      current.length < 30
        ? [...current, { subject: "", grade: "" }]
        : current
    );
  }

  function removeOlevelRow(index: number) {
    setOlevel((current) => current.filter((_, i) => i !== index));
    setAssessment(null);
  }

  async function submitAssessment(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();
    setError("");
    setAssessment(null);

    if (!programmeId) {
      setError("No published programme is available yet.");
      return;
    }

    if (utmeSubjects.length !== 4) {
      setError(
        "Select exactly four UTME subjects, including Use of English."
      );
      return;
    }

    if (!utmeSubjects.includes("Use of English")) {
      setError("Use of English must be one of your four UTME subjects.");
      return;
    }

    const score = Number(utmeScore);

    if (
      utmeScore.trim() === "" ||
      !Number.isInteger(score) ||
      score < 0 ||
      score > 400
    ) {
      setError("Enter a valid JAMB score between 0 and 400.");
      return;
    }

    if (
      olevel.length === 0 ||
      olevel.some((item) => !item.subject || !item.grade) ||
      new Set(olevel.map((item) => item.subject)).size !== olevel.length
    ) {
      setError(
        "Complete every O’Level subject and grade, without duplicates."
      );
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch("/api/admissions/eligibility/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          programme_id: programmeId,
          admission_year: Number(year),
          utme_score: score,
          utme_subjects: utmeSubjects,
          olevel_sittings: Number(sittings),
          olevel_subjects: olevel,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Could not complete the assessment."
        );
      }

      setAssessment(data as Assessment);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Assessment failed."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 text-slate-900 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8">
          <Link
            href="/"
            className="text-sm font-semibold text-emerald-800 hover:underline"
          >
            ← JAMB Ready home
          </Link>
          <p className="text-sm font-bold uppercase tracking-widest text-emerald-700">
            Admission Assistant
          </p>

          <h1 className="mt-2 text-3xl font-extrabold sm:text-4xl">
            Find a programme. Check your requirements.
          </h1>

          <p className="mt-3 max-w-2xl text-slate-600">
            Search published Nigerian institutions and programmes, review
            verified subject combinations and cut-off marks, then compare them
            with your JAMB and O’Level results.
          </p>
        </header>

        <section className="mb-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
            <div>
              <p className="text-sm font-bold uppercase tracking-widest text-emerald-700">
                Published directory
              </p>
              <h2 className="mt-2 text-2xl font-extrabold">
                Find universities and programmes
              </h2>
              <p className="mt-2 text-sm text-slate-600">
                Browse verified {selectedYear}/{selectedYear + 1} combinations and cut-off marks.
              </p>
            </div>
            <p className="text-sm font-semibold text-slate-500">
              {filteredProgrammes.length} programme{filteredProgrammes.length === 1 ? "" : "s"}
            </p>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <label className="block text-sm font-semibold">
              Search
              <input
                type="search"
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setProgrammeId("");
                  setAssessment(null);
                }}
                placeholder="Course, university, or state"
                className="mt-2 w-full rounded-lg border border-slate-300 p-3 font-normal"
              />
            </label>
            <label className="block text-sm font-semibold">
              Institution
              <select
                value={institutionFilter}
                onChange={(event) => {
                  setInstitutionFilter(event.target.value);
                  setProgrammeId("");
                  setAssessment(null);
                }}
                className="mt-2 w-full rounded-lg border border-slate-300 p-3 font-normal"
              >
                <option value="all">All institutions</option>
                {institutions.map((institution) => (
                  <option key={institution.id} value={institution.id}>
                    {institution.name} — {institution.state}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm font-semibold">
              State
              <select
                value={stateFilter}
                onChange={(event) => {
                  setStateFilter(event.target.value);
                  setProgrammeId("");
                  setAssessment(null);
                }}
                className="mt-2 w-full rounded-lg border border-slate-300 p-3 font-normal"
              >
                <option value="all">All states</option>
                {states.map((state) => (
                  <option key={state} value={state}>{state}</option>
                ))}
              </select>
            </label>
          </div>

          <div className="mt-7">
            <h3 className="font-bold">Institutions</h3>
            {institutions.length === 0 ? (
              <p className="mt-3 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
                No published institutions match your search.
              </p>
            ) : (
              <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {institutions.map((institution) => {
                  const institutionProgrammes = programmes.filter(
                    (programme) => programme.institution_id === institution.id
                  );
                  return (
                    <article
                      key={institution.id}
                      className="rounded-xl border border-slate-200 p-4"
                    >
                      <p className="text-xs font-bold uppercase tracking-wide text-emerald-700">
                        {institution.institution_type.replaceAll("_", " ")} · {institution.state}
                      </p>
                      <h4 className="mt-2 font-bold">{institution.name}</h4>
                      <p className="mt-1 text-xs text-slate-500">
                        JAMB recognition:{" "}
                        {institution.jamb_recognition_status.replaceAll("_", " ")}
                      </p>
                      <p className="mt-1 text-sm text-slate-600">
                        {institutionProgrammes.length} published programme
                        {institutionProgrammes.length === 1 ? "" : "s"}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-3">
                        {institution.admissions_url && (
                          <a
                            href={institution.admissions_url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-sm font-semibold text-emerald-800 underline"
                          >
                            Admissions
                          </a>
                        )}
                        {institution.official_website && (
                          <a
                            href={institution.official_website}
                            target="_blank"
                            rel="noreferrer"
                            className="text-sm font-semibold text-emerald-800 underline"
                          >
                            Website
                          </a>
                        )}
                        {institution.verification_source_url && (
                          <a
                            href={institution.verification_source_url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-sm font-semibold text-emerald-800 underline"
                          >
                            Recognition source
                          </a>
                        )}
                        {institutionProgrammes.length > 0 && (
                          <button
                            type="button"
                            onClick={() => {
                              setInstitutionFilter(institution.id);
                              setProgrammeId("");
                              setAssessment(null);
                            }}
                            className="text-sm font-semibold text-emerald-800 underline"
                          >
                            View programmes
                          </button>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>

          {loadingProgrammes ? (
            <p className="mt-6 text-sm text-slate-500">Loading published programmes…</p>
          ) : loadingError ? (
            <p role="alert" className="mt-6 rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-800">
              {loadingError}
            </p>
          ) : programmes.length === 0 ? (
            <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-900">
              No published programmes are available yet. The institution
              directory above remains available while verified courses,
              subject combinations, and cut-off marks are being added.
            </div>
          ) : filteredProgrammes.length === 0 ? (
            <p className="mt-6 rounded-xl bg-slate-50 p-5 text-sm text-slate-600">
              No programmes match these filters. Try another search, institution, or state.
            </p>
          ) : (
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              {filteredProgrammes.map((programme) => {
                const institution = Array.isArray(programme.institutions)
                  ? programme.institutions[0]
                  : programme.institutions;
                const requirements = admissionsData.subjectRequirements.find(
                  (item) =>
                    item.programme_id === programme.id &&
                    item.admission_year === selectedYear
                );
                const cutoffs = admissionsData.cutoffMarks.filter(
                  (item) =>
                    item.programme_id === programme.id &&
                    item.admission_year === selectedYear
                );

                return (
                  <article
                    key={programme.id}
                    className="rounded-xl border border-slate-200 p-5"
                  >
                    <p className="text-xs font-bold uppercase tracking-wide text-emerald-700">
                      {institution?.institution_type.replaceAll("_", " ") ?? "Institution"}
                      {institution?.state ? ` · ${institution.state}` : ""}
                    </p>
                    <h3 className="mt-2 text-lg font-bold">
                      {institution?.name ?? "Institution"}
                    </h3>
                    <p className="mt-1 text-sm font-semibold text-slate-700">
                      {programme.course_name}
                    </p>
                    {(programme.faculty || programme.department) && (
                      <p className="mt-1 text-xs text-slate-500">
                        {[programme.faculty, programme.department].filter(Boolean).join(" · ")}
                      </p>
                    )}
                    {requirements ? (
                      <div className="mt-4 border-t border-slate-100 pt-4">
                        <p className="text-xs font-semibold text-slate-500">UTME subjects</p>
                        <p className="mt-1 text-sm text-slate-700">
                          {requirements.utme_subjects.join(", ")}
                        </p>
                        <p className="mt-3 text-xs font-semibold text-slate-500">O’Level credits</p>
                        <p className="mt-1 text-sm text-slate-700">
                          {requirements.olevel_requirements.subjects?.join(", ") ?? "See institution requirements"}
                          {" · "}
                          {typeof requirements.olevel_requirements.minimum_credits === "number"
                            ? `${requirements.olevel_requirements.minimum_credits} credits`
                            : "minimum credits not specified"}
                          {" · "}
                          {requirements.accepted_sittings
                            ? `${requirements.accepted_sittings} sitting(s)`
                            : "accepted sittings not specified"}
                        </p>
                        {requirements.additional_requirements && (
                          <p className="mt-3 text-sm text-slate-600">
                            {requirements.additional_requirements}
                          </p>
                        )}
                        {requirements.source_url && (
                          <a
                            href={requirements.source_url}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-3 inline-block text-sm font-semibold text-emerald-800 underline"
                          >
                            Requirements source
                          </a>
                        )}
                      </div>
                    ) : (
                      <p className="mt-4 border-t border-slate-100 pt-4 text-sm text-slate-500">
                        No verified subject combination is published for {selectedYear}/{selectedYear + 1}.
                      </p>
                    )}
                    {cutoffs.length > 0 ? (
                      <div className="mt-4 space-y-2">
                        {cutoffs.map((cutoff) => (
                          <div key={cutoff.id} className="text-sm text-slate-700">
                            <span className="font-semibold">
                              {cutoff.cutoff_type.replaceAll("_", " ")}
                              {cutoff.category ? ` · ${cutoff.category}` : ""}:
                            </span>{" "}
                            {cutoff.score}
                            {cutoff.notes ? ` — ${cutoff.notes}` : ""}
                            {cutoff.source_url && (
                              <>
                                {" · "}
                                <a
                                  href={cutoff.source_url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="font-semibold text-emerald-800 underline"
                                >
                                  Source
                                </a>
                              </>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-3 text-sm text-slate-500">
                        No verified cut-off mark is published for this year.
                      </p>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setProgrammeId(programme.id);
                        document.getElementById("eligibility-checker")?.scrollIntoView({
                          behavior: "smooth",
                          block: "start",
                        });
                      }}
                      className="mt-5 rounded-lg bg-emerald-800 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-700"
                    >
                      Check this programme
                    </button>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <form
          id="eligibility-checker"
          onSubmit={submitAssessment}
          className="space-y-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8"
        >
          <section>
            <h2 className="mb-4 text-xl font-bold">
              1. Programme and JAMB
            </h2>

            <div className="grid gap-5 sm:grid-cols-2">
              <label className="block">
                <span className="mb-2 block text-sm font-semibold">
                  Institution and course
                </span>

                <select
                  value={programmeId}
                  onChange={(e) => setProgrammeId(e.target.value)}
                  disabled={loadingProgrammes || filteredProgrammes.length === 0}
                  className="w-full rounded-lg border border-slate-300 p-3"
                  required
                >
                  <option value="">Select an institution and programme</option>
                  {programmes.length === 0 && (
                    <option value="">
                      {loadingProgrammes
                        ? "Loading programmes..."
                        : "No published programmes available"}
                    </option>
                  )}

                  {filteredProgrammes.map((programme) => {
                    const institution = Array.isArray(programme.institutions)
                      ? programme.institutions[0]
                      : programme.institutions;

                    return (
                      <option key={programme.id} value={programme.id}>
                        {institution?.name ?? "Institution"} — {programme.course_name}
                      </option>
                    );
                  })}
                </select>
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-semibold">
                  Admission year
                </span>

                <select
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 p-3"
                >
                  {availableYears.map((admissionYear) => (
                    <option key={admissionYear} value={admissionYear}>
                      {admissionYear}/{admissionYear + 1}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-semibold">
                  JAMB score
                </span>

                <input
                  type="number"
                  min="0"
                  max="400"
                  step="1"
                  value={utmeScore}
                  onChange={(e) => {
                    setUtmeScore(e.target.value);
                    setAssessment(null);
                  }}
                  className="w-full rounded-lg border border-slate-300 p-3"
                  placeholder="Enter your score"
                  required
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-semibold">
                  Number of O’Level sittings
                </span>

                <select
                  value={sittings}
                  onChange={(e) => setSittings(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 p-3"
                >
                  <option value="1">One sitting</option>
                  <option value="2">Two sittings</option>
                  <option value="3">Three sittings</option>
                </select>
              </label>
            </div>

            <div className="mt-6">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="font-semibold">UTME subjects</h3>
                <span className="text-sm text-slate-500">
                  {utmeSubjects.length}/4 selected
                </span>
              </div>

              <p className="mb-3 text-sm text-slate-600">
                Select exactly four subjects, including Use of English.
              </p>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {SUBJECTS.map((subject) => (
                  <label
                    key={subject}
                    className={`flex cursor-pointer items-center gap-2 rounded-lg border p-3 text-sm ${
                      utmeSubjects.includes(subject)
                        ? "border-emerald-600 bg-emerald-50"
                        : "border-slate-200"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={utmeSubjects.includes(subject)}
                      onChange={() => toggleUtmeSubject(subject)}
                      disabled={
                        !utmeSubjects.includes(subject) &&
                        utmeSubjects.length >= 4
                      }
                    />
                    {subject}
                  </label>
                ))}
              </div>
            </div>
          </section>

          <section>
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold">2. O’Level results</h2>
                <p className="mt-1 text-sm text-slate-600">
                  Enter your subjects and grades as shown on your result.
                </p>
              </div>

              <button
                type="button"
                onClick={addOlevelRow}
                disabled={olevel.length >= 30}
                className="shrink-0 rounded-lg border border-emerald-700 px-3 py-2 text-sm font-semibold text-emerald-800 disabled:opacity-40"
              >
                + Add subject
              </button>
            </div>

            <div className="space-y-3">
              {olevel.map((item, index) => (
                <div
                  key={index}
                  className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_150px_90px]"
                >
                  <select
                    value={item.subject}
                    onChange={(e) =>
                      updateOlevel(index, "subject", e.target.value)
                    }
                    className="w-full rounded-lg border border-slate-300 p-3"
                    required
                  >
                    <option value="">Choose subject</option>

                    {OLEVEL_SUBJECTS.map((subject) => (
                      <option
                        key={subject}
                        value={subject}
                        disabled={olevel.some(
                          (other, i) =>
                            i !== index && other.subject === subject
                        )}
                      >
                        {subject}
                      </option>
                    ))}
                  </select>

                  <select
                    value={item.grade}
                    onChange={(e) =>
                      updateOlevel(index, "grade", e.target.value)
                    }
                    className="w-full rounded-lg border border-slate-300 p-3"
                    required
                  >
                    <option value="">Choose grade</option>

                    {GRADES.map((grade) => (
                      <option key={grade} value={grade}>
                        {grade}
                      </option>
                    ))}
                  </select>

                  <button
                    type="button"
                    onClick={() => removeOlevelRow(index)}
                    disabled={olevel.length <= 5}
                    className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-red-700 disabled:opacity-40"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </section>

          {error && (
            <div
              role="alert"
              className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800"
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={
              submitting || loadingProgrammes || programmes.length === 0
            }
            className="w-full rounded-xl bg-emerald-700 px-5 py-4 font-bold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? "Checking eligibility..." : "Check My Eligibility"}
          </button>
        </form>

        {assessment && (
          <section
            aria-live="polite"
            className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8"
          >
            <h2 className="text-2xl font-bold">Your assessment</h2>

            <p className="mt-3 text-lg font-semibold">
              {STATUS_LABELS[assessment.status]}
            </p>

            <p className="mt-2 text-slate-600">{assessment.message}</p>

            {assessment.checks && assessment.checks.length > 0 && (
              <div className="mt-6 space-y-3">
                {assessment.checks.map((check, index) => (
                  <div
                    key={`${check.name}-${index}`}
                    className="flex gap-3 rounded-lg border border-slate-200 p-4"
                  >
                    <span
                      className={
                        check.passed === null
                          ? "font-bold text-slate-500"
                          : check.passed
                            ? "font-bold text-emerald-700"
                            : "font-bold text-red-700"
                      }
                    >
                      {check.passed === null
                        ? "UNKNOWN"
                        : check.passed
                          ? "PASS"
                          : "REVIEW"}
                    </span>

                    <div>
                      <p className="font-semibold">{check.name}</p>
                      <p className="mt-1 text-sm text-slate-600">
                        {check.detail}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <section className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
              <h3 className="font-bold">Score vs published cut-off marks</h3>
              <p className="mt-1 text-sm text-slate-600">
                These are historical or category-specific reference marks, not
                a guarantee of admission.
              </p>
              {assessment.cutoff_comparisons?.length ? (
                <div className="mt-4 space-y-3">
                  {assessment.cutoff_comparisons.map((cutoff, index) => (
                    <div
                      key={`${cutoff.cutoff_type}-${cutoff.category ?? "general"}-${index}`}
                      className="flex flex-col justify-between gap-2 rounded-lg border border-slate-200 bg-white p-4 sm:flex-row sm:items-center"
                    >
                      <div>
                        <p className="font-semibold capitalize">
                          {cutoff.cutoff_type.replaceAll("_", " ")}
                          {cutoff.category ? ` · ${cutoff.category}` : ""}
                        </p>
                        <p className="mt-1 text-sm text-slate-600">
                          Published mark: {cutoff.score}
                          {cutoff.notes ? ` · ${cutoff.notes}` : ""}
                        </p>
                        {cutoff.source_url && (
                          <a
                            href={cutoff.source_url}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-1 inline-block text-sm font-semibold text-emerald-800 underline"
                          >
                            View source
                          </a>
                        )}
                      </div>
                      <span
                        className={`text-sm font-bold ${
                          cutoff.meets_score
                            ? "text-emerald-700"
                            : "text-amber-700"
                        }`}
                      >
                        Your score: {assessment.utme_score}{" "}
                        {cutoff.meets_score
                          ? "· At or above mark"
                          : "· Below mark"}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-3 text-sm text-slate-600">
                  No verified cut-off mark has been published for this
                  programme and admission year.
                </p>
              )}
            </section>

            {assessment.disclaimer && (
              <p className="mt-6 text-sm text-slate-500">
                {assessment.disclaimer}
              </p>
            )}
          </section>
        )}
      </div>
    </main>
  );
}
