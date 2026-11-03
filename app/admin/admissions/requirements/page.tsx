"use client";

import { useEffect, useState } from "react";

type Programme = {
  id: string;
  course_name: string;
  faculty?: string | null;
  department?: string | null;
  institutions?: { name?: string; state?: string } | null;
};

type RequirementRecord = {
  id: string;
  programme_id: string;
  admission_year: number;
  verification_status?: string;
  is_published?: boolean;
  utme_subjects?: string[];
  cutoff_type?: string;
  score?: number;
  entry_route?: string;
  source_url?: string | null;
  [key: string]: unknown;
};

type ApiData = {
  programmes: Programme[];
  subjectRequirements: RequirementRecord[];
  cutoffMarks: RequirementRecord[];
  eligibilityRules: RequirementRecord[];
};

const inputClass =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100";

const initialData: ApiData = {
  programmes: [],
  subjectRequirements: [],
  cutoffMarks: [],
  eligibilityRules: [],
};

async function fetchRequirements(): Promise<ApiData> {
  const response = await fetch("/api/admin/admissions/requirements", {
    cache: "no-store",
  });
  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.error || "Could not load requirements.");
  }

  return {
    programmes: result.programmes ?? [],
    subjectRequirements: result.subjectRequirements ?? [],
    cutoffMarks: result.cutoffMarks ?? [],
    eligibilityRules: result.eligibilityRules ?? [],
  };
}

