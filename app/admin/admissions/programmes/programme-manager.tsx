"use client";

import { useMemo, useState, useTransition, type FormEvent } from "react";

type Institution = {
  id: string;
  name: string;
  institution_type: string;
  state: string | null;
  is_published: boolean;
};

type Programme = {
  id: string;
  institution_id: string;
  course_name: string;
  course_slug: string;
  faculty: string | null;
  department: string | null;
  award_type: string | null;
  study_mode: string | null;
  duration_years: number | null;
  is_published: boolean;
  created_at: string;
};

type Props = {
  initialProgrammes: Programme[];
  institutions: Institution[];
};

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100";

const labelClass = "mb-2 block text-sm font-semibold text-slate-700";

function institutionTypeLabel(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (letter) =>
    letter.toUpperCase()
  );
}

export default function ProgrammeManager({
  initialProgrammes,
  institutions,
}: Props) {
  const [programmes, setProgrammes] = useState(initialProgrammes);
  const [search, setSearch] = useState("");
  const [institutionFilter, setInstitutionFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [courseName, setCourseName] = useState("");
  const [institutionId, setInstitutionId] = useState("");
  const [faculty, setFaculty] = useState("");
  const [department, setDepartment] = useState("");
  const [awardType, setAwardType] = useState("Bachelor's Degree");
  const [studyMode, setStudyMode] = useState("Full-time");
  const [duration, setDuration] = useState("4");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const institutionMap = useMemo(
    () => new Map(institutions.map((institution) => [institution.id, institution])),
    [institutions]
  );

  const filteredProgrammes = useMemo(() => {
    const term = search.trim().toLowerCase();

    return programmes.filter((programme) => {
      const institution = institutionMap.get(programme.institution_id);
      const matchesSearch =
        !term ||
        programme.course_name.toLowerCase().includes(term) ||
        (programme.faculty ?? "").toLowerCase().includes(term) ||
        (programme.department ?? "").toLowerCase().includes(term) ||
        (institution?.name ?? "").toLowerCase().includes(term);

      const matchesInstitution =
        institutionFilter === "all" ||
        programme.institution_id === institutionFilter;

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "published" && programme.is_published) ||
        (statusFilter === "draft" && !programme.is_published);

      return matchesSearch && matchesInstitution && matchesStatus;
    });
  }, [programmes, search, institutionFilter, statusFilter, institutionMap]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setError("");

    if (!institutionId) {
      setError("Please select an institution first.");
      return;
    }

    startTransition(async () => {
      try {
        const response = await fetch("/api/admin/admissions/programmes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            institution_id: institutionId,
            course_name: courseName.trim(),
            faculty: faculty.trim() || undefined,
            department: department.trim() || undefined,
            award_type: awardType || undefined,
            study_mode: studyMode || undefined,
            duration_years: duration ? Number(duration) : null,
          }),
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(result.error || "Unable to save the programme.");
        }

        const saved = result.programme as Programme;
        setProgrammes((current) => [
          saved,
          ...current.filter((item) => item.id !== saved.id),
        ]);
        setCourseName("");
        setFaculty("");
        setDepartment("");
        setMessage("Programme saved successfully as a draft.");
      } catch (caught) {
        setError(
          caught instanceof Error
            ? caught.message
            : "Something went wrong. Please try again."
        );
      }
    });
  }

  const draftCount = programmes.filter((item) => !item.is_published).length;
  const publishedCount = programmes.filter((item) => item.is_published).length;

  return (
    <div className="space-y-8">
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Total programmes</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">
            {programmes.length}
          </p>
        </div>
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <p className="text-sm font-medium text-amber-800">Draft programmes</p>
          <p className="mt-2 text-3xl font-bold text-amber-950">{draftCount}</p>
        </div>
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
          <p className="text-sm font-medium text-emerald-800">
            Published programmes
          </p>
          <p className="mt-2 text-3xl font-bold text-emerald-950">
            {publishedCount}
          </p>
        </div>
      </div>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 bg-slate-50 px-6 py-5">
          <h2 className="text-xl font-bold text-slate-900">Add a programme</h2>
          <p className="mt-1 text-sm text-slate-500">
            Select the institution and enter its course details.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 p-6">
          {institutions.length === 0 ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              No institutions are available yet. Add institutions before adding
              programmes.
            </div>
          ) : (
            <>
              <div>
                <label htmlFor="programme-institution" className={labelClass}>
                  Institution *
                </label>
                <select
                  id="programme-institution"
                  className={inputClass}
                  value={institutionId}
                  onChange={(event) => setInstitutionId(event.target.value)}
                  required
                >
                  <option value="">Choose an institution</option>
                  {institutions.map((institution) => (
                    <option key={institution.id} value={institution.id}>
                      {institution.name}
                      {institution.state ? ` — ${institution.state}` : ""}
                      {!institution.is_published ? " (Draft)" : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                <div>
                  <label htmlFor="course-name" className={labelClass}>
                    Programme / course name *
                  </label>
                  <input
                    id="course-name"
                    className={inputClass}
                    placeholder="e.g. Computer Science"
                    value={courseName}
                    onChange={(event) => setCourseName(event.target.value)}
                    minLength={2}
                    maxLength={200}
                    required
                  />
                </div>

                <div>
                  <label htmlFor="programme-faculty" className={labelClass}>
                    Faculty / school
                  </label>
                  <input
                    id="programme-faculty"
                    className={inputClass}
                    placeholder="e.g. Faculty of Computing"
                    value={faculty}
                    onChange={(event) => setFaculty(event.target.value)}
                    maxLength={200}
                  />
                </div>

                <div>
                  <label htmlFor="programme-department" className={labelClass}>
                    Department
                  </label>
                  <input
                    id="programme-department"
                    className={inputClass}
                    placeholder="e.g. Computer Science"
                    value={department}
                    onChange={(event) => setDepartment(event.target.value)}
                    maxLength={200}
                  />
                </div>

                <div>
                  <label htmlFor="programme-award" className={labelClass}>
                    Qualification / award
                  </label>
                  <select
                    id="programme-award"
                    className={inputClass}
                    value={awardType}
                    onChange={(event) => setAwardType(event.target.value)}
                  >
                    <option>Bachelor's Degree</option>
                    <option>HND</option>
                    <option>ND</option>
                    <option>NCE</option>
                    <option>Diploma</option>
                    <option>Certificate</option>
                    <option>Other</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="programme-mode" className={labelClass}>
                    Study mode
                  </label>
                  <select
                    id="programme-mode"
                    className={inputClass}
                    value={studyMode}
                    onChange={(event) => setStudyMode(event.target.value)}
                  >
                    <option>Full-time</option>
                    <option>Part-time</option>
                    <option>Distance Learning</option>
                    <option>Sandwich</option>
                    <option>Other</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="programme-duration" className={labelClass}>
                    Duration (years)
                  </label>
                  <input
                    id="programme-duration"
                    className={inputClass}
                    type="number"
                    min="1"
                    max="15"
                    step="1"
                    value={duration}
                    onChange={(event) => setDuration(event.target.value)}
                  />
                </div>
              </div>
            </>
          )}

          {error && (
            <p
              role="alert"
              className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700"
            >
              {error}
            </p>
          )}

          {message && (
            <p
              role="status"
              className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800"
            >
              {message}
            </p>
          )}

          <button
            type="submit"
            disabled={isPending || institutions.length === 0}
            className="rounded-xl bg-emerald-800 px-6 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPending ? "Saving programme..." : "Save programme as draft"}
          </button>
          <p className="text-xs leading-5 text-slate-500">
            New programmes remain unpublished until reviewed. You can add
            admission subjects, O&apos;Level requirements and cutoff marks in
            the next stage.
          </p>
        </form>
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-6 py-5">
          <h2 className="text-xl font-bold text-slate-900">
            Programme directory
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Search programmes by course, faculty, department, or institution.
          </p>
        </div>

        <div className="grid gap-3 border-b border-slate-100 bg-slate-50 p-5 md:grid-cols-3">
          <input
            aria-label="Search programmes"
            className={inputClass}
            placeholder="Search courses or institutions..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />

          <select
            aria-label="Filter by institution"
            className={inputClass}
            value={institutionFilter}
            onChange={(event) => setInstitutionFilter(event.target.value)}
          >
            <option value="all">All institutions</option>
            {institutions.map((institution) => (
              <option key={institution.id} value={institution.id}>
                {institution.name}
              </option>
            ))}
          </select>

          <select
            aria-label="Filter by publication status"
            className={inputClass}
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
          >
            <option value="all">All statuses</option>
            <option value="draft">Drafts</option>
            <option value="published">Published</option>
          </select>
        </div>

        {filteredProgrammes.length === 0 ? (
          <div className="px-6 py-14 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-2xl">
              🎓
            </div>
            <h3 className="mt-4 font-bold text-slate-900">
              No programmes found
            </h3>
            <p className="mt-2 text-sm text-slate-500">
              Add a programme above or change your search filters.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredProgrammes.map((programme) => {
              const institution = institutionMap.get(programme.institution_id);

              return (
                <article
                  key={programme.id}
                  className="flex flex-col gap-4 px-6 py-5 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <h3 className="font-bold text-slate-900">
                      {programme.course_name}
                    </h3>
                    <p className="mt-1 text-sm text-emerald-800">
                      {institution?.name ?? "Institution unavailable"}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {[
                        programme.faculty,
                        programme.department,
                        programme.award_type,
                        programme.duration_years
                          ? `${programme.duration_years} years`
                          : null,
                      ]
                        .filter(Boolean)
                        .join(" · ") || "Additional details not supplied"}
                    </p>
                    {institution && (
                      <p className="mt-1 text-xs text-slate-400">
                        {institutionTypeLabel(institution.institution_type)}
                        {institution.state ? ` · ${institution.state}` : ""}
                      </p>
                    )}
                  </div>

                  <span
                    className={`w-fit shrink-0 rounded-full px-3 py-1 text-xs font-bold ${
                      programme.is_published
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-amber-100 text-amber-800"
                    }`}
                  >
                    {programme.is_published ? "Published" : "Draft"}
                  </span>
                </article>
              );
            })}
          </div>
        )}

        <div className="border-t border-slate-100 px-6 py-4 text-sm text-slate-500">
          Showing {filteredProgrammes.length} of {programmes.length} programmes
        </div>
      </section>
    </div>
  );
}
