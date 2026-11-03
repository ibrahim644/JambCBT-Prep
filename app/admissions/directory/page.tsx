"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type CutoffMark = {
  id: string;
  score: number;
  source_url: string | null;
  course_name: string;
};

type Institution = {
  id: string;
  name: string;
  state: string;
  institution_type: string;
  ownership: string;
  official_website: string | null;
  cutoff_year: number | null;
  cutoff_marks: CutoffMark[];
};

type DirectoryResponse = {
  institutions?: Institution[];
  error?: string;
};

const OWNERSHIP_LABELS: Record<string, string> = {
  federal: "Federal",
  state: "State",
  private: "Private",
  other: "Other ownership",
};

const DIRECTORY_GROUPS = [
  {
    title: "Universities",
    types: ["university"],
  },
  {
    title: "Polytechnics",
    types: ["polytechnic"],
  },
  {
    title: "Colleges of Education (including FCEs)",
    types: ["college_of_education", "federal_college_of_education"],
  },
];

export default function InstitutionDirectoryPage() {
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [search, setSearch] = useState("");
  const [stateFilter, setStateFilter] = useState("all");
  const [ownershipFilter, setOwnershipFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadDirectory() {
      try {
        const response = await fetch("/api/admissions/directory");
        const data = (await response.json()) as DirectoryResponse;

        if (!response.ok) {
          throw new Error(data.error || "Could not load the institution directory.");
        }

        if (!cancelled) setInstitutions(data.institutions ?? []);
      } catch (caught) {
        if (!cancelled) {
          setError(
            caught instanceof Error
              ? caught.message
              : "Could not load the institution directory."
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadDirectory();

    return () => {
      cancelled = true;
    };
  }, []);

  const states = useMemo(
    () =>
      Array.from(new Set(institutions.map((institution) => institution.state)))
        .sort((a, b) => a.localeCompare(b)),
    [institutions]
  );
  const filteredInstitutions = useMemo(() => {
    const term = search.trim().toLowerCase();
    return institutions.filter(
      (institution) =>
        (stateFilter === "all" || institution.state === stateFilter) &&
        (ownershipFilter === "all" ||
          institution.ownership === ownershipFilter) &&
        (!term ||
          `${institution.name} ${institution.state} ${institution.ownership}`
            .toLowerCase()
            .includes(term))
    );
  }, [institutions, ownershipFilter, search, stateFilter]);

  return (
    <main className="min-h-screen bg-[#F7F8F2] px-4 py-10 text-[#14291F] sm:px-6">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8">
          <Link
            href="/"
            className="text-sm font-semibold text-emerald-800 hover:underline"
          >
            ← JAMB Ready home
          </Link>
          <p className="mt-5 text-sm font-bold uppercase tracking-widest text-emerald-700">
            Nigerian tertiary institutions
          </p>
          <h1 className="mt-2 text-3xl font-extrabold sm:text-4xl">
            Compare schools at a glance
          </h1>
          <p className="mt-3 max-w-3xl text-slate-600">
            Browse universities, polytechnics, and colleges of education by
            ownership and state. General JAMB cut-offs show the latest verified
            admission year available; a range means published programmes have
            different marks.
          </p>
        </header>

        <section className="mb-7 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="grid gap-4 sm:grid-cols-3">
            <label className="block text-sm font-semibold">
              Search by institution or state
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="e.g. Kaduna"
                className="mt-2 w-full rounded-lg border border-slate-300 p-3 font-normal"
              />
            </label>
            <label className="block text-sm font-semibold">
              Ownership
              <select
                value={ownershipFilter}
                onChange={(event) => setOwnershipFilter(event.target.value)}
                className="mt-2 w-full rounded-lg border border-slate-300 p-3 font-normal"
              >
                <option value="all">Federal, state, and private</option>
                <option value="federal">Federal</option>
                <option value="state">State</option>
                <option value="private">Private</option>
                <option value="other">Other ownership</option>
              </select>
            </label>
            <label className="block text-sm font-semibold">
              State
              <select
                value={stateFilter}
                onChange={(event) => setStateFilter(event.target.value)}
                className="mt-2 w-full rounded-lg border border-slate-300 p-3 font-normal"
              >
                <option value="all">All states</option>
                {states.map((state) => (
                  <option key={state} value={state}>
                    {state}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </section>

        {error ? (
          <div
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-800"
          >
            {error}
          </div>
        ) : (
          <div className="grid items-start gap-5 lg:grid-cols-3">
            {DIRECTORY_GROUPS.map((group) => {
              const items = filteredInstitutions.filter((institution) =>
                group.types.includes(institution.institution_type)
              );

              return (
                <section
                  key={group.title}
                  aria-labelledby={`group-${group.title}`}
                  className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
                >
                  <header className="border-b border-slate-200 bg-[#EAF1E3] px-5 py-4">
                    <h2
                      id={`group-${group.title}`}
                      className="text-lg font-extrabold"
                    >
                      {group.title}
                    </h2>
                    <p className="mt-1 text-sm text-slate-600">
                      {loading ? "Loading…" : `${items.length} listed`}
                    </p>
                  </header>

                  {loading ? (
                    <p className="p-5 text-sm text-slate-500">
                      Loading institutions…
                    </p>
                  ) : items.length === 0 ? (
                    <p className="p-5 text-sm text-slate-600">
                      No published institutions in this category match your
                      filters.
                    </p>
                  ) : (
                    <ul className="divide-y divide-slate-100">
                      {items.map((institution) => {
                        const scores = Array.from(
                          new Set(
                            institution.cutoff_marks
                              .map((mark) => mark.score)
                              .filter(Number.isFinite)
                          )
                        ).sort((a, b) => a - b);
                        const sources = Array.from(
                          new Set(
                            institution.cutoff_marks
                              .map((mark) => mark.source_url)
                              .filter((url): url is string => Boolean(url))
                          )
                        );

                        return (
                          <li key={institution.id} className="p-5">
                            <h3 className="font-bold leading-snug">
                              {institution.official_website ? (
                                <a
                                  href={institution.official_website}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="hover:text-emerald-800 hover:underline"
                                >
                                  {institution.name}
                                </a>
                              ) : (
                                institution.name
                              )}
                            </h3>
                            <p className="mt-1 text-sm text-slate-500">
                              {institution.state}
                            </p>
                            <span className="mt-3 inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                              {OWNERSHIP_LABELS[institution.ownership] ??
                                OWNERSHIP_LABELS.other}
                            </span>
                            <div className="mt-3 border-t border-slate-100 pt-3">
                              <p className="text-sm font-semibold">
                                General JAMB cut-off:{" "}
                                {scores.length === 0
                                  ? "Not published"
                                  : scores.length === 1
                                    ? scores[0]
                                    : `${scores[0]}–${scores[scores.length - 1]}`}
                              </p>
                              {scores.length > 0 && (
                                <>
                                  <p className="mt-1 text-xs text-slate-500">
                                    Latest verified year: {institution.cutoff_year}
                                    {scores.length > 1
                                      ? " · range across published programmes"
                                      : ""}
                                  </p>
                                  {sources.length > 0 && (
                                    <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
                                      {sources.map((source, index) => (
                                        <a
                                          key={source}
                                          href={source}
                                          target="_blank"
                                          rel="noreferrer"
                                          className="text-xs font-semibold text-emerald-800 hover:underline"
                                        >
                                          Source{sources.length > 1 ? ` ${index + 1}` : ""}
                                        </a>
                                      ))}
                                    </div>
                                  )}
                                </>
                              )}
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </section>
              );
            })}
          </div>
        )}

        <p className="mt-6 text-sm text-slate-500">
          This directory includes institutions published by our admissions
          team. Cut-offs are shown only when verified and published with a
          source; “Not published” means we do not currently have a verified
          general cut-off for that institution. Always confirm admission details
          with the institution.
        </p>

        <div className="mt-6 flex flex-wrap gap-4 text-sm font-semibold">
          <Link
            href="/admissions/eligibility"
            className="text-emerald-800 hover:underline"
          >
            Check programme requirements
          </Link>
          <Link href="/" className="text-emerald-800 hover:underline">
            Back to JAMB Ready
          </Link>
        </div>
      </div>
    </main>
  );
}