export default function AdmissionRequirementsPage() {
  const [data, setData] = useState<ApiData>(initialData);
  const [programmeId, setProgrammeId] = useState("");
  const [year, setYear] = useState("2027");
  const [recordType, setRecordType] = useState("subject_requirements");
  const [utmeSubjects, setUtmeSubjects] = useState("");
  const [olevelSubjects, setOlevelSubjects] = useState("");
  const [minimumCredits, setMinimumCredits] = useState("5");
  const [acceptedSittings, setAcceptedSittings] = useState("2");
  const [additionalRequirements, setAdditionalRequirements] = useState("");
  const [cutoffType, setCutoffType] = useState("departmental");
  const [score, setScore] = useState("180");
  const [category, setCategory] = useState("");
  const [entryRoute, setEntryRoute] = useState("UTME");
  const [screeningMethod, setScreeningMethod] = useState("");
  const [minimumAge, setMinimumAge] = useState("");
  const [minimumUtmeScore, setMinimumUtmeScore] = useState("");
  const [notes, setNotes] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [reviewingId, setReviewingId] = useState<string | null>(null);

  async function loadData() {
    try {
      const result = await fetchRequirements();
      setError("");
      setData(result);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not load requirements."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;

    void fetchRequirements()
      .then((result) => {
        if (!cancelled) {
          setData(result);
          setError("");
        }
      })
      .catch((caught: unknown) => {
        if (!cancelled) {
          setError(
            caught instanceof Error
              ? caught.message
              : "Could not load requirements."
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  async function saveRequirement(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!programmeId) {
      setError("Please select a programme.");
      return;
    }

    if (!sourceUrl.trim()) {
      setError("Add the official source URL used to verify this information.");
      return;
    }

    if (!/^https?:\/\/\S+$/i.test(sourceUrl.trim())) {
      setError("Enter a valid URL beginning with https:// or http://.");
      return;
    }

    const base = {
      programme_id: programmeId,
      admission_year: Number(year),
      source_url: sourceUrl.trim(),
    };

    let payload: Record<string, unknown>;

    if (recordType === "subject_requirements") {
      const subjects = utmeSubjects
        .split(",")
        .map((subject) => subject.trim())
        .filter(Boolean);

      if (subjects.length < 4 || subjects.length > 10) {
        setError("Enter between 4 and 10 UTME subjects, separated by commas.");
        return;
      }

      const olevelList = olevelSubjects
        .split(",")
        .map((subject) => subject.trim())
        .filter(Boolean);

      if (olevelList.length === 0) {
        setError("Enter the required O'Level subjects.");
        return;
      }

      const normalizeSubject = (subject: string) =>
        subject.toLowerCase().replace(/[^a-z0-9]/g, "");
      if (
        new Set(subjects.map(normalizeSubject)).size !== subjects.length ||
        new Set(olevelList.map(normalizeSubject)).size !== olevelList.length
      ) {
        setError("Remove duplicate UTME and O'Level subjects.");
        return;
      }

      const credits = Number(minimumCredits);
      if (!Number.isInteger(credits) || credits < 1 || credits > 9) {
        setError("Minimum credits must be a whole number from 1 to 9.");
        return;
      }

      payload = {
        record_type: "subject_requirements",
        ...base,
        utme_subjects: subjects,
        olevel_requirements: {
          subjects: olevelList,
          minimum_credits: credits,
        },
        accepted_sittings: Number(acceptedSittings),
        additional_requirements: additionalRequirements.trim() || null,
      };
    } else if (recordType === "cutoff_mark") {
      const numericScore = Number(score);

      if (!Number.isInteger(numericScore) || numericScore < 0 || numericScore > 400) {
        setError("Cutoff score must be a whole number from 0 to 400.");
        return;
      }

      payload = {
        record_type: "cutoff_mark",
        ...base,
        cutoff_type: cutoffType,
        score: numericScore,
        category: category.trim() || null,
        notes: notes.trim() || null,
      };
    } else {
      payload = {
        record_type: "eligibility_rule",
        ...base,
        entry_route: entryRoute,
        screening_method: screeningMethod.trim() || null,
        minimum_age: minimumAge.trim() ? Number(minimumAge) : null,
        minimum_utme_score: minimumUtmeScore.trim()
          ? Number(minimumUtmeScore)
          : null,
        additional_rules: {},
        notes: notes.trim() || null,
      };
    }

    setSaving(true);

    try {
      const response = await fetch("/api/admin/admissions/requirements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error ||
            result.message ||
            "Could not save the admission requirement."
        );
      }

      setSuccess(
        result.message ||
          "Requirement saved as an unpublished draft."
      );
      setNotes("");
      await loadData();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "An unexpected error occurred."
      );
    } finally {
      setSaving(false);
    }
  }

  const allRecords = [
    ...data.subjectRequirements.map((record) => ({
      ...record,
      recordType: "subject_requirements" as const,
      displayType: "UTME / O'Level",
    })),
    ...data.cutoffMarks.map((record) => ({
      ...record,
      recordType: "cutoff_mark" as const,
      displayType: "Cutoff mark",
    })),
    ...data.eligibilityRules.map((record) => ({
      ...record,
      recordType: "eligibility_rule" as const,
      displayType: "Eligibility rule",
    })),
  ];

  async function updateReviewStatus(
    record: (typeof allRecords)[number],
    verificationStatus: "verified" | "needs_review",
    isPublished: boolean
  ) {
    const key = `${record.displayType}:${record.id}`;
    setReviewingId(key);
    setError("");
    setSuccess("");

    try {
      const response = await fetch("/api/admin/admissions/requirements", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          record_type: record.recordType,
          id: record.id,
          verification_status: verificationStatus,
          is_published: isPublished,
        }),
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Could not update this record.");
      }

      await loadData();
      setSuccess(
        isPublished
          ? "Requirement verified and published."
          : verificationStatus === "needs_review"
            ? "Requirement unpublished and flagged for review."
            : "Requirement unpublished."
      );
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Could not update this record."
      );
    } finally {
      setReviewingId(null);
    }
  }

  function programmeName(id: string) {
    return (
      data.programmes.find((programme) => programme.id === id)?.course_name ||
      "Unknown programme"
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-900 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-7">
        <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-emerald-800">
              Admissions management
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight">
              Admission Requirements
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              Manage UTME subject combinations, O&apos;Level requirements,
              cutoff marks and programme eligibility rules.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              setLoading(true);
              void loadData();
            }}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold hover:bg-slate-100"
          >
            Refresh records
          </button>
        </header>

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[
            ["Programmes", data.programmes.length],
            ["Subject requirements", data.subjectRequirements.length],
            ["Cutoff records", data.cutoffMarks.length],
            ["Eligibility rules", data.eligibilityRules.length],
          ].map(([label, value]) => (
            <section
              key={label}
              className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <p className="text-sm text-slate-500">{label}</p>
              <p className="mt-2 text-3xl font-bold text-emerald-900">
                {loading ? "…" : value}
              </p>
            </section>
          ))}
        </div>

        {error && (
          <div
            role="alert"
            className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
          >
            {error}
          </div>
        )}

        {success && (
          <div
            role="status"
            className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900"
          >
            {success}
          </div>
        )}

        <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 p-5 sm:p-6">
            <h2 className="text-xl font-bold">Add a requirement</h2>
            <p className="mt-1 text-sm text-slate-500">
              Every record is saved as an unpublished draft for verification.
            </p>
          </div>

          <form onSubmit={saveRequirement} className="space-y-6 p-5 sm:p-6">
            <div className="grid gap-5 md:grid-cols-2">
              <label className="block text-sm font-semibold">
                Programme
                <select
                  className={`${inputClass} mt-2`}
                  value={programmeId}
                  onChange={(event) => setProgrammeId(event.target.value)}
                  required
                >
                  <option value="">Select a programme</option>
                  {data.programmes.map((programme) => (
                    <option key={programme.id} value={programme.id}>
                      {programme.course_name}
                      {programme.institutions?.name
                        ? ` — ${programme.institutions.name}`
                        : ""}
                    </option>
                  ))}
                </select>
                {data.programmes.length === 0 && !loading && (
                  <span className="mt-2 block text-xs font-normal text-amber-700">
                    No programmes found. Add an institution and programme first.
                  </span>
                )}
              </label>

              <label className="block text-sm font-semibold">
                Admission year
                <input
                  className={`${inputClass} mt-2`}
                  type="number"
                  min="2020"
                  max="2100"
                  value={year}
                  onChange={(event) => setYear(event.target.value)}
                  required
                />
              </label>

              <label className="block text-sm font-semibold md:col-span-2">
                Requirement type
                <select
                  className={`${inputClass} mt-2`}
                  value={recordType}
                  onChange={(event) => {
                    setRecordType(event.target.value);
                    setError("");
                    setSuccess("");
                  }}
                >
                  <option value="subject_requirements">
                    UTME and O&apos;Level subjects
                  </option>
                  <option value="cutoff_mark">Cutoff mark</option>
                  <option value="eligibility_rule">Eligibility rule</option>
                </select>
              </label>
            </div>

            {recordType === "subject_requirements" && (
              <div className="space-y-5 rounded-xl bg-slate-50 p-4 sm:p-5">
                <h3 className="font-bold">UTME and O&apos;Level requirements</h3>

                <label className="block text-sm font-semibold">
                  Required UTME subjects
                  <textarea
                    className={`${inputClass} mt-2`}
                    rows={3}
                    placeholder="Use commas, e.g. English Language, Mathematics, Physics, Chemistry"
                    value={utmeSubjects}
                    onChange={(event) => setUtmeSubjects(event.target.value)}
                    required
                  />
                  <span className="mt-1 block font-normal text-slate-500">
                    Enter 4–10 subjects, including Use of English where required.
                  </span>
                </label>

                <label className="block text-sm font-semibold">
                  Required O&apos;Level subjects
                  <textarea
                    className={`${inputClass} mt-2`}
                    rows={3}
                    placeholder="Use commas, e.g. English Language, Mathematics, Physics, Chemistry"
                    value={olevelSubjects}
                    onChange={(event) => setOlevelSubjects(event.target.value)}
                    required
                  />
                </label>

                <div className="grid gap-5 sm:grid-cols-2">
                  <label className="block text-sm font-semibold">
                    Minimum credits
                    <input
                      className={`${inputClass} mt-2`}
                      type="number"
                      min="1"
                      max="9"
                      value={minimumCredits}
                      onChange={(event) => setMinimumCredits(event.target.value)}
                      required
                    />
                  </label>

                  <label className="block text-sm font-semibold">
                    Accepted O&apos;Level sittings
                    <select
                      className={`${inputClass} mt-2`}
                      value={acceptedSittings}
                      onChange={(event) => setAcceptedSittings(event.target.value)}
                    >
                      <option value="1">One sitting</option>
                      <option value="2">Up to two sittings</option>
                      <option value="3">Up to three sittings</option>
                    </select>
                  </label>
                </div>

                <label className="block text-sm font-semibold">
                  Additional requirements (optional)
                  <textarea
                    className={`${inputClass} mt-2`}
                    rows={2}
                    value={additionalRequirements}
                    onChange={(event) =>
                      setAdditionalRequirements(event.target.value)
                    }
                    placeholder="Any other verified course-specific requirements"
                  />
                </label>
              </div>
            )}

            {recordType === "cutoff_mark" && (
              <div className="grid gap-5 rounded-xl bg-slate-50 p-4 sm:grid-cols-2 sm:p-5">
                <label className="block text-sm font-semibold">
                  Cutoff type
                  <select
                    className={`${inputClass} mt-2`}
                    value={cutoffType}
                    onChange={(event) => setCutoffType(event.target.value)}
                  >
                    <option value="general">General</option>
                    <option value="departmental">Departmental</option>
                    <option value="merit">Merit</option>
                    <option value="catchment">Catchment</option>
                    <option value="other">Other</option>
                  </select>
                </label>

                <label className="block text-sm font-semibold">
                  Score (0–400)
                  <input
                    className={`${inputClass} mt-2`}
                    type="number"
                    min="0"
                    max="400"
                    value={score}
                    onChange={(event) => setScore(event.target.value)}
                    required
                  />
                </label>

                <label className="block text-sm font-semibold sm:col-span-2">
                  Category (optional)
                  <input
                    className={`${inputClass} mt-2`}
                    value={category}
                    onChange={(event) => setCategory(event.target.value)}
                    placeholder="e.g. State or applicant category, if specified by the source"
                  />
                </label>
              </div>
            )}

            {recordType === "eligibility_rule" && (
              <div className="grid gap-5 rounded-xl bg-slate-50 p-4 sm:grid-cols-2 sm:p-5">
                <label className="block text-sm font-semibold">
                  Entry route
                  <select
                    className={`${inputClass} mt-2`}
                    value={entryRoute}
                    onChange={(event) => setEntryRoute(event.target.value)}
                  >
                    <option value="UTME">UTME</option>
                    <option value="Direct Entry">Direct Entry</option>
                    <option value="other">Other</option>
                  </select>
                </label>

                <label className="block text-sm font-semibold">
                  Screening method (optional)
                  <input
                    className={`${inputClass} mt-2`}
                    value={screeningMethod}
                    onChange={(event) => setScreeningMethod(event.target.value)}
                    placeholder="Use the institution's stated method"
                  />
                </label>

                <label className="block text-sm font-semibold">
                  Minimum age (optional)
                  <input
                    className={`${inputClass} mt-2`}
                    type="number"
                    min="10"
                    max="100"
                    value={minimumAge}
                    onChange={(event) => setMinimumAge(event.target.value)}
                  />
                </label>

                <label className="block text-sm font-semibold">
                  Minimum UTME score (optional)
                  <input
                    className={`${inputClass} mt-2`}
                    type="number"
                    min="0"
                    max="400"
                    value={minimumUtmeScore}
                    onChange={(event) => setMinimumUtmeScore(event.target.value)}
                  />
                </label>
              </div>
            )}

            <label className="block text-sm font-semibold">
              Official source URL
              <input
                className={`${inputClass} mt-2`}
                type="url"
                placeholder="https://..."
                value={sourceUrl}
                onChange={(event) => setSourceUrl(event.target.value)}
                required
              />
              <span className="mt-1 block font-normal text-slate-500">
                Use an official institution, JAMB or other authoritative source.
              </span>
            </label>

            <label className="block text-sm font-semibold">
              Notes (optional)
              <textarea
                className={`${inputClass} mt-2`}
                rows={3}
                value={recordType === "subject_requirements" ? additionalRequirements : notes}
                onChange={(event) => {
                  if (recordType === "subject_requirements") {
                    setAdditionalRequirements(event.target.value);
                  } else {
                    setNotes(event.target.value);
                  }
                }}
                placeholder="Add source context or notes for the reviewer"
              />
            </label>

            <div className="flex flex-col gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs leading-5 text-slate-500">
                Saving does not publish or verify the information.
              </p>
              <button
                type="submit"
                disabled={saving || loading || data.programmes.length === 0}
                className="rounded-lg bg-emerald-900 px-5 py-3 text-sm font-bold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save as draft"}
              </button>
            </div>
          </form>
        </section>

        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 p-5 sm:p-6">
            <h2 className="text-xl font-bold">Existing requirement records</h2>
            <p className="mt-1 text-sm text-slate-500">
              Records from all three requirements tables.
            </p>
          </div>

          {loading ? (
            <p className="p-6 text-sm text-slate-500">Loading records...</p>
          ) : allRecords.length === 0 ? (
            <p className="p-6 text-sm text-slate-500">
              No requirement records yet. Add the first one above.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-5 py-3">Programme</th>
                    <th className="px-5 py-3">Type</th>
                    <th className="px-5 py-3">Year</th>
                    <th className="px-5 py-3">Details</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3">Review</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {allRecords.map((record) => (
                    <tr key={`${record.displayType}-${record.id}`}>
                      <td className="px-5 py-4 font-semibold">
                        {programmeName(record.programme_id)}
                      </td>
                      <td className="px-5 py-4">{record.displayType}</td>
                      <td className="px-5 py-4">{record.admission_year}</td>
                      <td className="max-w-sm px-5 py-4 text-slate-600">
                        {record.displayType === "Cutoff mark"
                          ? `${record.cutoff_type ?? "Cutoff"}: ${record.score ?? "—"}`
                          : record.displayType === "UTME / O'Level"
                            ? (record.utme_subjects ?? []).join(", ")
                            : String(record.entry_route ?? "Eligibility rule")}
                      </td>
                      <td className="px-5 py-4">
                        <span className="inline-flex rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-800">
                          {record.is_published ? "Published" : "Draft"}
                          {record.verification_status
                            ? ` · ${record.verification_status}`
                            : ""}
                        </span>
                      </td>
                      <td className="space-y-2 px-5 py-4">
                        {record.source_url && (
                          <a
                            href={record.source_url}
                            target="_blank"
                            rel="noreferrer"
                            className="block text-xs font-semibold text-emerald-800 underline"
                          >
                            Check source
                          </a>
                        )}
                        <button
                          type="button"
                          disabled={reviewingId !== null}
                          onClick={() =>
                            void updateReviewStatus(
                              record,
                              "verified",
                              !record.is_published
                            )
                          }
                          className="block rounded-md bg-emerald-800 px-3 py-2 text-xs font-bold text-white disabled:opacity-50"
                        >
                          {reviewingId === `${record.displayType}:${record.id}`
                            ? "Updating…"
                            : record.is_published
                              ? "Unpublish"
                              : "Verify & publish"}
                        </button>
                        {record.verification_status !== "needs_review" && (
                          <button
                            type="button"
                            disabled={reviewingId !== null}
                            onClick={() =>
                              void updateReviewStatus(
                                record,
                                "needs_review",
                                false
                              )
                            }
                            className="block text-xs font-semibold text-amber-800 underline disabled:opacity-50"
                          >
                            Flag for review
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
